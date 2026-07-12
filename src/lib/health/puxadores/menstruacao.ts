// Puxador HC -> Vault para MenstruationFlow.
// R-INT-3-HC-AUTOPULL-MENSTRUACAO (2026-05-25).
//
// Implementa o contrato `Puxador` definido em autopullScheduler.ts.
// Le MenstruationFlowRecord do HC dentro de [since, now] e cria um
// RegistroCiclo no Vault para cada dia local que tenha flow, reusando
// o writer escreverRegistroCiclo (src/lib/vault/ciclo.ts) e o schema
// CicloMenstrualSchema existente. Nenhum schema novo e' criado.
//
// DIVERGENCIA DELIBERADA do puxadorPassos (espelhado em estrutura):
//   1. MenstruationFlow usa `time` (instante unico), nao
//      startTime/endTime. Cada record e um evento de fluxo pontual.
//   2. NAO aplicamos a barreira "dia em curso" do puxadorPassos: o
//      flow nao e um agregado que muda durante o dia, e' um evento
//      pontual estavel. Registrar o dia atual e correto. So
//      descartamos records com `time` no futuro (defesa contra
//      relogio sujo). Idempotencia (item 3) impede regravar.
//   3. Idempotencia por DATA (nao por record.metadata.id): antes de
//      escrever, lerRegistroCiclo(vaultRoot, data) — se ja existe
//      registro nessa data, pula. Protege registro manual do usuario
//      de ser sobrescrito por autopull (o usuario tem prioridade).
//
// MAPEAMENTO HC MenstruationFlow -> schema ciclo_menstrual:
//   - flow HC (1=light, 2=medium, 3=heavy) -> intensidade 1..5 do
//     schema. Inverso de intensidadeParaFluxoHC em vault/ciclo.ts
//     (que mapeia intensidade <=2 -> light, 3 -> medium, >=4 ->
//     heavy). Para round-trip estavel escolhemos os pontos medios:
//       light(1)  -> intensidade 2  (2 <= 2 volta a light)
//       medium(2) -> intensidade 3  (3 vira medium)
//       heavy(3)  -> intensidade 4  (4 >= 4 volta a heavy)
//   - fase: 'menstrual'. Presenca de MenstruationFlow no HC implica
//     sangramento em curso; a fase canonica e menstrual.
//   - data_inicio: null. Um record isolado de flow nao carrega o
//     inicio do ciclo; nao inferimos inicio a partir de autopull
//     (inferirFase upstream lida com data_inicio null como menstrual).
//   - sintomas: []. HC MenstruationFlow nao traz sintomas.
//   - humor_associado: null. Nao existe no record HC.
//   - texto: null. Nao existe no record HC.
//
// Quando varios records caem na mesma data local, mantemos o de
// MAIOR flow do dia (intensidade dominante). readRecords vem em ordem
// ascendente; iteramos e guardamos o flow maximo por data antes de
// escrever.
//
// Erros: o puxador NAO propaga excecao para o scheduler. Captura
// internamente e retorna {novos: 0, erro: mensagem}. Scheduler
// preserva ultimaSync nesse caso, garantindo ponto de retomada.
//
// Tema sensivel: data-layer puro, sem strings de UI, sem tom
// motivacional. Comentarios sem acento (convencao shell/CI).
import { readRecords } from '../../../../modules/health-connect/src';
import { escreverRegistroCiclo, lerRegistroCiclo } from '@/lib/vault/ciclo';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';
import { isoToDataLocalYmd } from '@/lib/datetime/local';
import type { Puxador } from '@/lib/health/autopullScheduler';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { CicloMenstrualMeta } from '@/lib/schemas/ciclo_menstrual';

// Janela default se since vier null (mesma do scheduler — 7 dias).
const JANELA_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;

// Calculo de dia-local (isoToDataLocalYmd) agora vem do helper canonico
// src/lib/datetime/local.ts (Intl-based, default America/Sao_Paulo).
// Preserva o BRT anterior bit-a-bit.

// Mapa flow HC -> intensidade do schema (1..5). Ver comentario de
// cabecalho para a justificativa dos pontos medios (round-trip
// estavel com intensidadeParaFluxoHC).
const FLOW_PARA_INTENSIDADE: Record<number, 1 | 2 | 3 | 4 | 5> = {
  1: 2,
  2: 3,
  3: 4,
};

