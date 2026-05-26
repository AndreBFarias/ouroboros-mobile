// Puxador HC -> Vault para StepsRecord.
// R-INT-3-HC-AUTOPULL-PASSOS (2026-05-22).
//
// Implementa o contrato `Puxador` definido em autopullScheduler.ts.
// Le StepsRecord do HC dentro de [since, now], agrega por dia local
// (via Intl.DateTimeFormat com timezone alvo; default America/Sao_Paulo
// preserva o comportamento BRT alinhado a formatDateYmd em paths.ts),
// filtra dias com endTime < startOfTodayLocal (nao escreve dia em
// curso), e chama escreverPassos para cada dia restante.
//
// Decisoes do dono:
//   1. Pessoa via useSettings.getState().pessoa.ativa (campo
//      canonico, sem novo campo).
//   2. Sobrescrever-D-1: dia em curso nao e escrito. D-N pode
//      reescrever (idempotencia natural do agregado por dia
//      encerrado).
//
// Erros: o puxador NAO propaga excecao para o scheduler. Captura
// internamente e retorna {novos: 0, erro: mensagem}. Scheduler
// preserva ultimaSync nesse caso, garantindo ponto de retomada.
//
// Comentarios sem acento (convencao shell/CI).
import { readRecords } from '../../../../modules/health-connect/src';
import { escreverPassos } from '@/lib/vault/passos';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';
import type { Puxador } from '@/lib/health/autopullScheduler';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// Janela default se since vier null (mesma do scheduler — 7 dias).
const JANELA_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;

// Timezone default para o calculo de dia local. Mantem paridade com
// o comportamento BRT anterior; Intl resolve DST automaticamente caso
// o tz alvo o utilize (ao contrario de um offset fixo).
const TZ_DEFAULT = 'America/Sao_Paulo';

// Shape do StepsRecord que vem da bridge nativa (espelha
// StepsRecordReadResult em src/lib/health/sync.ts).
interface StepsRecordRaw {
  metadata?: { id?: string };
  startTime?: string;
  endTime?: string;
  count?: number;
}

// Calcula YYYY-MM-DD no timezone alvo para uma data. Usa o locale
// en-CA, que formata datas no padrao YYYY-MM-DD nativamente (sem
// split manual). Default America/Sao_Paulo preserva o BRT anterior
// e mantem paridade com formatDateYmd em paths.ts.
function dataLocalYmd(d: Date, tz: string = TZ_DEFAULT): string {
  if (Number.isNaN(d.getTime())) {
    // Data invalida (defesa); retorna string vazia que sera filtrada
    // upstream pelo caller.
    return '';
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Extrai o offset do timezone alvo (em minutos relativos a UTC) no
// instante informado. Resolve DST automaticamente, pois consulta o
// offset vigente naquele instante especifico. Ex.: America/Sao_Paulo
// retorna -180; America/Los_Angeles retorna -420 (PDT) ou -480 (PST).
function offsetMinutos(d: Date, tz: string): number {
  // longOffset produz nomes como "GMT-03:00". Extrai sinal/hora/min.
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  }).formatToParts(d);
  const nome = partes.find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = nome.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0; // UTC (sem offset textual) ou formato inesperado.
  const sinal = m[1] === '-' ? -1 : 1;
  const horas = parseInt(m[2], 10);
  const mins = m[3] ? parseInt(m[3], 10) : 0;
  return sinal * (horas * 60 + mins);
}

// Calcula YYYY-MM-DD no timezone alvo a partir de um ISO datetime
// (UTC, com offset ou Z). Delega ao formatter Intl.
function isoToDataLocalYmd(iso: string, tz: string = TZ_DEFAULT): string {
  return dataLocalYmd(new Date(iso), tz);
}

