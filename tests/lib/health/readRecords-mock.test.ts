// Testes da funcao readRecords do bridge JS (modules/health-connect/src/index.ts).
// R-INT-3-HC-BRIDGE-NATIVA sub-sprint B.
//
// Estrategia: mocka expo-modules-core para que requireOptionalNativeModule
// devolva nosso fake NativeModuleShape. Isso isola o teste do binding nativo
// real (que so existe em Android com prebuild). Cobre:
//
//   1. Shape dos 7 tipos canonicos (Steps, ExerciseSession, Weight, BodyFat,
//      HeartRate, SleepSession, MenstruationFlow).
//   2. Fallback no-op em Platform.OS !== 'android' (modulo nativo nulo).
//   3. Tratamento de erro silencioso (rejeicao do nativo nao propaga).
//   4. Propagacao de pageToken entrada/saida (paginacao).
//
// Convencao: comentarios sem acento (shell/CI).

beforeEach(() => {
  jest.resetModules();
});

// Helper: configura mocks para o teste rodar como se fosse Android com
// modulo nativo presente. Retorna o fake para o teste verificar chamadas.
//
// Por que mexer em Platform.OS: no ambiente jest do projeto, Platform.OS
// e 'ios' por default. A bridge JS so consulta o modulo nativo se
// Platform.OS === 'android' — entao precisamos forcar 'android' para
// exercitar o caminho com modulo presente. Para o cenario no-op (sem
// modulo nativo) basta nao mexer em Platform — o ios default ja faz o
// fallback retornar null.
//
// Mutamos a propriedade `OS` direto na Platform do require em vez de
// mockar o modulo react-native inteiro (que esbarra em jest mocks de
// FlatList/ActivityIndicator com property assign protegida).
function setupMockNative(native: Record<string, unknown> | null) {
  const RN = require('react-native');
  Object.defineProperty(RN.Platform, 'OS', {
    configurable: true,
    get: () => 'android',
  });
  jest.doMock('expo-modules-core', () => {
    const real = jest.requireActual('expo-modules-core');
    return {
      ...real,
      requireOptionalNativeModule: jest.fn(() => native),
    };
  });
  return native;
}

// Restaura Platform.OS apos cada teste para nao vazar 'android' em
// outros arquivos do worker.
afterEach(() => {
  const RN = require('react-native');
  Object.defineProperty(RN.Platform, 'OS', {
    configurable: true,
    get: () => 'ios',
  });
});

const TIME_RANGE = {
  operator: 'between' as const,
  startTime: '2026-05-22T00:00:00-03:00',
  endTime: '2026-05-22T23:59:59-03:00',
};

