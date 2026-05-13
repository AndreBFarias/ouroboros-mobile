// Sync read+write entre Vault local e Health Connect (Q17.b, Onda Q
// 2026-05-13). Funcoes puras isoladas do modulo nativo via require
// lazy: caller que tentar usar em ambiente sem suporte recebe lista
// vazia / no-op silente, sem crashar o bundle.
//
// Mapeamento canonico:
//   TreinoSessao (Mobile) ↔ ExerciseSessionRecord (HC)
//   MedidaSnapshot (Mobile) ↔ WeightRecord + BodyFatRecord (HC)
//   RegistroCiclo (Mobile, fase=menstrual) ↔ MenstruationFlowRecord (HC)
//
// Exercicios HC nao tem mapping 1:1 com nossa rotina/serie/reps —
// gravamos apenas a sessao agregada (start/end + titulo). Detalhes
// (carga, reps por exercicio) ficam no .md local; ExerciseSession HC
// e' apenas marca temporal pra outros consumidores verem.
//
// Comentarios sem acento (convencao shell/CI).
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

interface HealthConnectModule {
  readRecords: (recordType: string, options: unknown) => Promise<{ records: unknown[] }>;
  insertRecords: (records: unknown[]) => Promise<string[]>;
}

function carregarModulo(): HealthConnectModule | null {
  try {
    const mod = require('react-native-health-connect') as Partial<HealthConnectModule>;
    if (
      typeof mod.readRecords !== 'function' ||
      typeof mod.insertRecords !== 'function'
    ) {
      return null;
    }
    return mod as HealthConnectModule;
  } catch {
    return null;
  }
}

// Tipos resumidos do HC pra consumo na UI sem expor o shape completo
// do SDK. Mantem o componente desacoplado da versao do pacote.
export interface RegistroExternoHC {
  uuid: string;
  tipo: 'exercise' | 'steps' | 'weight' | 'heart_rate' | 'sleep' | 'menstruation';
  inicio: string;
  fim: string;
  rotulo: string;
  valor?: number;
}

interface ExerciseSessionRecordReadResult {
  metadata?: { id?: string; dataOrigin?: string; clientRecordId?: string };
  startTime?: string;
  endTime?: string;
  title?: string;
  notes?: string;
  exerciseType?: number;
}

interface StepsRecordReadResult {
  metadata?: { id?: string };
  startTime?: string;
  endTime?: string;
  count?: number;
}

interface WeightRecordReadResult {
  metadata?: { id?: string };
  time?: string;
  weight?: { inKilograms?: number };
}

// Le ExerciseSessions de outros apps registrados em HC nos ultimos
// `dias`. Retorna array vazio se SDK indisponivel.
export async function sincronizarTreinosDeHC(
  dias: number = 30
): Promise<RegistroExternoHC[]> {
  const mod = carregarModulo();
  if (!mod) return [];
  const ate = new Date();
  const desde = new Date(ate.getTime() - dias * 24 * 60 * 60 * 1000);
  try {
    const res = await mod.readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: desde.toISOString(),
        endTime: ate.toISOString(),
      },
      ascendingOrder: false,
    });
    return res.records
      .map((raw): RegistroExternoHC | null => {
        const r = raw as ExerciseSessionRecordReadResult;
        if (!r.startTime || !r.endTime) return null;
        return {
          uuid: r.metadata?.id ?? `${r.startTime}-${r.endTime}`,
          tipo: 'exercise',
          inicio: r.startTime,
          fim: r.endTime,
          rotulo: r.title ?? r.notes ?? 'Treino externo',
        };
      })
      .filter((r): r is RegistroExternoHC => r !== null);
  } catch {
    return [];
  }
}

// Le contagem de passos agregada diaria dos ultimos N dias.
export async function sincronizarPassosDeHC(
  dias: number = 7
): Promise<RegistroExternoHC[]> {
  const mod = carregarModulo();
  if (!mod) return [];
  const ate = new Date();
  const desde = new Date(ate.getTime() - dias * 24 * 60 * 60 * 1000);
  try {
    const res = await mod.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: desde.toISOString(),
        endTime: ate.toISOString(),
      },
    });
    return res.records
      .map((raw): RegistroExternoHC | null => {
        const r = raw as StepsRecordReadResult;
        if (!r.startTime || !r.endTime) return null;
        return {
          uuid: r.metadata?.id ?? `${r.startTime}-steps`,
          tipo: 'steps',
          inicio: r.startTime,
          fim: r.endTime,
          rotulo: `${r.count ?? 0} passos`,
          valor: r.count,
        };
      })
      .filter((r): r is RegistroExternoHC => r !== null);
  } catch {
    return [];
  }
}

