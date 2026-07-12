// Boot hook T2-LOCK-VAULT (2026-05-15): renomeia arquivos canonicos
// (.md sem suffix de deviceId) para a forma '-<deviceIdAtual>.md'.
//
// Contexto: ate a sprint T2-LOCK-VAULT, saves de humor/diario/evento/
// contador/alarme/tarefa escreviam no path canonico em primeiro save
// e so adicionavam suffix '-<deviceId>' em colisao detectada por
// leitura previa. Isso abria race condition: dois devices capturando
// no mesmo segundo escreviam o mesmo path e o ultimo a sincronizar
// sobrescrevia o outro silenciosamente.
//
// T2 substitui essa logica por suffix-sempre na escrita. Esta migration
// renomeia arquivos legados (sem suffix) para o formato novo. Cada
// device migra os arquivos sem suffix da pasta `markdown/` para
// '-<deviceIdAtual>.md', assumindo que ele e o autor do arquivo
// (caminho feliz: o usuario rodou T2 em todos os devices em ordem,
// cada um marcou os seus). Em ambiente real Syncthing, apos o primeiro
// device rodar a migration, os demais devices nao acharao arquivos sem
// suffix (foram renomeados antes da sincronizacao chegar), e a migration
// no-op com idempotencia da flag.
//
// Idempotente: marca `useSessao.flags.t2DeviceIdSuffixMigrado = true`
// apos sucesso. Boots subsequentes no-op imediato.
//
// Filtros aplicados (em ordem):
//   1. Pula `.sync-conflict-*` (preserva filtro T1B6).
//   2. Pula arquivos que ja tem suffix '-ouro-XXXXXX' (qualquer device).
//   3. Pula arquivos que nao casam o padrao
//      '<prefix>-YYYY-MM-DD...md' (helpers nao-canonicos como
//      `_devices.md`, `humor-heatmap.json`, manifests do app).
//   4. Pula prefixos fixos da migration H2 ADR-0023 que nao tem data
//      no path: `contador-`, `alarme-`, `tarefa-`, `exercicio-`,
//      `scanner-`.
//
// Em Web (mock vault), no-op imediato.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useSessao } from '@/lib/stores/sessao';
import { getDeviceId } from '@/lib/util/deviceId';
import { ehSyncConflict } from '@/lib/vault/syncConflict';

const MARKDOWN_FOLDER = 'markdown';

// Regex do suffix de deviceId M38: '-ouro-' + 6 chars alfanumericos.
// T2 nunca renomeia arquivos ja com esse suffix (idempotente cross-device).
const DEVICE_ID_SUFFIX_REGEX = /-ouro-[a-z0-9]{6}\.md$/i;

// Prefixos canonicos pos-H2 (ADR-0023) que carregam data no nome.
// Estes sao os candidatos a receber suffix de deviceId apos T2.
const PREFIXOS_COM_DATA: ReadonlyArray<string> = [
  'humor-',
  'diario-',
  'evento-',
  'marco-',
  'medidas-',
  'ciclo-',
  'foto-',
  'audio-',
  'video-',
  'frase-',
  'agenda-',
];

function joinUri(root: string, rel: string): string {
  const r = root.endsWith('/') ? root.slice(0, -1) : root;
  const s = rel.startsWith('/') ? rel.slice(1) : rel;
  return `${r}/${s}`;
}

// Lista basenames de uma pasta. Em content://, decodifica URIs;
// em file://, retorna nomes diretos. Devolve [] em pasta inexistente.
async function listarBasenames(folderUri: string): Promise<string[]> {
  try {
    if (folderUri.startsWith('content://')) {
      const uris = await StorageAccessFramework.readDirectoryAsync(folderUri);
      const out: string[] = [];
      for (const u of uris) {
        const decoded = decodeURIComponent(u);
        const last = decoded.split('/').pop() ?? '';
        if (last.length > 0) out.push(last);
      }
      return out;
    }
    return await FileSystem.readDirectoryAsync(folderUri);
  } catch {
    return [];
  }
}

// Indica se um basename de `markdown/` precisa receber suffix de
// deviceId nesta migration. Pula sync-conflict, arquivos ja com suffix
// e nomes fora dos prefixos canonicos pos-H2.
function precisaSuffix(basename: string): boolean {
  if (ehSyncConflict(basename)) return false;
  if (!basename.endsWith('.md')) return false;
  if (DEVICE_ID_SUFFIX_REGEX.test(basename)) return false;
  return PREFIXOS_COM_DATA.some((p) => basename.startsWith(p));
}

// Renomeia origem -> destino se origem existir e destino nao existir.
// Best-effort: silencia falhas individuais (proxima execucao nao roda
// devido ao gate de flag, mas o caller pode resetar flag manualmente
// em dev).
async function renomearIdempotente(
  origemUri: string,
  destinoUri: string
): Promise<boolean> {
  let destinoExiste = false;
  try {
    const info = await FileSystem.getInfoAsync(destinoUri);
    destinoExiste = info.exists === true;
  } catch {
    destinoExiste = false;
  }
  if (destinoExiste) {
    // Destino ja existe (Syncthing pode ter sincronizado primeiro
    // do outro device). Limpa o canonico para alinhar layout T2.
    try {
      await FileSystem.deleteAsync(origemUri, { idempotent: true });
    } catch {
      // Best-effort.
    }
    return false;
  }
  try {
    await FileSystem.copyAsync({ from: origemUri, to: destinoUri });
    try {
      await FileSystem.deleteAsync(origemUri, { idempotent: true });
    } catch {
      // Best-effort: arquivo duplicado fica ate proximo run manual.
    }
    return true;
  } catch {
    return false;
  }
}

export interface MigracaoDeviceIdResultado {
  migrados: number;
}

// Aplica suffix de deviceId no basename antes da extensao .md.
// Ex: 'humor-2026-05-15.md' + 'ouro-abc123' -> 'humor-2026-05-15-ouro-abc123.md'.
function aplicarSuffix(basename: string, deviceId: string): string {
  const stem = basename.replace(/\.md$/i, '');
  return `${stem}-${deviceId}.md`;
}

// Entry point do boot hook. Idempotente via flag. No-op em web.
export async function migrarArquivosCanonicosParaDeviceId(
  vaultRoot: string
): Promise<MigracaoDeviceIdResultado> {
  const resultado: MigracaoDeviceIdResultado = { migrados: 0 };
  if (Platform.OS === 'web') return resultado;
  if (vaultRoot.startsWith('web://')) return resultado;
  if (useSessao.getState().flags.t2DeviceIdSuffixMigrado) return resultado;

  const deviceId = await getDeviceId();
  const folderUri = joinUri(vaultRoot, MARKDOWN_FOLDER);
  const basenames = await listarBasenames(folderUri);

  for (const basename of basenames) {
    if (!precisaSuffix(basename)) continue;
    const novoBasename = aplicarSuffix(basename, deviceId);
    const origemUri = joinUri(vaultRoot, `${MARKDOWN_FOLDER}/${basename}`);
    const destinoUri = joinUri(vaultRoot, `${MARKDOWN_FOLDER}/${novoBasename}`);
    if (await renomearIdempotente(origemUri, destinoUri)) {
      resultado.migrados += 1;
    }
  }

  useSessao.getState().marcarFlagBoot('t2DeviceIdSuffixMigrado');
  return resultado;
}
