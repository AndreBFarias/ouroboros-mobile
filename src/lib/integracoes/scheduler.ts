// Orquestrador puro de integracoes nao-HC (Google Calendar e, no
// futuro, Spotify/YouTube/Drive). R-INT-2-CALENDAR-SYNC-EVENTOS
// (2026-05-25). Espelha o padrao de src/lib/health/autopullScheduler.ts:
//
//   1. Recebe um array de Integracao ja instanciadas (injecao pura).
//      Esta funcao NAO conhece tokens, stores ou rede — cada Integracao
//      encapsula sua propria logica de sync (analogo ao Puxador do HC).
//   2. Chama integracao.sincronizar() tolerando falha individual via
//      Promise.allSettled: 1 integracao com erro nao interrompe as
//      outras.
//   3. Agrega resultado por integracao em OrquestrarIntegracoesResult.
//
// Idempotencia (nao duplicar eventos por id) e responsabilidade da
// propria Integracao concreta (no caso do Calendar, do writer
// sincronizarSnapshotAgenda que ja deduplica por event.id). O scheduler
// so coordena e agrega.
//
// O tracking de ultima sync (settings.calendarSyncUltimaSync) NAO e'
// escrito por este modulo puro: quem decide se deve disparar (throttle)
// e quem marca a ultima sync e' o wiring em app/_layout.tsx, mantendo
// o scheduler testavel sem store. Mesma separacao usada no HC: o
// throttle vive no wiring, o scheduler so executa.
//
// Comentarios sem acento (convencao shell/CI).

// R-INT-3-LOGGER-CONDICIONAL: logs de diagnostico so em __DEV__.
import { devLog } from '@/lib/util/devLog';

// Contrato canonico de uma integracao concreta. Cada integracao
// (Calendar agora; Spotify/YouTube depois) entrega uma instancia cujo
// `sincronizar` escreve no Vault e devolve um resumo. `nome` identifica
// a integracao no resultado e nos logs.
export interface Integracao {
  nome: string;
  sincronizar(): Promise<{ novos: number; erro: string | null }>;
}

// Resultado de uma execucao completa do orquestrador.
export interface OrquestrarIntegracoesResult {
  // ISO 8601 do disparo (instante em que orquestrarIntegracoes foi
  // chamado, antes da primeira integracao).
  rodadoEm: string;
  // Resultado por integracao (mesma ordem do array injetado).
  integracoes: Array<{
    nome: string;
    novos: number;
    erro: string | null;
  }>;
}

// Orquestra integracoes nao-HC chamando cada uma injetada. Tolera
// falha individual: 1 integracao com erro nao interrompe as outras.
//
// Caller (app/_layout.tsx) injeta o array de integracoes ja
// instanciadas — esta funcao NAO conhece os detalhes concretos,
// garantindo testabilidade pura.
export async function orquestrarIntegracoes(
  integracoes: Integracao[]
): Promise<OrquestrarIntegracoesResult> {
  const rodadoEm = new Date().toISOString();

  devLog('[integracoes]', 'inicio', {
    rodadoEm,
    n: integracoes.length,
  });

  // Promise.allSettled isola falha por integracao. Se 1 rejeitar, as
  // outras ainda completam e o resultado agrega o erro como string.
  const resultados = await Promise.allSettled(
    integracoes.map(async (i) => {
      const { novos, erro } = await i.sincronizar();
      return { nome: i.nome, novos, erro };
    })
  );

  // Mapeia resultados preservando ordem do array original. Para
  // Promise.allSettled rejeitada (caso a integracao propague excecao
  // em vez de devolver {erro: string}), captura como erro generico.
  const agregado: OrquestrarIntegracoesResult['integracoes'] =
    resultados.map((r, idx) => {
      const integracao = integracoes[idx];
      if (r.status === 'fulfilled') {
        return r.value;
      }
      const mensagem =
        r.reason instanceof Error
          ? r.reason.message
          : String(r.reason ?? 'rejected');
      return { nome: integracao.nome, novos: 0, erro: mensagem };
    });

  const totalNovos = agregado.reduce((acc, i) => acc + i.novos, 0);
  const totalErros = agregado.filter((i) => i.erro !== null).length;
  devLog('[integracoes]', 'fim', {
    rodadoEm,
    totalNovos,
    totalErros,
  });

  return { rodadoEm, integracoes: agregado };
}