// Shape do MenstruationFlowRecord que vem da bridge nativa. Espelha o
// contrato documentado em modules/health-connect/src/index.ts:
//   { time, flow: number (1=light, 2=medium, 3=heavy), metadata }
interface MenstruationFlowRecordRaw {
  metadata?: { id?: string };
  time?: string;
  flow?: number;
}

// Le pessoa atual do store, com fallback defensivo para pessoa_a.
// Mesma logica do puxadorPassos: familia (vaultCompartilhado) nao
// duplica porque cada pessoa roda o puxador no proprio device.
function lerPessoaAtiva(): PessoaAutor {
  try {
    const pessoa = useSettings.getState().pessoa?.ativa;
    if (pessoa === 'pessoa_a' || pessoa === 'pessoa_b') return pessoa;
  } catch {
    // Store nao inicializado (teste isolado ou boot incompleto).
  }
  return 'pessoa_a';
}

// Implementa Puxador<MenstruationFlowRecord>. Le, mapeia por data
// (mantendo flow maximo do dia), filtra datas ja persistidas e
// escreve um RegistroCiclo por data nova.
export const puxadorMenstruacao: Puxador = {
  tipo: 'MenstruationFlow',
  async puxar({ since, pageSize }) {
    try {
      const vaultRoot = useVault.getState().vaultRoot;
      if (!vaultRoot) {
        return { novos: 0, erro: 'vault_root_indisponivel' };
      }

      const now = new Date();
      const startTimeIso =
        since ?? new Date(now.getTime() - JANELA_DEFAULT_MS).toISOString();

      const res = await readRecords('MenstruationFlow', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTimeIso,
          endTime: now.toISOString(),
        },
        pageSize,
        ascendingOrder: true,
      });

      const records = res.records as MenstruationFlowRecordRaw[];
      if (records.length === 0) {
        return { novos: 0, erro: null };
      }

      // Agrupa por YYYY-MM-DD local, mantendo o MAIOR flow do dia.
      // Descarta records com time invalido, no futuro, ou flow fora
      // do dominio {1,2,3}.
      const flowMaxPorData = new Map<string, number>();
      for (const r of records) {
        if (typeof r.time !== 'string' || typeof r.flow !== 'number') {
          continue;
        }
        if (!(r.flow in FLOW_PARA_INTENSIDADE)) continue;
        const t = new Date(r.time);
        if (Number.isNaN(t.getTime())) continue;
        // Defesa contra relogio sujo: descarta evento no futuro.
        if (t.getTime() > now.getTime()) continue;
        const dataLocal = isoToDataLocalYmd(r.time);
        if (!dataLocal) continue;
        const prev = flowMaxPorData.get(dataLocal) ?? 0;
        if (r.flow > prev) flowMaxPorData.set(dataLocal, r.flow);
      }

      if (flowMaxPorData.size === 0) {
        return { novos: 0, erro: null };
      }

      const autor = lerPessoaAtiva();

      // Ordena por data ascendente para escrita previsivel.
      const datas = Array.from(flowMaxPorData.entries()).sort((a, b) =>
        a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
      );

      let escritos = 0;
      for (const [data, flow] of datas) {
        // Idempotencia por data: registro manual do usuario tem
        // prioridade. Se ja existe registro nessa data, nao
        // sobrescreve via autopull.
        const existente = await lerRegistroCiclo(vaultRoot, data);
        if (existente) continue;

        const intensidade = FLOW_PARA_INTENSIDADE[flow];
        const meta: CicloMenstrualMeta = {
          tipo: 'ciclo_menstrual',
          data,
          autor,
          data_inicio: null,
          fase: 'menstrual',
          sintomas: [],
          intensidade,
          humor_associado: null,
          texto: null,
        };
        // R-INT-3-HC-AUTOPULL-WRITEBACK-GUARD: pularSyncHC evita o loop
        // HC -> Vault -> HC. O dado veio do HC; reinjetar via write-back
        // duplicaria (insertRecords da bridge nao dedupa).
        await escreverRegistroCiclo(vaultRoot, meta, '', { pularSyncHC: true });
        escritos += 1;
      }

      return { novos: escritos, erro: null };
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : String(e ?? 'erro_desconhecido');
      return { novos: 0, erro: msg };
    }
  },
};
