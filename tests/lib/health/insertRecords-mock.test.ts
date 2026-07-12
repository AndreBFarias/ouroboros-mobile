// Testes da funcao insertRecords do bridge JS (modules/health-connect/src/index.ts).
// R-INT-3-HC-BRIDGE-NATIVA sub-sprint C.
//
// Estrategia: espelha o padrao usado em readRecords-mock.test.ts.
// Mocka expo-modules-core para que requireOptionalNativeModule devolva
// nosso fake NativeModuleShape. Cobre:
//
//   1. Fallback no-op em Platform.OS !== 'android' (modulo nativo nulo).
//   2. Tratamento de erro silencioso (rejeicao do nativo nao propaga).
//   3. Passthrough do recordIdsList retornado pelo nativo.
//   4. Shape correto enviado ao native para os 4 tipos canonicos
//      (ExerciseSession, Weight, BodyFat, MenstruationFlow).
//   5. Default export expoe insertRecords.
//
// Convencao: comentarios sem acento (shell/CI).

beforeEach(() => {
  jest.resetModules();
});

// Helper: configura mocks como em readRecords-mock.test.ts. Por que
// mexer em Platform.OS: ambiente Jest do projeto roda como 'ios' por
// default; a bridge so consulta o nativo se 'android'. Mutamos a
// propriedade OS direto sem mockar react-native inteiro.
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

// Restaura Platform.OS apos cada teste pra nao vazar 'android' em outros
// arquivos do worker.
afterEach(() => {
  const RN = require('react-native');
  Object.defineProperty(RN.Platform, 'OS', {
    configurable: true,
    get: () => 'ios',
  });
});

describe('insertRecords — fallback no-op', () => {
  it('devolve [] quando modulo nativo e null (web/iOS/Expo Go)', async () => {
    setupMockNative(null);
    const { insertRecords } = require('../../../modules/health-connect/src');
    const result = await insertRecords([
      {
        recordType: 'Weight',
        time: '2026-05-22T07:00:00Z',
        weight: { value: 75.5, unit: 'kilograms' },
      },
    ]);
    expect(result).toEqual([]);
  });

  it('devolve [] quando nativo lanca excecao', async () => {
    setupMockNative({
      insertRecords: jest.fn().mockRejectedValue(new Error('boom')),
    });
    const { insertRecords } = require('../../../modules/health-connect/src');
    const result = await insertRecords([
      {
        recordType: 'Weight',
        time: '2026-05-22T07:00:00Z',
        weight: { value: 75.5, unit: 'kilograms' },
      },
    ]);
    expect(result).toEqual([]);
  });

  it('normaliza retorno nao-array do nativo para []', async () => {
    setupMockNative({
      insertRecords: jest.fn().mockResolvedValue(undefined),
    });
    const { insertRecords } = require('../../../modules/health-connect/src');
    const result = await insertRecords([
      {
        recordType: 'Weight',
        time: '2026-05-22T07:00:00Z',
        weight: { value: 75.5, unit: 'kilograms' },
      },
    ]);
    expect(result).toEqual([]);
  });
});

describe('insertRecords — shape por tipo canonico', () => {
  it('Weight: passa shape { time, weight: { value, unit } } sem mutacao', async () => {
    const spy = jest.fn().mockResolvedValue(['id-weight-1']);
    setupMockNative({ insertRecords: spy });
    const { insertRecords } = require('../../../modules/health-connect/src');
    const payload = [
      {
        recordType: 'Weight' as const,
        time: '2026-05-22T07:00:00Z',
        weight: { value: 75.5, unit: 'kilograms' as const },
      },
    ];
    const result = await insertRecords(payload);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(payload);
    expect(result).toEqual(['id-weight-1']);
  });

  it('BodyFat: passa shape { time, percentage } sem mutacao', async () => {
    const spy = jest.fn().mockResolvedValue(['id-bodyfat-1']);
    setupMockNative({ insertRecords: spy });
    const { insertRecords } = require('../../../modules/health-connect/src');
    const payload = [
      {
        recordType: 'BodyFat' as const,
        time: '2026-05-22T07:00:00Z',
        percentage: 22.4,
      },
    ];
    const result = await insertRecords(payload);
    expect(spy).toHaveBeenCalledWith(payload);
    expect(result).toEqual(['id-bodyfat-1']);
  });

  it('ExerciseSession: passa shape { startTime, endTime, exerciseType, title, notes }', async () => {
    const spy = jest.fn().mockResolvedValue(['id-exercise-1']);
    setupMockNative({ insertRecords: spy });
    const { insertRecords } = require('../../../modules/health-connect/src');
    const payload = [
      {
        recordType: 'ExerciseSession' as const,
        startTime: '2026-05-22T18:00:00Z',
        endTime: '2026-05-22T18:45:00Z',
        exerciseType: 2, // BODY_WEIGHT_WORKOUT generic
        title: 'Treino Ouroboros',
        notes: 'Supino + agachamento',
      },
    ];
    const result = await insertRecords(payload);
    expect(spy).toHaveBeenCalledWith(payload);
    expect(result).toEqual(['id-exercise-1']);
  });

  it('MenstruationFlow: passa shape { time, flow } sem mutacao', async () => {
    const spy = jest.fn().mockResolvedValue(['id-menst-1']);
    setupMockNative({ insertRecords: spy });
    const { insertRecords } = require('../../../modules/health-connect/src');
    const payload = [
      {
        recordType: 'MenstruationFlow' as const,
        time: '2026-05-22T08:00:00Z',
        flow: 2 as const, // FLOW_MEDIUM
      },
    ];
    const result = await insertRecords(payload);
    expect(spy).toHaveBeenCalledWith(payload);
    expect(result).toEqual(['id-menst-1']);
  });
});

describe('insertRecords — passthrough do retorno', () => {
  it('propaga recordIdsList do nativo na ordem original', async () => {
    setupMockNative({
      insertRecords: jest
        .fn()
        .mockResolvedValue(['id-1', 'id-2', 'id-3']),
    });
    const { insertRecords } = require('../../../modules/health-connect/src');
    const result = await insertRecords([
      {
        recordType: 'Weight',
        time: '2026-05-22T07:00:00Z',
        weight: { value: 75.5, unit: 'kilograms' },
      },
      {
        recordType: 'BodyFat',
        time: '2026-05-22T07:01:00Z',
        percentage: 22.4,
      },
      {
        recordType: 'MenstruationFlow',
        time: '2026-05-22T08:00:00Z',
        flow: 2,
      },
    ]);
    expect(result).toEqual(['id-1', 'id-2', 'id-3']);
  });

  it('aceita array vazio e passa adiante ao nativo', async () => {
    const spy = jest.fn().mockResolvedValue([]);
    setupMockNative({ insertRecords: spy });
    const { insertRecords } = require('../../../modules/health-connect/src');
    const result = await insertRecords([]);
    expect(spy).toHaveBeenCalledWith([]);
    expect(result).toEqual([]);
  });
});

describe('insertRecords — default export', () => {
  it('insertRecords disponivel no default export', () => {
    setupMockNative(null);
    const mod = require('../../../modules/health-connect/src');
    expect(typeof mod.default.insertRecords).toBe('function');
  });
});
