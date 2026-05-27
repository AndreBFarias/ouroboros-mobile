// Orquestrador puro de autopull do Health Connect.
// R-INT-3-HC-AUTOPULL-SCHEDULER (2026-05-22).
//
// Esta sprint entrega o orquestrador SEM puxadores concretos. Cada
// puxador (Steps, ExerciseSession, Weight, BodyFat, HeartRate,
// SleepSession, MenstruationFlow) e implementado em sprint dedicada
// (R-INT-3-HC-AUTOPULL-{PASSOS,EXERCICIO,MEDIDAS,MENSTRUACAO,SLEEP}).
//
// Responsabilidade do scheduler:
//
//   1. Para cada Puxador injetado, le hcAutopullUltimaSync[tipo] do
//      settings store e monta `since` (default: 7 dias atras se null).
//   2. Chama puxador.puxar({since, pageSize: 1000}) tolerando falha
//      individual (Promise.allSettled).
//   3. Em sucesso (erro === null), atualiza hcAutopullUltimaSync[tipo]
//      via setHCAutopullUltimaSync para o ISO da execucao atual.
//   4. Em erro, preserva ultimaSync anterior (ponto de retomada).
//   5. Agrega resultado por tipo em OrquestrarHCAutopullResult.
//
// Idempotencia fina por record.metadata.id e responsabilidade do
// puxador concreto, nao do scheduler. Scheduler so passa `since` e
// confia no puxador para escrever no Vault sem duplicar.
//
// Comentarios sem acento (convencao shell/CI).

import { useSettings } from '@/lib/stores/settings';
import type { TipoHC } from '@/lib/health/tipos';

// Re-exporta TipoHC para callers continuarem importando direto deste
// modulo (contrato externo preservado). O arquivo tipos.ts existe so
// para quebrar ciclo com stores/settings.ts.
export type { TipoHC };

// Contrato canonico de puxador concreto. Cada sprint irma
// (B.2-B.6) entrega uma instancia que escreve no Vault.
//
// O parametro `since` e o ISO 8601 do timestamp da ultima sync
// bem-sucedida deste tipo (ou null se nunca sincronizou — scheduler
// converte em 7d atras antes de chamar). `pageSize` cap por exec.
export interface Puxador<T = unknown> {
  tipo: TipoHC;
  puxar(opts: {
    since: string | null;
    pageSize: number;
  }): Promise<{ novos: number; erro: string | null }>;
}

// Resultado de uma execucao completa do scheduler.
export interface OrquestrarHCAutopullResult {
  // ISO 8601 do disparo (instante em que orquestrarHCAutopull foi
  // chamado, antes do primeiro puxador).
  rodadoEm: string;
  // Resultado por puxador (mesma ordem do array injetado).
  tipos: Array<{
    tipo: TipoHC;
    novos: number;
    erro: string | null;
  }>;
}

// Cap fixo por tipo, por execucao. Protege contra primeira sync
// gigantesca (usuario com anos de historico no HC). Puxadores podem
// paginar manualmente em rodadas futuras (since avanca a cada sync).
const PAGE_SIZE_CAP = 1000;

// Janela default da primeira sync (ultimaSync === null). 7 dias e' o
// equilibrio entre "puxar o suficiente pra ser util" e "nao fritar a
// bateria no primeiro boot pos-onboarding HC".
const JANELA_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;

// Orquestra autopull do HC chamando cada puxador injetado. Tolera
// falha individual: 1 puxador erro nao interrompe os outros.
//
// Caller (app/_layout.tsx em sprint futura) injeta o array de
// puxadores ja instanciados — esta funcao NAO conhece os puxadores
// concretos, garantindo testabilidade e quebra de ciclo de modulo.
export async function orquestrarHCAutopull(
  puxadores: Puxador[]
): Promise<OrquestrarHCAutopullResult> {
  const rodadoEm = new Date().toISOString();
  const ultimaSync = useSettings.getState().hcAutopullUltimaSync;
  const setUltimaSync = useSettings.getState().setHCAutopullUltimaSync;

  console.log('[hc-autopull]', 'inicio', { rodadoEm, n: puxadores.length });

  // Promise.allSettled isola falha por puxador. Se 1 puxador rejeitar,
  // os outros ainda completam e o resultado agrega o erro como string.
  const resultados = await Promise.allSettled(
    puxadores.map(async (p) => {
      const sinceRaw = ultimaSync[p.tipo];
      const since =
        sinceRaw ?? new Date(Date.now() - JANELA_DEFAULT_MS).toISOString();
      const { novos, erro } = await p.puxar({
        since,
        pageSize: PAGE_SIZE_CAP,
      });
      return { tipo: p.tipo, novos, erro };
    })
  );

  // Mapeia resultados preservando ordem do array original. Para
  // Promise.allSettled rejeitada (caso o puxador propague excecao em
  // vez de devolver {erro: string}), captura como erro generico.
  const tipos: OrquestrarHCAutopullResult['tipos'] = resultados.map(
    (r, idx) => {
      const puxador = puxadores[idx];
      if (r.status === 'fulfilled') {
        return r.value;
      }
      // Puxador lancou excecao em vez de retornar {erro: string}.
      // Trata como erro mas preserva ultimaSync (mesma semantica que
      // erro === string: ponto de retomada).
      const mensagem =
        r.reason instanceof Error
          ? r.reason.message
          : String(r.reason ?? 'rejected');
      return { tipo: puxador.tipo, novos: 0, erro: mensagem };
    }
  );

  // Atualiza ultimaSync APENAS para tipos com erro null. Erro =>
  // preserva o valor anterior, scheduler reusa esse since na proxima
  // execucao (retomada de onde parou).
  for (const r of tipos) {
    if (r.erro === null) {
      setUltimaSync(r.tipo, rodadoEm);
    }
  }

  const totalNovos = tipos.reduce((acc, t) => acc + t.novos, 0);
  const totalErros = tipos.filter((t) => t.erro !== null).length;
  console.log('[hc-autopull]', 'fim', {
    rodadoEm,
    totalNovos,
    totalErros,
  });

  // R-INT-3-HC-SYNC-PAINEL (2026-05-26): grava a telemetria agregada da
  // rodada no settings store. Todo caller (boot/foreground em _layout e
  // o botao manual "Sincronizar agora" em /settings/integracoes) passa
  // a alimentar a linha "Ultima rodada: N novos" do painel sem precisar
  // duplicar a agregacao. Efemero (nao espelha no Vault).
  useSettings.getState().setHCAutopullUltimaRodada({
    rodadoEm,
    novos: totalNovos,
    erros: totalErros,
  });

  return { rodadoEm, tipos };
}
