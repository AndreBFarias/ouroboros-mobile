// Cobre o wrap defensivo pickClientIdSafe (B2 da sprint AUDIT-T1-BUGS).
// Cenarios:
//  - env.json valido: devolve ClientIdInfo (clientId + redirectUri + ambiente)
//  - env.json sem android.client_id: devolve { erro: '<mensagem>' }
//  - env.json com client_id vazio: devolve { erro }
//
// Estrategia: mockar o modulo env.json diretamente via jest.mock no path
// resolvido relativo ao googleAuthFlow.ts. Quando o teste roda, o
// require('../../../env.json') interno resolve pro mock.
//
// Comentarios sem acento (convencao shell/CI).
//
// R-INFRA-GOOGLE-AUTH-FLOW-TEST-FIX (Onda 3K, 2026-05-21): suite passou
// 10/10 em runs isolados apos R-INFRA-JEST-LEAK-HUNT-5 (fix global de
// fakeTimers.doNotFake em jest.config.js). Flakiness reportada como
// suspeita ("jest.mock + require.cache poluido") nao se manifesta mais.
// O padrao deste arquivo ja era defensivo: jest.resetModules() em
// beforeEach + jest.doMock + require('@/lib/services/googleAuthFlow')
// dentro de cada it(). Manter este shape — alterar para jest.mock
// estatico re-introduziria o risco de cache contamination cross-suite.

// Default mock para o caminho exato usado pelo source. Cada teste
// que precisa de outro shape sobrescreve via jest.resetModules + setMock.
jest.mock('../../../env.json', () => ({
  android: {
    client_id: '1234567890-abcdef.apps.googleusercontent.com',
    project_id: 'mock-project',
  },
}));

describe('pickClientIdSafe', () => {
  // jest.resetModules() em beforeEach garante modulo fresco por teste,
  // entao jest.doMock dentro do it() consegue sobrescrever o default
  // acima sem contaminar runs subsequentes (mesmo worker reuso).
  beforeEach(() => {
    jest.resetModules();
  });

  it('devolve ClientIdInfo quando env.json e valido', () => {
    jest.doMock('../../../env.json', () => ({
      android: {
        client_id: '1234567890-abcdef.apps.googleusercontent.com',
      },
    }));
    const { pickClientIdSafe } = require('@/lib/services/googleAuthFlow');
    const r = pickClientIdSafe();
    expect('erro' in r).toBe(false);
    expect(r.clientId).toBe('1234567890-abcdef.apps.googleusercontent.com');
    expect(typeof r.redirectUri).toBe('string');
  });

  it('devolve { erro } quando env.json sem android nem installed', () => {
    jest.doMock('../../../env.json', () => ({}));
    const { pickClientIdSafe } = require('@/lib/services/googleAuthFlow');
    const r = pickClientIdSafe();
    expect('erro' in r).toBe(true);
    if ('erro' in r) {
      expect(r.erro).toMatch(/env\.json/);
    }
  });

  it('devolve { erro } quando client_id e vazio', () => {
    jest.doMock('../../../env.json', () => ({
      android: { client_id: '' },
    }));
    const { pickClientIdSafe } = require('@/lib/services/googleAuthFlow');
    const r = pickClientIdSafe();
    expect('erro' in r).toBe(true);
    if ('erro' in r) {
      expect(r.erro).toMatch(/env\.json/);
    }
  });

  it('aceita fallback legado installed.client_id', () => {
    jest.doMock('../../../env.json', () => ({
      installed: { client_id: '99.apps.googleusercontent.com' },
    }));
    const { pickClientIdSafe } = require('@/lib/services/googleAuthFlow');
    const r = pickClientIdSafe();
    expect('erro' in r).toBe(false);
    expect(r.clientId).toBe('99.apps.googleusercontent.com');
  });
});
