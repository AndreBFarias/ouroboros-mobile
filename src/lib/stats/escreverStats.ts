// Writer reativo de stats agregadas (R-VAULT-CANONICAL-COMPLETE-B).
//
// Le todas as listas do Vault, chama calcularStatsAgregadas e
// persiste em vault/_estado/stats-<periodo>-<deviceId>.md via a
// infraestrutura R-VAULT-A (escreverEstadoCanonico).
//
// Debounce 30s por periodo: subscribers dos stores de dominio
// (humor, diario, eventos, marcos, contadores, tarefas) chamam
// agendarRecalculoStats em cada mutacao; o agendamento agrupa em
// 1 write por periodo a cada 30s.
//
// Por que 30s e nao os 500ms padrao de escreverEstadoCanonico?
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
// escreverEstadoCanonicoImediato. Exporta para o caller (UI ou test)
// forcar write sincrono sem aguardar debounce.
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

// Agenda recalculo debounced. Subscribers dos stores de dominio chamam
// em cada mutacao. Rajada em 30s agrupa em 1 write trailing-edge.
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
// todas as 4 medias). Caller comum: subscribers de stores de dominio.
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
