// Puxador HC -> Vault para WeightRecord + BodyFatRecord.
// R-INT-3-HC-AUTOPULL-MEDIDAS (2026-05-25).
//
// Implementa o contrato `Puxador` definido em autopullScheduler.ts.
// Le WeightRecord e BodyFatRecord do HC dentro de [since, now] (duas
// leituras em paralelo), agrupa por dia local (UTC-3 fixo, BRT —
// alinhado com formatDateYmd em paths.ts e com puxadores/passos.ts),
// pareia peso e gordura do mesmo dia, filtra o dia em curso (endTime
// >= startOfTodayLocal nao e escrito) e chama escreverMedida para
// cada dia restante.
//
// Decisoes do dono:
//   1. tipo canonico = 'Weight'. Medida agrega peso + gordura na mesma
//      leitura; o scheduler so precisa de um TipoHC pra montar `since`
//      (hcAutopullUltimaSync['Weight']). O puxador le os dois record
//      types internamente dentro de puxar().
//   2. Pessoa via useSettings.getState().pessoa.ativa (campo canonico,
//      mesma estrategia de passos).
//   3. Idempotencia por dia: a chave do arquivo de medida e a data
//      (medidas/YYYY-MM-DD.md em escreverMedida). Reescrever o mesmo
//      dia regrava com o ultimo valor lido do HC; como so escrevemos
//      dias encerrados (endTime < startOfTodayLocal), o valor e
//      estavel entre execucoes.
//   4. Dia em curso nao e escrito (mesma barreira de passos).
//   5. Multiplas pesagens no mesmo dia: fica a ultima leitura do dia
//      (maior `time`), que e o snapshot mais recente daquele dia.
//
// Erros: o puxador NAO propaga excecao para o scheduler. Captura
// internamente e retorna {novos: 0, erro: mensagem}. Scheduler
// preserva ultimaSync nesse caso, garantindo ponto de retomada.
//
// Comentarios sem acento (convencao shell/CI).
import { readRecords } from '../../../../modules/health-connect/src';
import { escreverMedida } from '@/lib/vault/medidas';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';
import type { Puxador } from '@/lib/health/autopullScheduler';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { Medida } from '@/lib/schemas/medidas';

// Janela default se since vier null (mesma do scheduler — 7 dias).
const JANELA_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;

// Fuso fixo Sao Paulo (UTC-3, sem DST desde 2019). Mesmo offset usado
// por formatDateYmd em paths.ts e por puxadores/passos.ts.
const TZ_OFFSET_MIN = -180;
const TZ_SHIFT_MS = TZ_OFFSET_MIN * 60_000;

// Shape do WeightRecord vindo da bridge nativa (espelha
// WeightRecordReadResult em src/lib/health/sync.ts).
interface WeightRecordRaw {
  metadata?: { id?: string };
  time?: string;
  weight?: { inKilograms?: number };
}

// Shape do BodyFatRecord vindo da bridge nativa.
interface BodyFatRecordRaw {
  metadata?: { id?: string };
  time?: string;
  percentage?: number;
}

// Calcula YYYY-MM-DD em BRT a partir de um ISO datetime. Decompoe
// usando getUTC* apos shift de TZ_OFFSET_MIN, mesma estrategia que
// formatDateYmd em paths.ts (consistencia entre arquivo escrito e
// calculo posterior).
function isoToDataLocalYmd(iso: string): string {
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) {
    return '';
  }
  const local = new Date(utc.getTime() + TZ_SHIFT_MS);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Inicio do dia local (00:00 BRT) para uma data UTC. Barreira do dia
// em curso (mesma logica de passos).
function startOfTodayLocal(now: Date): Date {
  const local = new Date(now.getTime() + TZ_SHIFT_MS);
  const yyyy = local.getUTCFullYear();
  const mm = local.getUTCMonth();
  const dd = local.getUTCDate();
  const midnightLocalUtcMs = Date.UTC(yyyy, mm, dd, 0, 0, 0, 0) - TZ_SHIFT_MS;
  return new Date(midnightLocalUtcMs);
}

// Le pessoa atual do store, com fallback defensivo para pessoa_a.
function lerPessoaAtiva(): PessoaAutor {
  try {
    const pessoa = useSettings.getState().pessoa?.ativa;
    if (pessoa === 'pessoa_a' || pessoa === 'pessoa_b') return pessoa;
  } catch {
    // Store nao inicializado (teste isolado ou boot incompleto).
  }
  return 'pessoa_a';
}

