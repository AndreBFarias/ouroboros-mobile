// Writer reativo de stats agregadas (R-VAULT-CANONICAL-COMPLETE-B).
//
// Le todas as listas do Vault, chama calcularStatsAgregadas e
// persiste em vault/_estado/stats-<periodo>-<deviceId>.md via a
// infraestrutura R-VAULT-A (escreverEstadoCanonico).
//
// GATILHO REAL (AUDIT-P2-4, 2026-09-05): quem dispara este writer e o
// BootHook `statsAgregadasHook` de src/lib/boot/reagendamento.ts, que
// chama escreverStatsAgregadas nos 4 periodos, um por vez, uma vez por
// boot do app.
//
// Ate essa sprint este preambulo dizia que "subscribers dos stores de
// dominio (humor, diario, eventos, marcos, contadores, tarefas) chamam
// agendarRecalculoStats em cada mutacao". Nao chamavam: este modulo e o
// calcular.ts formavam um par fechado, sem nenhum caller fora de
// src/lib/stats/, e os 4 arquivos _estado/stats-*.md nunca existiram em
// Vault nenhum. O comentario descrevia um plano, nao o codigo.
//
// agendarRecalculoStats / agendarRecalculoStatsTodos seguem exportados
// como o caminho DEBOUNCED, para quando um subscriber reativo for de
// fato plugado e a frescura por mutacao passar a importar. Hoje nenhum
// dos dois tem caller fora deste arquivo e dos testes -- o hook de boot
// nao os usa de proposito, porque uma unica chamada por boot nao tem
// rajada para agrupar e o debounce so abriria uma janela de 30s em que
// o app pode morrer sem escrever nada.
//
// Por que 30s e nao os 500ms padrao de escreverEstadoCanonico, no
// caminho debounced?
//  - Calcular stats faz I/O pesado (lista 6+ pastas do Vault). 500ms
//    multiplica em 2+ ms por arquivo no listVaultFolder; em 100
//    registros vira 200ms+ extras. Agrupar a 30s amortiza.
//  - Stats e read-model derivado, nao verdade primaria: o sibling
//    Python tolera lag pequeno; granularidade de minutos basta.
//  - Trailing-edge: ultimo set() do grupo vence. Ao dormir o app
//    apos uma rajada, o write acontece no proximo wake.
//
// Best-effort: erros silenciados em prod, console.warn em __DEV__.
// SecureStore + escrita primaria continuam sendo a verdade fonte.
//
// Comentarios sem acento (convencao shell/CI).
import { useVault } from '@/lib/stores/vault';
import { listarHumor } from '@/lib/vault/humor';
import { listarDiarios } from '@/lib/vault/diario';
import { listarEventos } from '@/lib/vault/eventos';
import { listarMarcos } from '@/lib/vault/marcos';
import { listarContadores } from '@/lib/vault/contadores';
import { listarTarefas } from '@/lib/vault/tarefas';
import { escreverEstadoCanonicoImediato } from '@/lib/vault/escreverEstado';
import {
  PERIODOS_STATS,
  STATS_KEY_POR_PERIODO,
  type PeriodoStats,
} from '@/lib/schemas/vault_estado';
import { calcularStatsAgregadas } from '@/lib/stats/calcular';

// Janela de debounce. 30s e o tradeoff descrito no preambulo: lag
// aceitavel para read-model derivado, evita amplificar I/O.
export const STATS_DEBOUNCE_MS = 30_000;

// Mapa de timers por periodo. Cada periodo tem seu proprio agrupamento
// independente (rajada em '7d' nao cancela timer de '90d').
type TimerHandle = ReturnType<typeof setTimeout>;
const timersPorPeriodo = new Map<PeriodoStats, TimerHandle>();

