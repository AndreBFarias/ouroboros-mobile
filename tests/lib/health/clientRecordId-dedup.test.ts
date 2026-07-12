// R-INT-3-HC-DEDUP: cobertura do clientRecordId deterministico nos
// write-backs Vault->HC (src/lib/health/sync.ts).
//
// O Health Connect nao dedupa records por padrao. Para evitar duplicar em
// re-saves, cada escreverXEmHC deriva um clientRecordId estavel do dado e
// o passa no payload de insertRecords. Estes testes asseguram:
//   1. Dois inserts do MESMO dado usam o MESMO clientRecordId (dedup).
//   2. Dados DIFERENTES (timestamps distintos) geram ids distintos.
//   3. O id e' nao-vazio e tem o prefixo canonico por tipo.
//
// Padrao de mock identico ao tests/lib/health/sync.test.ts: jest.doMock
// com { virtual: true } + jest.resetModules() por teste. Captura-se o mock
// de insertRecords e inspeciona-se o payload do primeiro argumento.
// (jest.doMock por escopo e' o pattern que funciona neste worktree; ver
// VALIDATOR_BRIEF A43/A44 sobre jest.mock hoisted vs doMock no SDK 56.)
//
// Comentarios sem acento (convencao shell/CI).

const TREINO_BASE = {
  tipo: 'treino_sessao' as const,
  data: '2026-04-23T18:00:00-03:00',
  autor: 'pessoa_a' as const,
  rotina: 'Rotina A',
  duracao_min: 28,
  exercicios: [{ nome: 'supino', series: 3, reps: 8, carga_kg: 4 }],
};

// Helper: monta o mock da bridge com insertRecords resolvendo OK e
// devolve a propria spy para inspecao do payload.
function mockBridge(): jest.Mock {
  const insertRecords = jest.fn().mockResolvedValue(['uuid-1']);
  jest.doMock(
    '../../../modules/health-connect/src',
    () => ({
      readRecords: jest.fn(),
      insertRecords,
    }),
    { virtual: true }
  );
  return insertRecords;
}

// Extrai o clientRecordId do unico record passado ao insertRecords.
function clientIdDaChamada(spy: jest.Mock): unknown {
  const payload = spy.mock.calls[0][0] as Array<Record<string, unknown>>;
  return payload[0].clientRecordId;
}

beforeEach(() => {
  jest.resetModules();
});

describe('escreverPesoEmHC — clientRecordId deterministico', () => {
  it('dois saves do mesmo peso/dia usam o mesmo clientRecordId', async () => {
    const data = new Date('2026-05-20T12:00:00.000Z');

    const spy1 = mockBridge();
    let mod = require('@/lib/health/sync');
    await mod.escreverPesoEmHC(70.5, data);
    const id1 = clientIdDaChamada(spy1);

    jest.resetModules();
    const spy2 = mockBridge();
    mod = require('@/lib/health/sync');
    await mod.escreverPesoEmHC(70.5, new Date('2026-05-20T12:00:00.000Z'));
    const id2 = clientIdDaChamada(spy2);

    expect(typeof id1).toBe('string');
    expect(id1).not.toBe('');
    expect(id1).toBe(id2);
    expect(id1).toBe('ouroboros-peso-2026-05-20T12:00:00.000Z');
  });

  it('pesos em dias diferentes geram clientRecordIds distintos', async () => {
    const spy1 = mockBridge();
    let mod = require('@/lib/health/sync');
    await mod.escreverPesoEmHC(70.5, new Date('2026-05-20T12:00:00.000Z'));
    const id1 = clientIdDaChamada(spy1);

    jest.resetModules();
    const spy2 = mockBridge();
    mod = require('@/lib/health/sync');
    await mod.escreverPesoEmHC(70.5, new Date('2026-05-21T12:00:00.000Z'));
    const id2 = clientIdDaChamada(spy2);

    expect(id1).not.toBe(id2);
  });
});