// Le os pesos registrados em HC. Util pra Saude Fisica → Evolucao.
export async function sincronizarPesoDeHC(
  dias: number = 90
): Promise<RegistroExternoHC[]> {
  const mod = carregarModulo();
  if (!mod) return [];
  const ate = new Date();
  const desde = new Date(ate.getTime() - dias * 24 * 60 * 60 * 1000);
  try {
    const res = await mod.readRecords('Weight', {
      timeRangeFilter: {
        operator: 'between',
        startTime: desde.toISOString(),
        endTime: ate.toISOString(),
      },
    });
    return res.records
      .map((raw): RegistroExternoHC | null => {
        const r = raw as WeightRecordReadResult;
        if (!r.time) return null;
        const kg = r.weight?.inKilograms;
        return {
          uuid: r.metadata?.id ?? `${r.time}-weight`,
          tipo: 'weight',
          inicio: r.time,
          fim: r.time,
          rotulo: kg !== undefined ? `${kg.toFixed(1)} kg` : 'Peso',
          valor: kg,
        };
      })
      .filter((r): r is RegistroExternoHC => r !== null);
  } catch {
    return [];
  }
}

// Escreve TreinoSessao do Vault em HC como ExerciseSessionRecord.
// Best-effort: se HC indisponivel ou save falhar, nao propaga erro
// para o caller (o save no Vault ja aconteceu). Retorna true em
// sucesso, false em qualquer falha.
//
// exerciseType=2 (BODY_WEIGHT_WORKOUT) e' o fallback generico do HC
// quando nao sabemos o tipo especifico (running, cycling, etc.).
const HC_EXERCISE_TYPE_GENERIC = 2;

export async function escreverTreinoEmHC(
  meta: TreinoSessao
): Promise<boolean> {
  const mod = carregarModulo();
  if (!mod) return false;
  try {
    const fim = new Date(meta.data);
    const duracaoMin = Math.max(1, meta.duracao_min);
    const inicio = new Date(fim.getTime() - duracaoMin * 60_000);
    await mod.insertRecords([
      {
        recordType: 'ExerciseSession',
        startTime: inicio.toISOString(),
        endTime: fim.toISOString(),
        exerciseType: HC_EXERCISE_TYPE_GENERIC,
        title: meta.rotina ?? 'Treino Ouroboros',
        notes: meta.observacoes ?? undefined,
      },
    ]);
    return true;
  } catch {
    return false;
  }
}

// Escreve um peso pontual em HC como WeightRecord. Best-effort.
// `kg` deve estar em kilogramas. Caller (saveMedida) chama apos save
// local bem-sucedido.
export async function escreverPesoEmHC(
  kg: number,
  data: Date = new Date()
): Promise<boolean> {
  if (!Number.isFinite(kg) || kg <= 0) return false;
  const mod = carregarModulo();
  if (!mod) return false;
  try {
    await mod.insertRecords([
      {
        recordType: 'Weight',
        time: data.toISOString(),
        weight: { value: kg, unit: 'kilograms' },
      },
    ]);
    return true;
  } catch {
    return false;
  }
}

// Escreve percentual de gordura em HC como BodyFatRecord.
// `percentage` em escala 0-100 (sera enviado como float).
export async function escreverBodyFatEmHC(
  percentage: number,
  data: Date = new Date()
): Promise<boolean> {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return false;
  }
  const mod = carregarModulo();
  if (!mod) return false;
  try {
    await mod.insertRecords([
      {
        recordType: 'BodyFat',
        time: data.toISOString(),
        percentage,
      },
    ]);
    return true;
  } catch {
    return false;
  }
}

// Escreve um registro de fluxo menstrual em HC (Q17.d para Ciclo).
// flow=1 (light), 2 (medium), 3 (heavy). Default 2 quando o Vault
// nao especifica intensidade.
const HC_FLOW_DEFAULT = 2;

export async function escreverMenstruacaoEmHC(
  data: Date,
  intensidade: 1 | 2 | 3 = HC_FLOW_DEFAULT
): Promise<boolean> {
  const mod = carregarModulo();
  if (!mod) return false;
  try {
    await mod.insertRecords([
      {
        recordType: 'MenstruationFlow',
        time: data.toISOString(),
        flow: intensidade,
      },
    ]);
    return true;
  } catch {
    return false;
  }
}