// Le todas as listas do Vault, chama o calculador puro, e escreve via
// escreverEstadoCanonicoImediato. Write sincrono, sem debounce.
// Caller real: o BootHook statsAgregadasHook (AUDIT-P2-4). Tambem
// serve a UI ou a teste que precise forcar o write na hora.
export async function escreverStatsAgregadas(
  periodo: PeriodoStats
): Promise<void> {
  const vaultRoot =
    typeof useVault.getState === 'function'
      ? useVault.getState().vaultRoot
      : null;
  if (!vaultRoot) {
    // Vault ainda nao autorizado (cold start pre-onboarding). Sem
    // raiz, nao temos como ler nem escrever. Subscribers vao re-disparar
    // quando vault for autorizado.
    return;
  }

  try {
    // Le tudo em paralelo. Promise.all tolera empty (pasta inexistente
    // => []) sem erro.
    const [humor, diarios, eventos, marcos, contadores, tarefas] =
      await Promise.all([
        listarHumor(vaultRoot),
        listarDiarios(vaultRoot),
        listarEventos(vaultRoot),
        listarMarcos(vaultRoot),
        listarContadores(vaultRoot),
        listarTarefas(vaultRoot),
      ]);

    const stats = calcularStatsAgregadas({
      humor,
      diarios,
      eventos,
      marcos,
      contadores,
      tarefas,
      periodo,
    });

    const key = STATS_KEY_POR_PERIODO[periodo];
    // Stats ja vem carimbado com version + atualizadoEm; o writer
    // canonico vai re-carimbar atualizadoEm (idempotente).
    await escreverEstadoCanonicoImediato(
      key,
      stats as unknown as Record<string, unknown>
    );
  } catch (e) {
    const emJest = typeof jest !== 'undefined';
    if (__DEV__ && !emJest) {
      console.warn(
        `escreverStatsAgregadas: falha em periodo '${periodo}'. Best-effort. ` +
          `Erro: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

// Agenda recalculo debounced: rajada em 30s agrupa em 1 write
// trailing-edge. Pensado para subscriber reativo de store de dominio,
// que ainda nao existe -- hoje nao ha caller fora deste arquivo e dos
// testes (o gatilho de boot usa escreverStatsAgregadas direto, ver
// preambulo).
//
// Nao bloqueante (sem Promise retornada). Caller dispara fire-and-forget.
//
// Por que nao agenda os 4 periodos juntos? Cada periodo tem seu
// proprio recalculo + write; rodar os 4 em sequencia sob mesmo timer
// economizaria 1 leitura mas duplicaria writes. Escolha defensiva:
// caller que precisa de um periodo especifico paga so por aquele
// (Settings UI -> '7d'; sibling Python ETL -> 'all').
export function agendarRecalculoStats(periodo: PeriodoStats): void {
  // Curto-circuito: vault inacessivel = no-op (evita memory leak em
  // testes onde useVault.getState e mock).
  const root =
    typeof useVault.getState === 'function'
      ? useVault.getState().vaultRoot
      : null;
  if (!root) return;

  const existente = timersPorPeriodo.get(periodo);
  if (existente) clearTimeout(existente);
  const handle = setTimeout(() => {
    timersPorPeriodo.delete(periodo);
    void escreverStatsAgregadas(periodo);
  }, STATS_DEBOUNCE_MS);
  timersPorPeriodo.set(periodo, handle);
}

// Agenda recalculo para TODOS os 4 periodos. Util quando uma mutacao
// pode afetar qualquer horizonte (ex: novo registro de humor afeta
// todas as 4 medias). Sem caller externo hoje: ficou disponivel para o
// subscriber reativo que ainda nao foi escrito. O gatilho de boot da
// AUDIT-P2-4 nao passa por aqui -- ver preambulo do arquivo.
export function agendarRecalculoStatsTodos(): void {
  for (const p of PERIODOS_STATS) {
    agendarRecalculoStats(p);
  }
}

// Helper de teste: forca flush sincrono de todos os debounces pendentes.
export async function _flushDebounceStats(): Promise<void> {
  const pendentes: PeriodoStats[] = [];
  for (const [periodo, handle] of timersPorPeriodo.entries()) {
    clearTimeout(handle);
    pendentes.push(periodo);
  }
  timersPorPeriodo.clear();
  for (const periodo of pendentes) {
    await escreverStatsAgregadas(periodo);
  }
}

// Helper de teste: reseta estado interno sem flush. Isola testes.
export function _resetEscreverStats(): void {
  for (const handle of timersPorPeriodo.values()) {
    clearTimeout(handle);
  }
  timersPorPeriodo.clear();
}