// Acumulador por dia: guarda o ultimo peso e a ultima gordura (maior
// `time`) daquele dia, alem do timestamp pra desempate.
interface AcumuladorDia {
  peso?: number;
  pesoEm?: number;
  gordura?: number;
  gorduraEm?: number;
}

// Filtro comum: descarta record sem time, com time invalido, ou cujo
// time >= barreira (dia em curso). Retorna a data local YYYY-MM-DD
// quando o record passa, ou null quando deve ser descartado.
function dataValidaOuNull(
  time: string | undefined,
  barreira: Date
): string | null {
  if (typeof time !== 'string') return null;
  const utc = new Date(time);
  if (Number.isNaN(utc.getTime())) return null;
  if (utc.getTime() >= barreira.getTime()) return null;
  const dataLocal = isoToDataLocalYmd(time);
  return dataLocal || null;
}

// Implementa Puxador. tipo='Weight' (chave de ultimaSync no scheduler);
// internamente le Weight + BodyFat.
export const puxadorMedidas: Puxador = {
  tipo: 'Weight',
  async puxar({ since, pageSize }) {
    try {
      const vaultRoot = useVault.getState().vaultRoot;
      if (!vaultRoot) {
        return { novos: 0, erro: 'vault_root_indisponivel' };
      }

      const now = new Date();
      const startTimeIso =
        since ?? new Date(now.getTime() - JANELA_DEFAULT_MS).toISOString();
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startTimeIso,
        endTime: now.toISOString(),
      };

      // Le os dois record types em paralelo. readRecords da bridge nao
      // propaga excecao (retorna {records: []} no catch interno), mas
      // mantemos o try externo por seguranca.
      const [resWeight, resBodyFat] = await Promise.all([
        readRecords('Weight', {
          timeRangeFilter,
          pageSize,
          ascendingOrder: true,
        }),
        readRecords('BodyFat', {
          timeRangeFilter,
          pageSize,
          ascendingOrder: true,
        }),
      ]);

      const pesos = resWeight.records as WeightRecordRaw[];
      const gorduras = resBodyFat.records as BodyFatRecordRaw[];

      if (pesos.length === 0 && gorduras.length === 0) {
        return { novos: 0, erro: null };
      }

      // Barreira do dia em curso: descarta records do dia atual. So
      // dias completos (D-1 e anteriores) entram.
      const barreira = startOfTodayLocal(now);

      const porDia = new Map<string, AcumuladorDia>();

      for (const r of pesos) {
        const kg = r.weight?.inKilograms;
        if (typeof kg !== 'number' || !Number.isFinite(kg) || kg <= 0) {
          continue;
        }
        const dataLocal = dataValidaOuNull(r.time, barreira);
        if (!dataLocal) continue;
        const ts = new Date(r.time as string).getTime();
        const acc = porDia.get(dataLocal) ?? {};
        // Fica o peso de maior `time` no dia (snapshot mais recente).
        if (acc.pesoEm === undefined || ts >= acc.pesoEm) {
          acc.peso = kg;
          acc.pesoEm = ts;
        }
        porDia.set(dataLocal, acc);
      }

      for (const r of gorduras) {
        const pct = r.percentage;
        if (
          typeof pct !== 'number' ||
          !Number.isFinite(pct) ||
          pct < 0 ||
          pct > 100
        ) {
          continue;
        }
        const dataLocal = dataValidaOuNull(r.time, barreira);
        if (!dataLocal) continue;
        const ts = new Date(r.time as string).getTime();
        const acc = porDia.get(dataLocal) ?? {};
        if (acc.gorduraEm === undefined || ts >= acc.gorduraEm) {
          acc.gordura = pct;
          acc.gorduraEm = ts;
        }
        porDia.set(dataLocal, acc);
      }

      if (porDia.size === 0) {
        return { novos: 0, erro: null };
      }

      const autor = lerPessoaAtiva();

      // Ordena por data ascendente pra escrita previsivel (logs/testes).
      const dias = Array.from(porDia.entries()).sort((a, b) =>
        a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
      );

      let escritos = 0;
      for (const [data, acc] of dias) {
        // So escreve dia que tem ao menos uma medida (peso ou gordura).
        // MedidasSchema exige campos opcionais mas o registro precisa
        // fazer sentido; o acumulador so existe se passou pelos filtros.
        if (acc.peso === undefined && acc.gordura === undefined) continue;
        const meta: Medida = {
          tipo: 'medidas',
          data,
          autor,
          fotos: [],
          ...(acc.peso !== undefined ? { peso: acc.peso } : {}),
          ...(acc.gordura !== undefined ? { gordura: acc.gordura } : {}),
        };
        await escreverMedida(vaultRoot, meta);
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