describe('escreverBodyFatEmHC — clientRecordId deterministico', () => {
  it('dois saves da mesma gordura/dia usam o mesmo clientRecordId', async () => {
    const spy1 = mockBridge();
    let mod = require('@/lib/health/sync');
    await mod.escreverBodyFatEmHC(18.5, new Date('2026-05-20T12:00:00.000Z'));
    const id1 = clientIdDaChamada(spy1);

    jest.resetModules();
    const spy2 = mockBridge();
    mod = require('@/lib/health/sync');
    await mod.escreverBodyFatEmHC(18.5, new Date('2026-05-20T12:00:00.000Z'));
    const id2 = clientIdDaChamada(spy2);

    expect(id1).toBe(id2);
    expect(id1).toBe('ouroboros-bodyfat-2026-05-20T12:00:00.000Z');
  });

  it('id de gordura difere do id de peso no mesmo timestamp', async () => {
    const data = new Date('2026-05-20T12:00:00.000Z');

    const spyPeso = mockBridge();
    let mod = require('@/lib/health/sync');
    await mod.escreverPesoEmHC(70.5, data);
    const idPeso = clientIdDaChamada(spyPeso);

    jest.resetModules();
    const spyGordura = mockBridge();
    mod = require('@/lib/health/sync');
    await mod.escreverBodyFatEmHC(18.5, new Date('2026-05-20T12:00:00.000Z'));
    const idGordura = clientIdDaChamada(spyGordura);

    // Prefixo por tipo evita confusao em debug, mesmo que o HC ja escope
    // por recordType.
    expect(idPeso).not.toBe(idGordura);
  });
});

describe('escreverMenstruacaoEmHC — clientRecordId deterministico', () => {
  it('dois saves do mesmo dia usam o mesmo clientRecordId', async () => {
    const spy1 = mockBridge();
    let mod = require('@/lib/health/sync');
    await mod.escreverMenstruacaoEmHC(new Date('2026-05-20T12:00:00.000Z'), 2);
    const id1 = clientIdDaChamada(spy1);

    jest.resetModules();
    const spy2 = mockBridge();
    mod = require('@/lib/health/sync');
    await mod.escreverMenstruacaoEmHC(new Date('2026-05-20T12:00:00.000Z'), 2);
    const id2 = clientIdDaChamada(spy2);

    expect(id1).toBe(id2);
    expect(id1).toBe('ouroboros-menstruacao-2026-05-20T12:00:00.000Z');
  });
});

describe('escreverTreinoEmHC — clientRecordId deterministico', () => {
  it('dois saves da mesma sessao usam o mesmo clientRecordId', async () => {
    const spy1 = mockBridge();
    let mod = require('@/lib/health/sync');
    await mod.escreverTreinoEmHC(TREINO_BASE);
    const id1 = clientIdDaChamada(spy1);

    jest.resetModules();
    const spy2 = mockBridge();
    mod = require('@/lib/health/sync');
    await mod.escreverTreinoEmHC({ ...TREINO_BASE });
    const id2 = clientIdDaChamada(spy2);

    expect(typeof id1).toBe('string');
    expect(id1).not.toBe('');
    expect(id1).toBe(id2);
    // inicio = data (2026-04-23T21:00:00Z) menos 28min = 20:32:00.000Z.
    expect(id1).toBe('ouroboros-treino-2026-04-23T20:32:00.000Z');
  });

  it('sessoes em horarios diferentes geram ids distintos', async () => {
    const spy1 = mockBridge();
    let mod = require('@/lib/health/sync');
    await mod.escreverTreinoEmHC(TREINO_BASE);
    const id1 = clientIdDaChamada(spy1);

    jest.resetModules();
    const spy2 = mockBridge();
    mod = require('@/lib/health/sync');
    await mod.escreverTreinoEmHC({
      ...TREINO_BASE,
      data: '2026-04-24T18:00:00-03:00',
    });
    const id2 = clientIdDaChamada(spy2);

    expect(id1).not.toBe(id2);
  });
});
