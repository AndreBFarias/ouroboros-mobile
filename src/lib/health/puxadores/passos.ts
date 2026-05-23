// Puxador HC -> Vault para StepsRecord.
// R-INT-3-HC-AUTOPULL-PASSOS (2026-05-22).
//
// Implementa o contrato `Puxador` definido em autopullScheduler.ts.
// Le StepsRecord do HC dentro de [since, now], agrega por dia local
// (UTC-3 fixo, BRT — alinhado com formatDateYmd em paths.ts), filtra
// dias com endTime < startOfTodayLocal (nao escreve dia em curso),
// e chama escreverPassos para cada dia restante.
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

// Fuso fixo São Paulo (UTC-3, sem DST desde 2019). Mesmo offset
// usado por formatDateYmd em paths.ts. Variavel em modulo (top-level
// const) e' segura porque o offset nunca muda em runtime.
const TZ_OFFSET_MIN = -180;
const TZ_SHIFT_MS = TZ_OFFSET_MIN * 60_000;

// Shape do StepsRecord que vem da bridge nativa (espelha
// StepsRecordReadResult em src/lib/health/sync.ts).
interface StepsRecordRaw {
  metadata?: { id?: string };
  startTime?: string;
  endTime?: string;
  count?: number;
}

// Calcula YYYY-MM-DD em BRT a partir de um ISO datetime (que pode
// estar em UTC, com offset ou Z). Decompoe usando getUTC* apos shift
// de TZ_OFFSET_MIN, mesma estrategia que formatDateYmd em paths.ts
// (consistencia entre arquivo escrito e calculo posterior).
function isoToDataLocalYmd(iso: string): string {
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) {
    // ISO invalido (defesa); retorna string vazia que sera filtrada
    // upstream pelo caller.
    return '';
  }
  const local = new Date(utc.getTime() + TZ_SHIFT_MS);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Inicio do dia local (00:00 BRT) para uma data UTC. Util para
// determinar onde a barreira "dia em curso" comeca.
function startOfTodayLocal(now: Date): Date {
  const local = new Date(now.getTime() + TZ_SHIFT_MS);
  // Zera para 00:00 UTC sobre o "now em BRT" e desfaz o shift.
  const yyyy = local.getUTCFullYear();
  const mm = local.getUTCMonth();
  const dd = local.getUTCDate();
  // Date.UTC monta o midnight BRT (que e 03:00 UTC).
  const midnightLocalUtcMs = Date.UTC(yyyy, mm, dd, 0, 0, 0, 0) - TZ_SHIFT_MS;
  return new Date(midnightLocalUtcMs);
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
