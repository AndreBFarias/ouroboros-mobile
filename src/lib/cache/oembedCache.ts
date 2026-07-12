// Cache persistente em disco para respostas oEmbed (R-MEDIA-1).
// Complementa o cache em memoria `spotifyOEmbedCache.ts` que so vive
// no ciclo de vida do processo: este cache sobrevive a reboot do app
// e permite renderizar previews em modo aviao quando a entrada esta
// dentro do TTL.
//
// Layout em disco:
//   <cacheDirectory>/oembed/<hash-url>.json
//
// Cada entrada e um JSON com o shape:
//   { "cachedAt": "<iso>", "data": <OembedData> }
//
// TTL: 7 dias. Entradas com `cachedAt` mais velho que isso sao
// consideradas expiradas e retornadas como null (caller pode optar
// por refetch ou cair no fallback offline).
//
// Filtros:
//   - `.sync-conflict-*` ignorado via `ehSyncConflict` -- copias do
//     Syncthing nao devem ser interpretadas como cache valido.
//
// Hash da URL: FNV-1a 32 bits em hex (8 caracteres). Determinista
// entre dispositivos e nao requer `expo-crypto` (que nao esta no
// projeto). Conflitos de hash sao extremamente raros para URLs do
// YouTube/Spotify e o pior cenario e devolver `null` (cache miss
// falso) -- mesma resposta do TTL expirado.
//
// `cacheDirectory` pode ser `null` em ambiente web/SSR; nesses casos
// `getOembedCached` devolve `null` e `setOembedCached` no-op.
//
// Comentarios em PT-BR com acentuacao completa (licao
// INFRA-acentuacao).
import * as FileSystem from 'expo-file-system/legacy';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import {
  OembedDataSchema,
  type OembedData,
} from '@/lib/midia/oembedSchema';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUBDIR = 'oembed';

// Schema da entrada persistida (envelope com timestamp + payload).
interface CacheEntry {
  cachedAt: string;
  data: OembedData;
}

// FNV-1a 32 bits hex. Determinista, sem dependencia externa, suficiente
// para nomes de arquivo de cache. Saida em 8 caracteres hex.
function hashUrl(url: string): string {
  // Offset basis FNV-1a 32 bit.
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    // Prime 16777619; multiplicacao via deslocamento para evitar
    // overflow em JS (numbers sao double; usamos imul para 32 bits).
    hash = Math.imul(hash, 0x01000193);
  }
  // Forca unsigned 32 bits e converte para hex.
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function cachePathFor(url: string): string | null {
  const base = FileSystem.cacheDirectory;
  if (!base) return null;
  return `${base}${SUBDIR}/${hashUrl(url)}.json`;
}

// Le entrada do cache se existir e dentro do TTL. Caso contrario
// devolve `null`. Erros de I/O / JSON sao silenciados (cache e
// best-effort: caller decide o que fazer).
export async function getOembedCached(
  url: string
): Promise<OembedData | null> {
  if (typeof url !== 'string' || url.trim().length === 0) return null;
  const path = cachePathFor(url);
  if (!path) return null;

  // Filtro de seguranca: se alguma copia do Syncthing acabou no
  // diretorio, ignoramos.
  if (ehSyncConflict(path)) return null;

  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as Partial<CacheEntry>;
    if (!parsed || typeof parsed.cachedAt !== 'string' || !parsed.data) {
      return null;
    }

    const cachedAtMs = Date.parse(parsed.cachedAt);
    if (Number.isNaN(cachedAtMs)) return null;
    if (Date.now() - cachedAtMs > TTL_MS) return null;

    const dataParsed = OembedDataSchema.safeParse(parsed.data);
    if (!dataParsed.success) return null;
    return dataParsed.data;
  } catch {
    return null;
  }
}

// Grava entrada no cache. Cria o subdiretorio se necessario. Erros
// sao silenciados: cache e best-effort; falha em escrever nao deve
// derrubar a UI.
export async function setOembedCached(
  url: string,
  data: OembedData
): Promise<void> {
  if (typeof url !== 'string' || url.trim().length === 0) return;
  const path = cachePathFor(url);
  if (!path) return;

  try {
    const base = FileSystem.cacheDirectory;
    if (!base) return;
    const dir = `${base}${SUBDIR}/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    const entry: CacheEntry = {
      cachedAt: new Date().toISOString(),
      data,
    };
    await FileSystem.writeAsStringAsync(path, JSON.stringify(entry));
  } catch {
    // Best-effort: cache fica frio, caller refetcha na proxima.
  }
}

// Helper de teste: expoe a funcao de hash para asserts deterministicos.
// Nao re-exportado em barrels de producao.
export const __test = { hashUrl };
