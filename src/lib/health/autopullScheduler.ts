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
//      settings store e monta `since` por janelaDeLeitura: 7 dias atras
//      quando null, ou a marca anterior recuada de LOOKBACK_MS, sempre
//      encostada na meia-noite local.
//   2. Chama puxador.puxar({since, pageSize: 1000}) tolerando falha
//      individual (Promise.allSettled).
//   3. Em sucesso (erro === null), atualiza hcAutopullUltimaSync[tipo]
//      via setHCAutopullUltimaSync para o ISO da execucao atual.
//   4. Em erro, preserva ultimaSync anterior (ponto de retomada).
//   5. Agrega resultado por tipo em OrquestrarHCAutopullResult.
//
// INT-HC-2-JANELA-RETROATIVA (2026-09-08): o item 3 avanca a marca mesmo
// quando novos === 0, e ate 2026-09-08 o item 1 usava essa marca como
// inicio exato da janela seguinte. Sem sobreposicao, o que a barreira do
// dia em curso descarta (puxadores de passos e medidas) e o que o app de
// origem publica com atraso (TimeRangeFilter.between filtra pelo tempo do
// REGISTRO, nao pelo de insercao) caem entre duas janelas e nao sao lidos
// nunca mais. A sobreposicao de LOOKBACK_MS fecha esse buraco.
//
// Idempotencia fina por record.metadata.id e responsabilidade do
// puxador concreto, nao do scheduler. Scheduler so passa `since` e
// confia no puxador para escrever no Vault sem duplicar.
//
// Comentarios sem acento (convencao shell/CI).

import { devLog } from '@/lib/util/devLog';
import { useSettings } from '@/lib/stores/settings';
import { startOfTodayLocal } from '@/lib/datetime/local';
import type { TipoHC } from '@/lib/health/tipos';

// Re-exporta TipoHC para callers continuarem importando direto deste
// modulo (contrato externo preservado). O arquivo tipos.ts existe so
// para quebrar ciclo com stores/settings.ts.
export type { TipoHC };

// Contrato canonico de puxador concreto. Cada sprint irma
// (B.2-B.6) entrega uma instancia que escreve no Vault.
//
// O parametro `since` e o ISO 8601 do inicio da janela de leitura, ja
// calculado por janelaDeLeitura: nunca e' a marca crua da ultima sync,
// sempre uma marca recuada e encostada na meia-noite local (ou 7d atras
// na primeira sync). `pageSize` cap por exec. O puxador nao recalcula
// janela: recebe pronta e le [since, now].
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

// Sobreposicao aplicada a toda janela incremental (INT-HC-2, decisao 4.1
// do spec: no scheduler, nao em cada puxador, para valer de uma vez para
// os cinco puxadores e para os que vierem).
//
// Aritmetica do dimensionamento: a barreira do dia em curso descarta no
// maximo 24h de registros, e a rodada seguinte pode cair em qualquer hora
// do dia seguinte, entao o atraso maximo entre descartar e recuperar e'
// menor que 48h. 48h cobre o pior caso com um dia inteiro de margem, e
// cobre tambem a rajada tipica de publicacao da pulseira, que sincroniza
// em lotes de varios dias.
const LOOKBACK_MS = 48 * 60 * 60 * 1000;

// Monta o inicio da janela de leitura de um tipo. Exportada para que o
// teste exercite a aritmetica direto, sem passar pelo store.
//
// Encostar na meia-noite local (decisao 4.2) nao e' estetica: tanto
// escreverPassos quanto escreverMedida gravam o arquivo do DIA INTEIRO
// sem merge, entao um dia coberto pela metade seria regravado pela
// metade. Com o encaixe, todo dia dentro da janela esta coberto do
// primeiro ao ultimo minuto. O encaixe so aumenta a janela, nunca reduz.
//
// `sinceRaw` invalido cai na janela default: o valor vem de estado
// persistido e hidratado (mesma classe da armadilha A47), e deixar um
// Invalid Date chegar em toISOString derrubaria a rodada inteira.
export function janelaDeLeitura(sinceRaw: string | null, agora: Date): string {
  const marcaMs = sinceRaw === null ? NaN : new Date(sinceRaw).getTime();
  const inicioMs = Number.isNaN(marcaMs)
    ? agora.getTime() - JANELA_DEFAULT_MS
    : marcaMs - LOOKBACK_MS;
  return startOfTodayLocal(new Date(inicioMs)).toISOString();
}

// Orquestra autopull do HC chamando cada puxador injetado. Tolera
// falha individual: 1 puxador erro nao interrompe os outros.
//
// Caller (app/_layout.tsx em sprint futura) injeta o array de
// puxadores ja instanciados — esta funcao NAO conhece os puxadores
// concretos, garantindo testabilidade e quebra de ciclo de modulo.
export async function orquestrarHCAutopull(
  puxadores: Puxador[]
): Promise<OrquestrarHCAutopullResult> {
  const agora = new Date();
  const rodadoEm = agora.toISOString();
  const ultimaSync = useSettings.getState().hcAutopullUltimaSync;
  const setUltimaSync = useSettings.getState().setHCAutopullUltimaSync;

  devLog('[hc-autopull]', 'inicio', { rodadoEm, n: puxadores.length });

  // Promise.allSettled isola falha por puxador. Se 1 puxador rejeitar,
  // os outros ainda completam e o resultado agrega o erro como string.
  const resultados = await Promise.allSettled(
    puxadores.map(async (p) => {
      const since = janelaDeLeitura(ultimaSync[p.tipo] ?? null, agora);
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
  devLog('[hc-autopull]', 'fim', {
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