// Inicio do dia local (00:00 no tz alvo) para uma data. Util para
// determinar onde a barreira "dia em curso" comeca. Estrategia: obtem
// o YMD local via Intl, calcula o offset vigente do tz no instante e
// constroi o instante UTC correspondente a meia-noite local.
function startOfTodayLocal(now: Date, tz: string = TZ_DEFAULT): Date {
  const ymd = dataLocalYmd(now, tz);
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const off = offsetMinutos(now, tz);
  // Meia-noite local em UTC = Date.UTC(meia-noite local) menos offset.
  const midnightUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - off * 60_000;
  return new Date(midnightUtcMs);
}

// Le pessoa atual do store, com fallback defensivo para pessoa_a.
// Familia (vaultCompartilhado=true) nao gera duplicacao: cada pessoa
// roda o puxador no proprio device, autor reflete quem disparou.
function lerPessoaAtiva(): PessoaAutor {
  try {
    const pessoa = useSettings.getState().pessoa?.ativa;
    if (pessoa === 'pessoa_a' || pessoa === 'pessoa_b') return pessoa;
  } catch {
    // Store nao inicializado (teste isolado ou boot incompleto);
    // fallback.
  }
  return 'pessoa_a';
}

// Implementa Puxador<StepsRecord>. Le, agrega, filtra e escreve.
export const puxadorPassos: Puxador = {
  tipo: 'Steps',
  async puxar({ since, pageSize }) {
    try {
      const vaultRoot = useVault.getState().vaultRoot;
      if (!vaultRoot) {
        return { novos: 0, erro: 'vault_root_indisponivel' };
      }

      const now = new Date();
      const startTimeIso =
        since ?? new Date(now.getTime() - JANELA_DEFAULT_MS).toISOString();

      const res = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTimeIso,
          endTime: now.toISOString(),
        },
        pageSize,
        ascendingOrder: true,
      });

      const records = res.records as StepsRecordRaw[];
      if (records.length === 0) {
        return { novos: 0, erro: null };
      }

      // Barreira do dia em curso: descarta records cujo endTime >=
      // 00:00 do dia local atual. Apenas dias COMPLETOS (D-1 e
      // anteriores) entram no agregado.
      const barreira = startOfTodayLocal(now);

      // Agrupa por YYYY-MM-DD local. Soma `count` por dia.
      const totais = new Map<string, number>();
      for (const r of records) {
        if (
          typeof r.endTime !== 'string' ||
          typeof r.count !== 'number' ||
          r.count < 0
        ) {
          continue;
        }
        const endUtc = new Date(r.endTime);
        if (Number.isNaN(endUtc.getTime())) continue;
        // Filtro D-1: pula records cujo endTime ainda esta no dia
        // em curso (endTime >= 00:00 BRT do dia atual).
        if (endUtc.getTime() >= barreira.getTime()) continue;
        const dataLocal = isoToDataLocalYmd(r.endTime);
        if (!dataLocal) continue;
        const prev = totais.get(dataLocal) ?? 0;
        totais.set(dataLocal, prev + r.count);
      }

      if (totais.size === 0) {
        return { novos: 0, erro: null };
      }

      const autor = lerPessoaAtiva();
      const sincronizadoEm = now.toISOString();

      // Ordena por data ascendente para escrita previsivel (logs e
      // testes). Map preserva ordem de insercao, mas como agregamos
      // ascending no readRecords e iteramos por records, mantemos
      // ordem explicita aqui pra robustez.
      const dias = Array.from(totais.entries()).sort((a, b) =>
        a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
      );

      let escritos = 0;
      for (const [data, total] of dias) {
        await escreverPassos(vaultRoot, data, total, autor, sincronizadoEm);
        escritos += 1;
      }

      return { novos: escritos, erro: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? 'erro_desconhecido');
      return { novos: 0, erro: msg };
    }
  },
};

// Helpers internos expostos apenas para teste. NAO faz parte do
// contrato publico Puxador; nao deve ser consumido em runtime.
export const __test__only__ = {
  dataLocalYmd,
  isoToDataLocalYmd,
  startOfTodayLocal,
  offsetMinutos,
};