describe('readRecords — fallback no-op', () => {
  it('devolve { records: [] } quando modulo nativo e null (web/iOS/Expo Go)', async () => {
    setupMockNative(null);
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('Steps', { timeRangeFilter: TIME_RANGE });
    expect(result).toEqual({ records: [] });
  });

  it('devolve { records: [] } quando nativo lanca excecao', async () => {
    setupMockNative({
      readRecords: jest.fn().mockRejectedValue(new Error('boom')),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('Steps', { timeRangeFilter: TIME_RANGE });
    expect(result).toEqual({ records: [] });
  });

  it('normaliza records ausente para []', async () => {
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: undefined }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('Steps', { timeRangeFilter: TIME_RANGE });
    expect(result.records).toEqual([]);
  });
});

describe('readRecords — shape por tipo canonico', () => {
  it('Steps: { startTime, endTime, count, metadata }', async () => {
    const sample = {
      startTime: '2026-05-22T07:00:00Z',
      endTime: '2026-05-22T08:00:00Z',
      count: 1234,
      metadata: {
        id: 'uuid-steps-1',
        dataOrigin: { packageName: 'com.google.android.apps.fitness' },
        lastModifiedTime: '2026-05-22T08:00:01Z',
      },
    };
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: [sample] }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('Steps', { timeRangeFilter: TIME_RANGE });
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      startTime: '2026-05-22T07:00:00Z',
      endTime: '2026-05-22T08:00:00Z',
      count: 1234,
    });
    expect((result.records[0] as { metadata: { id: string } }).metadata.id).toBe(
      'uuid-steps-1'
    );
  });

  it('ExerciseSession: { startTime, endTime, exerciseType, title, notes, metadata }', async () => {
    const sample = {
      startTime: '2026-05-22T18:00:00Z',
      endTime: '2026-05-22T18:45:00Z',
      exerciseType: 56,
      title: 'Treino A',
      notes: 'Supino + agachamento',
      metadata: {
        id: 'uuid-exercise-1',
        dataOrigin: { packageName: 'com.ouroboros.mobile' },
        lastModifiedTime: '2026-05-22T18:45:01Z',
      },
    };
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: [sample] }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('ExerciseSession', {
      timeRangeFilter: TIME_RANGE,
    });
    expect(result.records[0]).toMatchObject({
      startTime: '2026-05-22T18:00:00Z',
      endTime: '2026-05-22T18:45:00Z',
      exerciseType: 56,
      title: 'Treino A',
      notes: 'Supino + agachamento',
    });
  });

  it('Weight: { time, weight.inKilograms, metadata }', async () => {
    const sample = {
      time: '2026-05-22T07:00:00Z',
      weight: { inKilograms: 75.5 },
      metadata: {
        id: 'uuid-weight-1',
        dataOrigin: { packageName: 'com.ouroboros.mobile' },
        lastModifiedTime: '2026-05-22T07:00:01Z',
      },
    };
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: [sample] }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('Weight', { timeRangeFilter: TIME_RANGE });
    expect(result.records[0]).toMatchObject({
      time: '2026-05-22T07:00:00Z',
      weight: { inKilograms: 75.5 },
    });
  });

  it('BodyFat: { time, percentage, metadata }', async () => {
    const sample = {
      time: '2026-05-22T07:00:00Z',
      percentage: 22.4,
      metadata: {
        id: 'uuid-bodyfat-1',
        dataOrigin: { packageName: 'com.ouroboros.mobile' },
        lastModifiedTime: '2026-05-22T07:00:01Z',
      },
    };
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: [sample] }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('BodyFat', { timeRangeFilter: TIME_RANGE });
    expect(result.records[0]).toMatchObject({
      time: '2026-05-22T07:00:00Z',
      percentage: 22.4,
    });
  });

  it('HeartRate: { startTime, endTime, samples: [{time, beatsPerMinute}], metadata }', async () => {
    const sample = {
      startTime: '2026-05-22T07:00:00Z',
      endTime: '2026-05-22T07:01:00Z',
      samples: [
        { time: '2026-05-22T07:00:30Z', beatsPerMinute: 72 },
        { time: '2026-05-22T07:00:45Z', beatsPerMinute: 74 },
      ],
      metadata: {
        id: 'uuid-hr-1',
        dataOrigin: { packageName: 'com.google.android.apps.healthdata' },
        lastModifiedTime: '2026-05-22T07:01:01Z',
      },
    };
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: [sample] }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('HeartRate', {
      timeRangeFilter: TIME_RANGE,
    });
    expect(result.records[0]).toMatchObject({
      startTime: '2026-05-22T07:00:00Z',
      endTime: '2026-05-22T07:01:00Z',
    });
    expect(
      (result.records[0] as { samples: Array<{ beatsPerMinute: number }> })
        .samples
    ).toHaveLength(2);
  });

  it('SleepSession: { startTime, endTime, title, stages, metadata }', async () => {
    const sample = {
      startTime: '2026-05-21T23:00:00Z',
      endTime: '2026-05-22T07:00:00Z',
      title: 'Sono noturno',
      notes: null,
      stages: [
        {
          startTime: '2026-05-21T23:00:00Z',
          endTime: '2026-05-22T00:30:00Z',
          stage: 4, // STAGE_TYPE_LIGHT
        },
        {
          startTime: '2026-05-22T00:30:00Z',
          endTime: '2026-05-22T02:00:00Z',
          stage: 5, // STAGE_TYPE_DEEP
        },
      ],
      metadata: {
        id: 'uuid-sleep-1',
        dataOrigin: { packageName: 'com.google.android.apps.healthdata' },
        lastModifiedTime: '2026-05-22T07:00:01Z',
      },
    };
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: [sample] }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('SleepSession', {
      timeRangeFilter: TIME_RANGE,
    });
    expect(result.records[0]).toMatchObject({
      startTime: '2026-05-21T23:00:00Z',
      title: 'Sono noturno',
    });
    expect(
      (result.records[0] as { stages: Array<{ stage: number }> }).stages
    ).toHaveLength(2);
  });

  it('MenstruationFlow: { time, flow, metadata }', async () => {
    const sample = {
      time: '2026-05-22T08:00:00Z',
      flow: 2, // FLOW_MEDIUM
      metadata: {
        id: 'uuid-menst-1',
        dataOrigin: { packageName: 'com.ouroboros.mobile' },
        lastModifiedTime: '2026-05-22T08:00:01Z',
      },
    };
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: [sample] }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('MenstruationFlow', {
      timeRangeFilter: TIME_RANGE,
    });
    expect(result.records[0]).toMatchObject({
      time: '2026-05-22T08:00:00Z',
      flow: 2,
    });
  });
});

describe('readRecords — paginacao', () => {
  it('propaga pageToken de saida quando nativo retorna', async () => {
    setupMockNative({
      readRecords: jest
        .fn()
        .mockResolvedValue({ records: [], pageToken: 'token-pagina-2' }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('Steps', { timeRangeFilter: TIME_RANGE });
    expect(result.pageToken).toBe('token-pagina-2');
  });

  it('passa pageToken de entrada via options para o nativo', async () => {
    const spy = jest.fn().mockResolvedValue({ records: [] });
    setupMockNative({ readRecords: spy });
    const { readRecords } = require('../../../modules/health-connect/src');
    await readRecords('Steps', {
      timeRangeFilter: TIME_RANGE,
      pageSize: 100,
      pageToken: 'token-pagina-1',
      ascendingOrder: false,
    });
    expect(spy).toHaveBeenCalledWith('Steps', {
      timeRangeFilter: TIME_RANGE,
      pageSize: 100,
      pageToken: 'token-pagina-1',
      ascendingOrder: false,
    });
  });

  it('omite pageToken quando nativo nao retorna (ultima pagina)', async () => {
    setupMockNative({
      readRecords: jest.fn().mockResolvedValue({ records: [] }),
    });
    const { readRecords } = require('../../../modules/health-connect/src');
    const result = await readRecords('Steps', { timeRangeFilter: TIME_RANGE });
    expect(result.pageToken).toBeUndefined();
  });
});

describe('readRecords — default export', () => {
  it('readRecords disponivel no default export', () => {
    setupMockNative(null);
    const mod = require('../../../modules/health-connect/src');
    expect(typeof mod.default.readRecords).toBe('function');
  });
});
