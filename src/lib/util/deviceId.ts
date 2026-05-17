// M38 -- identificador unico por instalacao para conflict resolution
// de Syncthing entre 4 nos (2 desktops + 2 celulares).
//
// Estrategia: SecureStore guarda um id curto (6 chars alfanumericos)
// gerado uma unica vez por instalacao. Em colisao de slug entre dois
// devices que escrevem o mesmo registro (ex: humor de hoje), o suffixo
// '-<deviceId>.md' e aplicado. Caminho feliz mantem nome canonico
// (ex: 'daily/2026-05-04.md').
//
// Decisoes (M38 spec secao 9):
//   - 6 chars alfanumericos (36^6 = 2.1 bi combinacoes; zero risco
//     de colisao entre 4 nos).
//   - Math.random aceitavel (e id de arquivo, nao secret).
//   - SecureStore (< 32 bytes, cabe em A20 sem risco).
//   - Persistente: nunca regenera salvo se SecureStore for zerado
//     por uninstall+reinstall sem backup.
//
// Comentarios sem acento (convencao shell/CI).
//
// R-DX-SECURESTORE-WEB-DEV-FALLBACK: em ambiente web dev,
// expo-secure-store nao tem implementacao direta e lanca
// "ExpoSecureStore.default.getValueWithKeyAsync is not a function".
// Detectamos Platform.OS === 'web' e usamos localStorage (ou
// in-memory se nao disponivel). Mobile real (Android/iOS) e web
// release continuam usando SecureStore nativo via try/catch
// defensivo (defesa em camadas).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const DEVICE_ID_KEY = 'ouroboros.device.id';

// Devolve o deviceId desta instalacao. Le do SecureStore (cache de
// instancia tambem mantido em memoria pra evitar I/O repetido) ou
// gera um novo na primeira chamada. Idempotente.
let cacheMemoria: string | null = null;

// Fallback web: usa localStorage quando disponivel; senao gera um
// id efemero em memoria (so vale para a sessao atual). Mesma chave
// canonica do SecureStore nativo.
function getOrCreateInWebStorage(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const novo = `ouro-${randomShort()}`;
    window.localStorage.setItem(DEVICE_ID_KEY, novo);
    return novo;
  }
  // localStorage indisponivel (SSR, headless, sandbox): so memoria.
  return `ouro-${randomShort()}`;
}

// Le Platform.OS de forma defensiva. Em alguns timers tardios
// dentro do Jest (testes que ja sofreram teardown do mock de
// react-native), `Platform` chega undefined. Tratamos como nao-web
// e o try/catch externo cobre quaisquer falhas downstream.
function platformOSSafe(): string {
  try {
    return Platform?.OS ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function getDeviceId(): Promise<string> {
  if (cacheMemoria) return cacheMemoria;
  if (platformOSSafe() === 'web') {
    const id = getOrCreateInWebStorage();
    cacheMemoria = id;
    return id;
  }
  try {
    const cached = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (cached) {
      cacheMemoria = cached;
      return cached;
    }
    const novo = `ouro-${randomShort()}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, novo);
    cacheMemoria = novo;
    return novo;
  } catch {
    // Defesa em camadas: se SecureStore quebrar fora de web
    // (ambiente exotico), cai no fallback web/in-memory.
    const id = getOrCreateInWebStorage();
    cacheMemoria = id;
    return id;
  }
}

// So usado em testes para forcar regeneracao. Nao expor em UI.
export function _resetDeviceIdCache(): void {
  cacheMemoria = null;
}

function randomShort(): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return out;
}

// Aplica suffixo de deviceId no rel '.md':
//   'daily/2026-05-04.md' + 'ouro-abc123' -> 'daily/2026-05-04-ouro-abc123.md'
//   'tarefas/2026-05-04-comprar-pao.md' + 'ouro-xyz' ->
//     'tarefas/2026-05-04-comprar-pao-ouro-xyz.md'
// Helper puro: nao toca I/O. Caller decide quando aplicar.
//
// @deprecated T2: preferir forceDeviceIdSuffix (sempre aplica, com
// idempotencia explicita e erro em colisao de outro device). Este
// helper M38 permanece para callers fora do escopo dos saves
// auditados em T2-LOCK-VAULT (verificar via grep antes de remover).
export function applyDeviceIdSuffix(rel: string, deviceId: string): string {
  const dotIdx = rel.lastIndexOf('.');
  if (dotIdx === -1) return `${rel}-${deviceId}`;
  return `${rel.slice(0, dotIdx)}-${deviceId}${rel.slice(dotIdx)}`;
}

// Regex canonico do suffix de deviceId. Captura "-ouro-XXXXXX" antes
// da extensao (ou no fim). M38 sempre prefixou com 'ouro-' + 6 chars
// alfanumericos. T2: usado para deteccao idempotente e checagem de
// cross-device em forceDeviceIdSuffix.
const DEVICE_ID_SUFFIX_REGEX = /-ouro-[a-z0-9]{6}(?=\.[^.]+$|$)/;

// T2-LOCK-VAULT: sempre garante suffix do deviceId no rel. Idempotente
// quando ja existe suffix do MESMO deviceId. Lanca erro quando ja
// existe suffix de OUTRO deviceId (caller estaria sobrescrevendo
// arquivo de outro device, o que nunca deve acontecer em fluxo
// normal de save).
//
// Exemplos:
//   forceDeviceIdSuffix('markdown/humor-2026-05-15.md', 'ouro-a4b2cd')
//     -> 'markdown/humor-2026-05-15-ouro-a4b2cd.md'
//
//   forceDeviceIdSuffix('markdown/humor-2026-05-15-ouro-a4b2cd.md', 'ouro-a4b2cd')
//     -> 'markdown/humor-2026-05-15-ouro-a4b2cd.md' (inalterado)
//
//   forceDeviceIdSuffix('markdown/humor-2026-05-15-ouro-xxxxxx.md', 'ouro-a4b2cd')
//     -> Error: caller tentaria escrever arquivo de outro device.
//
// Helper puro: nao toca I/O.
export function forceDeviceIdSuffix(rel: string, deviceId: string): string {
  const match = rel.match(DEVICE_ID_SUFFIX_REGEX);
  if (match) {
    const suffixExistente = match[0].slice(1); // remove '-' inicial
    if (suffixExistente === deviceId) {
      // Idempotente: ja tem suffix do mesmo device.
      return rel;
    }
    throw new Error(
      `forceDeviceIdSuffix: rel "${rel}" ja tem suffix "${suffixExistente}" ` +
        `mas deviceId atual e "${deviceId}". Save cross-device nao permitido.`
    );
  }
  return applyDeviceIdSuffix(rel, deviceId);
}
