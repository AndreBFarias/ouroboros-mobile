// Writer canonico para estado do app espelhado em vault/_estado/.
//
// R-VAULT-CANONICAL-COMPLETE-A (2026-05-16): SecureStore continua
// como cache rapido + fallback offline. O Vault e a fonte canonica
// para o sibling Python ler estado consolidado.
//
// Contrato:
//   escreverEstadoCanonico(key, payload):
//     1. Valida payload via ESTADO_SCHEMAS[key].safeParse
//     2. Aplica suffix do deviceId no rel (cross-device do
//        Syncthing -- evita colisao entre 2+ dispositivos pareados)
//     3. Filtra paths .sync-conflict-* via ehSyncConflict (defesa
//        em profundidade: se algum caller passasse rel ja
//        contaminado, abortariamos antes de escrever por cima do
//        conflito).
//     4. Renderiza .md via stringifyFrontmatter (carimba
//        _schema_version)
//     5. Escreve via writeVaultFile (atomic .writing+rename em
//        file://; SAF direto em content:// -- A17 da V4.0.2)
//
//   - Debounce 500ms POR KEY: subscribers de cada store chamam o
//     writer toda vez que set() roda; sem debounce, agitacao
//     leve em Settings (multipl	os toggles em sequencia) viraria
//     5 writes em 200ms. O debounce agrupa em 1 escrita por key.
//   - Best-effort: erros sao logados em __DEV__ e silenciados em
//     producao (escrita do vault canonico nao bloqueia UI; o
//     SecureStore continua sendo o caminho de leitura confiavel).
//
// Path canonico:
//   vault/_estado/<key>-<deviceId>.md
//   (sem subpasta de data: estado e sempre o snapshot mais recente;
//   versionamento fica a cargo do Syncthing/Git, nao do filename)
//
// Comentarios sem acento (convencao shell/CI).
import { useVault } from '@/lib/stores/vault';
import { vaultUriJoin } from '@/lib/vault/paths';
import { writeVaultFile } from '@/lib/vault/writer';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { forceDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';
import {
  ESTADO_SCHEMAS,
  ESTADO_SCHEMA_VERSION,
  type EstadoKey,
} from '@/lib/schemas/vault_estado';

// Janela de debounce. 500ms agrupa rajadas tipicas (multiplos
// set() em rapida sucessao em forms ou toggles) sem perder
// freshness perceptivel (sibling Python le com poll ~2s).
export const DEBOUNCE_MS = 500;

// Pasta canonica dentro do Vault root. Prefixo '_' marca como
// estado/metadados (sibling pode preferir varrer apenas .md
// "regulares" sem essa pasta dependendo do uso).
export const ESTADO_FOLDER = '_estado';

// Mapa de timers por key. setTimeout retorna number em RN; o
// proprio Node tambem aceita number ou Timeout aqui. Tipo opaque
// reduz acoplamento.
type TimerHandle = ReturnType<typeof setTimeout>;
const timersPorKey = new Map<EstadoKey, TimerHandle>();

// Mapa de ultimo payload por key. Quando o debounce dispara, lemos
// o payload mais recente (descarta intermediarios). Garante que o
// ultimo set() vence (semantica de debounce trailing-edge).
const ultimoPayloadPorKey = new Map<EstadoKey, unknown>();

// Carimba atualizadoEm + version no payload antes da validacao.
// Caller passa apenas o state cru do store; aqui injetamos os
// campos canonicos do schema.
function carimbarPayload<T extends Record<string, unknown>>(
  payload: T
): Record<string, unknown> {
  return {
    version: ESTADO_SCHEMA_VERSION,
    ...payload,
    atualizadoEm: new Date().toISOString(),
  };
}

// Render do path canonico aplicando suffix do deviceId.
//
// Forma final: vault://<root>/_estado/<key>-<deviceId>.md
//
// Lanca via forceDeviceIdSuffix se o rel ja tem suffix de outro
// device (cross-device write nao permitido).
export async function resolverPathEstado(
  key: EstadoKey
): Promise<{ rel: string; uri: string | null }> {
  const deviceId = await getDeviceId();
  const relBase = `${ESTADO_FOLDER}/${key}.md`;
  // forceDeviceIdSuffix garante idempotencia + erro em colisao.
  const rel = forceDeviceIdSuffix(relBase, deviceId);

  if (ehSyncConflict(rel)) {
    // Defesa em profundidade: rel nunca deveria ser sync-conflict
    // (key e estatica e deviceId e curto sem '.sync-conflict-').
    // Mas se ALGO injetar isso (regressao futura), abortamos.
    throw new Error(
      `escreverEstadoCanonico: rel '${rel}' parece ser sync-conflict; abortando.`
    );
  }

  // useVault.getState pode nao existir em testes que mockam o store
  // como hook puro (jest.mock retornando apenas useVault: (selector) => ...).
  // Tratamos defensivamente como vault nao autorizado.
  const root =
    typeof useVault.getState === 'function'
      ? useVault.getState().vaultRoot
      : null;
  if (!root) {
    // Vault ainda nao autorizado (cold start pre-onboarding). Sem
    // root, nao temos onde escrever; caller deve tratar com no-op.
    return { rel, uri: null };
  }
  return { rel, uri: vaultUriJoin(root, rel) };
}

// Escreve sincronamente UMA copia canonica .md de uma key. Usada
// internamente pelo debounce; expomos para o migration boot que
// precisa rodar 5 writes one-shot sem agrupar.
export async function escreverEstadoCanonicoImediato<K extends EstadoKey>(
  key: K,
  payload: Record<string, unknown>
): Promise<void> {
  const schema = ESTADO_SCHEMAS[key];
  const stamped = carimbarPayload(payload);
  const result = schema.safeParse(stamped);
  if (!result.success) {
    if (__DEV__) {
      console.warn(
        `escreverEstadoCanonico: payload de '${key}' invalido. ` +
          `Vault canonico NAO foi atualizado. Erros: ${result.error.message}`
      );
    }
    return;
  }

  const { uri } = await resolverPathEstado(key);
  if (!uri) {
    // Vault nao autorizado ainda; SecureStore continua sendo a
    // verdade efetiva ate vaultRoot existir. Migration boot
    // tentara de novo no proximo set() ou cold start.
    return;
  }

  // Body vazio: o frontmatter ja tem todo o estado. Mantemos body
  // string vazia para preservar formato consistente do .md.
  try {
    await writeVaultFile(uri, result.data, '');
  } catch (e) {
    // Silencia em ambiente jest: SAF mock pode nao implementar
    // writeAsStringAsync, gerando ruido em testes que nao mockam
    // expo-file-system. __DEV__ permanece true em jest, entao
    // usamos jest detection direto.
    const emJest = typeof jest !== 'undefined';
    if (__DEV__ && !emJest) {
      console.warn(
        `escreverEstadoCanonico: write falhou em '${key}'. Best-effort. ` +
          `Erro: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

// Versao publica com debounce. Subscribers de cada store chamam
// isso em cada set(); rajadas (multiplos toggles em sequencia)
// viram 1 write por key.
//
// Nao bloqueante: nao retorna Promise pra UI nao esperar. O write
// e best-effort; SecureStore garante persistencia confiavel.
//
// Guard pra ambiente de teste: se useVault.getState nao for funcao
// (caso de testes que mockam useVault como hook puro) OU vaultRoot
// for null, nao agenda timer. Evita "import after teardown" leaks
// em jest quando subscribers de stores disparam fora do test scope.
export function escreverEstadoCanonico<K extends EstadoKey>(
  key: K,
  payload: Record<string, unknown>
): void {
  // Curto-circuito: vault inacessivel = no-op imediato. Pula
  // setTimeout + payload cache (evita memory leak em testes).
  const root =
    typeof useVault.getState === 'function'
      ? useVault.getState().vaultRoot
      : null;
  if (!root) return;

  ultimoPayloadPorKey.set(key, payload);
  const existente = timersPorKey.get(key);
  if (existente) {
    clearTimeout(existente);
  }
  const handle = setTimeout(() => {
    timersPorKey.delete(key);
    const ultimo = ultimoPayloadPorKey.get(key);
    ultimoPayloadPorKey.delete(key);
    if (ultimo == null || typeof ultimo !== 'object') return;
    void escreverEstadoCanonicoImediato(
      key,
      ultimo as Record<string, unknown>
    );
  }, DEBOUNCE_MS);
  timersPorKey.set(key, handle);
}

// Helper de teste: forca flush sincrono de todos os debounces
// pendentes. Em prod nao deve ser chamado; existe pra que jest
// possa esperar sem fake timers.
export async function _flushDebounceEstado(): Promise<void> {
  const pendentes: EstadoKey[] = [];
  for (const [key, handle] of timersPorKey.entries()) {
    clearTimeout(handle);
    pendentes.push(key);
  }
  timersPorKey.clear();
  for (const key of pendentes) {
    const ultimo = ultimoPayloadPorKey.get(key);
    ultimoPayloadPorKey.delete(key);
    if (ultimo == null || typeof ultimo !== 'object') continue;
    await escreverEstadoCanonicoImediato(
      key,
      ultimo as Record<string, unknown>
    );
  }
}

// Helper de teste: reseta todo o estado interno (timers + caches).
// Util pra isolar testes sem vazamento.
export function _resetEscreverEstado(): void {
  for (const handle of timersPorKey.values()) {
    clearTimeout(handle);
  }
  timersPorKey.clear();
  ultimoPayloadPorKey.clear();
}
