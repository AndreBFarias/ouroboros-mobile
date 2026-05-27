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
// R-INT-3 (2026-05-16): callers `escreverXXXEmHC` continuam retornando
// boolean (backward-compat), mas agora emitem `HCSyncFailEvent` via
// `emitHCSyncFail` em qualquer falha (no_module, permission_denied,
// api_error). UI subscreve via useHCToast e exibe toast EXPLICITO.
// Padrao T1B3 (AUDIT-T1B3): catch silencioso vira observavel.
// `console.log` em cada save documenta sucesso/falha pra debug live.
//
// Comentarios sem acento (convencao shell/CI).
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';
import {
  emitHCSyncFail,
  mensagemCanonica,
  type HCSyncMotivo,
  type HCSyncTipo,
} from '@/lib/health/eventBus';

interface HealthConnectModule {
  readRecords: (
    recordType: string,
    options: unknown
  ) => Promise<{ records: unknown[] }>;
  insertRecords: (records: unknown[]) => Promise<string[]>;
}

function carregarModulo(): HealthConnectModule | null {
  try {
    // Path relativo segue padrao do projeto (vide
    // src/lib/widget/atualizarWidgetHomescreen.ts importando
    // ../../../modules/widget-homescreen/src). Bridge nativa local
    // entregue em R-INT-3-HC-BRIDGE-NATIVA sub-sprints A+B+C; sub-sprint
    // D (esta) migra o require de react-native-health-connect@3.5.3
    // (pendurado em connect-client 1.1.0-alpha11 obsoleto). A bridge
    // local usa requireOptionalNativeModule, que devolve null em
    // ambiente sem suporte (Expo Go web, Jest, iOS) — sem Proxy
    // lancante. Mantemos o lazy require para preservar a forma de
    // mock em testes (jest.doMock por escopo).
    const mod = require('../../../modules/health-connect/src');
    const readRecords = mod?.readRecords;
    const insertRecords = mod?.insertRecords;
    if (
      typeof readRecords !== 'function' ||
      typeof insertRecords !== 'function'
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
  tipo:
    | 'exercise'
    | 'steps'
    | 'weight'
    | 'heart_rate'
    | 'sleep'
    | 'menstruation';
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

// R-INT-3: classifica erro lancado pelo modulo nativo HC em uma das
// 3 categorias canonicas. Mensagens com regex pra cobrir variacao
// entre versoes do connect-client subjacente (1.2.x atual via bridge
// local). Quando nao bate em pattern conhecido, cai em 'api_error'.
function classificarErroHC(erro: unknown): HCSyncMotivo {
  const msg =
    erro instanceof Error ? erro.message : typeof erro === 'string' ? erro : '';
  if (/permission|denied|unauthorized|SecurityException/i.test(msg)) {
    return 'permission_denied';
  }
  return 'api_error';
}

// R-INT-3: helper interno reusado pelas 4 funcoes de write. Centraliza
// log de debug e emit de falha, mantendo o callsite de cada funcao
// limpo.
function reportarFalhaHC(
  tipo: HCSyncTipo,
  motivo: HCSyncMotivo,
  erro?: unknown
): false {
  const mensagem = mensagemCanonica(tipo, motivo);
  // Log de debug visivel em logcat / DevTools. Mantemos prefixo
  // canonico [hc-sync] pra facilitar grep durante validacao Nivel C.
  console.log(
    `[hc-sync] tipo=${tipo} status=fail motivo=${motivo} erro=${String(erro ?? '')}`
  );
  emitHCSyncFail({ tipo, motivo, mensagem, erro });
  return false;
}

function logSucessoHC(tipo: HCSyncTipo): void {
  console.log(`[hc-sync] tipo=${tipo} status=ok`);
}

// R-INT-3-HC-DEDUP: deriva um clientRecordId deterministico para cada
// write-back Vault->HC. O HC nao dedupa records por padrao; reinserir o
// mesmo dado (re-save de uma medida no mesmo dia, re-sync de um treino)
// duplicaria sem isto. Records com mesmo (packageName, clientRecordId)
// sao tratados pelo HC como o MESMO record -> upsert.
//
// Estabilidade: cada writer monta a chave a partir do timestamp canonico
// do dado no Vault. Medidas e ciclo nascem com granularidade de dia
// (caller normaliza para T12:00:00Z, ver medidas.ts / ciclo.ts), entao
// re-save do mesmo dia gera o mesmo ISO -> mesmo id. Treino usa o instante
// de inicio (data da sessao menos duracao), estavel para a mesma sessao.
//
// Prefixo por tipo so para legibilidade em debug; o HC ja escopa o
// clientRecordId por recordType, entao nao ha colisao entre tipos.
const HC_CLIENT_ID_PREFIX = 'ouroboros';

function derivarClientRecordId(tipo: string, isoTimestamp: string): string {
  return `${HC_CLIENT_ID_PREFIX}-${tipo}-${isoTimestamp}`;
}

// Escreve TreinoSessao do Vault em HC como ExerciseSessionRecord.
// Best-effort: se HC indisponivel ou save falhar, nao propaga erro
// para o caller (o save no Vault ja aconteceu). Retorna true em
// sucesso, false em qualquer falha — e emite HCSyncFailEvent no
// caso de falha pra que a UI mostre toast (R-INT-3, padrao T1B3).
//
// exerciseType=2 (BODY_WEIGHT_WORKOUT) e' o fallback generico do HC
// quando nao sabemos o tipo especifico (running, cycling, etc.).
const HC_EXERCISE_TYPE_GENERIC = 2;

export async function escreverTreinoEmHC(meta: TreinoSessao): Promise<boolean> {
  const mod = carregarModulo();
  if (!mod) return reportarFalhaHC('treino', 'no_module');
  try {
    const fim = new Date(meta.data);
    const duracaoMin = Math.max(1, meta.duracao_min);
    const inicio = new Date(fim.getTime() - duracaoMin * 60_000);
    const inicioIso = inicio.toISOString();
    await mod.insertRecords([
      {
        recordType: 'ExerciseSession',
        startTime: inicioIso,
        endTime: fim.toISOString(),
        exerciseType: HC_EXERCISE_TYPE_GENERIC,
        title: meta.rotina ?? 'Treino Ouroboros',
        notes: meta.observacoes ?? undefined,
        // Dedup: chave estavel pelo instante de inicio da sessao. Mesma
        // sessao (mesmo meta.data + duracao) -> mesmo id -> upsert no HC.
        clientRecordId: derivarClientRecordId('treino', inicioIso),
      },
    ]);
    logSucessoHC('treino');
    return true;
  } catch (erro) {
    return reportarFalhaHC('treino', classificarErroHC(erro), erro);
  }
}

// Escreve um peso pontual em HC como WeightRecord. Best-effort.
// `kg` deve estar em kilogramas. Caller (saveMedida) chama apos save
// local bem-sucedido.
export async function escreverPesoEmHC(
  kg: number,
  data: Date = new Date()
): Promise<boolean> {
  // Validacao de input: nao emite evento HC (input invalido nao e' falha
  // de sync, e' bug no caller — saveTreino ja filtra typeof === 'number').
  if (!Number.isFinite(kg) || kg <= 0) return false;
  const mod = carregarModulo();
  if (!mod) return reportarFalhaHC('peso', 'no_module');
  try {
    const timeIso = data.toISOString();
    await mod.insertRecords([
      {
        recordType: 'Weight',
        time: timeIso,
        weight: { value: kg, unit: 'kilograms' },
        // Dedup: chave estavel pelo timestamp. Medidas nascem por dia
        // (caller normaliza para T12:00:00Z) -> re-save do mesmo dia
        // reusa o id -> upsert no HC em vez de duplicar.
        clientRecordId: derivarClientRecordId('peso', timeIso),
      },
    ]);
    logSucessoHC('peso');
    return true;
  } catch (erro) {
    return reportarFalhaHC('peso', classificarErroHC(erro), erro);
  }
}

// Escreve percentual de gordura em HC como BodyFatRecord.
// `percentage` em escala 0-100 (sera enviado como float).
export async function escreverBodyFatEmHC(
  percentage: number,
  data: Date = new Date()
): Promise<boolean> {
  // Validacao de input (bug do caller, nao falha de sync): sai silente.
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return false;
  }
  const mod = carregarModulo();
  if (!mod) return reportarFalhaHC('gordura', 'no_module');
  try {
    const timeIso = data.toISOString();
    await mod.insertRecords([
      {
        recordType: 'BodyFat',
        time: timeIso,
        percentage,
        // Dedup: chave estavel pelo timestamp (mesma logica do peso).
        clientRecordId: derivarClientRecordId('bodyfat', timeIso),
      },
    ]);
    logSucessoHC('gordura');
    return true;
  } catch (erro) {
    return reportarFalhaHC('gordura', classificarErroHC(erro), erro);
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
  if (!mod) return reportarFalhaHC('menstruacao', 'no_module');
  try {
    const timeIso = data.toISOString();
    await mod.insertRecords([
      {
        recordType: 'MenstruationFlow',
        time: timeIso,
        flow: intensidade,
        // Dedup: chave estavel pelo dia. Ciclo nasce por dia (caller
        // normaliza para T12:00:00Z) -> re-save do mesmo dia reusa o id.
        clientRecordId: derivarClientRecordId('menstruacao', timeIso),
      },
    ]);
    logSucessoHC('menstruacao');
    return true;
  } catch (erro) {
    return reportarFalhaHC('menstruacao', classificarErroHC(erro), erro);
  }
}
