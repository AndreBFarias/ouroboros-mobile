// Tests do store useGoogleAuth: refreshIfNeeded, marcarInvalido,
// revogar, autenticar (mock branch web dev).
//
// Comentarios sem acento.
import {
  useGoogleAuth,
  mergeGoogleAuthPersistido,
} from '@/lib/stores/googleAuth';
import * as googleAuthFlow from '@/lib/services/googleAuthFlow';

const CONTA_VAZIA = {
  accessToken: null,
  refreshToken: null,
  expiraEm: 0,
  email: null,
  ultimaConexao: 0,
  invalido: false,
};

beforeEach(() => {
  useGoogleAuth.setState({
    contas: {
      pessoa_a: { ...CONTA_VAZIA },
      pessoa_b: { ...CONTA_VAZIA },
    },
  });
  jest.restoreAllMocks();
});

describe('useGoogleAuth.refreshIfNeeded', () => {
  test('sem token devolve null', async () => {
    const r = await useGoogleAuth.getState().refreshIfNeeded('pessoa_a');
    expect(r).toBeNull();
  });

  test('token valido nao expira ainda devolve token atual', async () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'abc',
          refreshToken: 'r',
          expiraEm: Date.now() + 600_000,
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    const r = await useGoogleAuth.getState().refreshIfNeeded('pessoa_a');
    expect(r).toBe('abc');
  });

  test('token expirado sem refresh marca invalido', async () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'old',
          refreshToken: null,
          expiraEm: Date.now() - 1000,
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    const r = await useGoogleAuth.getState().refreshIfNeeded('pessoa_a');
    expect(r).toBeNull();
    expect(useGoogleAuth.getState().contas.pessoa_a.invalido).toBe(true);
  });

  test('refresh com invalid_grant marca invalido', async () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'old',
          refreshToken: 'r',
          expiraEm: Date.now() - 1000,
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    jest.spyOn(googleAuthFlow, 'pickClientId').mockReturnValue({
      clientId: 'cid',
      redirectUri: 'mock://callback',
      ambiente: 'standalone',
    });
    jest
      .spyOn(googleAuthFlow, 'refreshAccessToken')
      .mockRejectedValue(new googleAuthFlow.InvalidGrantError('expired'));

    const r = await useGoogleAuth.getState().refreshIfNeeded('pessoa_a');
    expect(r).toBeNull();
    expect(useGoogleAuth.getState().contas.pessoa_a.invalido).toBe(true);
  });

  test('refresh sucesso atualiza access token', async () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'old',
          refreshToken: 'r',
          expiraEm: Date.now() - 1000,
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    jest.spyOn(googleAuthFlow, 'pickClientId').mockReturnValue({
      clientId: 'cid',
      redirectUri: 'mock://callback',
      ambiente: 'standalone',
    });
    jest.spyOn(googleAuthFlow, 'refreshAccessToken').mockResolvedValue({
      access_token: 'new',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'calendar.events.readonly',
    });

    const r = await useGoogleAuth.getState().refreshIfNeeded('pessoa_a');
    expect(r).toBe('new');
    expect(useGoogleAuth.getState().contas.pessoa_a.accessToken).toBe('new');
    expect(useGoogleAuth.getState().contas.pessoa_a.invalido).toBe(false);
  });
});

describe('useGoogleAuth.marcarInvalido', () => {
  test('zera access e flag invalido true', () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'a',
          refreshToken: 'r',
          expiraEm: Date.now() + 1000,
          email: 'x@example.com',
          ultimaConexao: Date.now(),
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    useGoogleAuth.getState().marcarInvalido('pessoa_a');
    const c = useGoogleAuth.getState().contas.pessoa_a;
    expect(c.invalido).toBe(true);
    expect(c.accessToken).toBeNull();
    expect(c.expiraEm).toBe(0);
    // refreshToken e email permanecem para informar a UI
    expect(c.email).toBe('x@example.com');
  });
});

describe('useGoogleAuth.revogar', () => {
  test('chama revogarToken e zera conta', async () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'a',
          refreshToken: 'r',
          expiraEm: Date.now() + 1000,
          email: 'x@example.com',
          ultimaConexao: Date.now(),
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    const spy = jest
      .spyOn(googleAuthFlow, 'revogarToken')
      .mockResolvedValue(undefined);
    await useGoogleAuth.getState().revogar('pessoa_a');
    expect(spy).toHaveBeenCalledWith('r');
    const c = useGoogleAuth.getState().contas.pessoa_a;
    expect(c.accessToken).toBeNull();
    expect(c.refreshToken).toBeNull();
    expect(c.email).toBeNull();
    expect(c.invalido).toBe(false);
  });

  test('falha de rede ainda zera conta local', async () => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          ...CONTA_VAZIA,
          accessToken: 'a',
          refreshToken: 'r',
          expiraEm: Date.now() + 1000,
          email: 'x',
          ultimaConexao: Date.now(),
        },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
    jest
      .spyOn(googleAuthFlow, 'revogarToken')
      .mockRejectedValue(new Error('network'));
    await useGoogleAuth.getState().revogar('pessoa_a');
    expect(useGoogleAuth.getState().contas.pessoa_a.accessToken).toBeNull();
  });
});

// AUDIT-P1-8 (2026-07-28): back-fill da hidratacao (armadilha A47), com
// aninhamento DUPLO.
//
// Store sem version/migrate: TODA hidratacao passa pelo merge. Sem o
// custom, valia o merge SHALLOW do zustand -- `contas` persistido
// substitui o default inteiro. Um merge raso de UM nivel so' cobriria a
// conta ausente; o caso mais provavel e' campo novo DENTRO de
// ContaGoogle (foi o que a M37.2 fez com escoposConcedidos), que exige
// mesclar contas.pessoa_a e contas.pessoa_b individualmente.
//
// Os testes chamam a funcao REAL `mergeGoogleAuthPersistido` (a mesma
// cabeada em `merge` no persist config).
describe('mergeGoogleAuthPersistido (back-fill nested duplo - AUDIT-P1-8)', () => {
  beforeEach(() => {
    useGoogleAuth.setState({
      contas: {
        pessoa_a: { ...CONTA_VAZIA },
        pessoa_b: { ...CONTA_VAZIA },
      },
    });
  });

  // Instalacao organica: pessoa_a conectou o Google ANTES de um campo
  // novo entrar em ContaGoogle (aqui `invalido`, que e' o marcador soft
  // lido pela UI), e pessoa_b nunca conectou -- a chave inteira dela nem
  // existe no blob persistido.
  function persistidoAntigo(): Record<string, unknown> {
    return {
      contas: {
        pessoa_a: {
          accessToken: 'token-organico',
          refreshToken: 'refresh-organico',
          expiraEm: 1_800_000_000_000,
          email: 'test@example.com',
          ultimaConexao: 1_700_000_000_000,
          // invalido AUSENTE de proposito (campo novo do shape).
        },
        // pessoa_b AUSENTE de proposito (nunca conectou).
      },
    };
  }

  it('back-filla campo novo DENTRO da conta persistida (segundo nivel)', () => {
    const persistido = persistidoAntigo();
    const contaA = (persistido.contas as Record<string, any>).pessoa_a;
    expect(contaA.invalido).toBeUndefined();

    const merged = mergeGoogleAuthPersistido(
      persistido,
      useGoogleAuth.getState()
    );

    // O fix de segundo nivel: recebe o default false. Com `undefined` a
    // UI trataria a conta como valida por falsy, mas qualquer leitura
    // explicita do campo veria lixo.
    expect(merged.contas.pessoa_a.invalido).toBe(false);
    // Tokens organicos preservados (persistido vence o default).
    expect(merged.contas.pessoa_a.accessToken).toBe('token-organico');
    expect(merged.contas.pessoa_a.refreshToken).toBe('refresh-organico');
    expect(merged.contas.pessoa_a.email).toBe('test@example.com');
    expect(merged.contas.pessoa_a.expiraEm).toBe(1_800_000_000_000);
  });

  it('back-filla conta ausente por inteiro com CONTA_VAZIA (primeiro nivel)', () => {
    const merged = mergeGoogleAuthPersistido(
      persistidoAntigo(),
      useGoogleAuth.getState()
    );

    expect(merged.contas.pessoa_b).toEqual(CONTA_VAZIA);
    expect(merged.contas.pessoa_b.accessToken).toBeNull();
    expect(merged.contas.pessoa_b.invalido).toBe(false);
  });

  it('mantem escoposConcedidos ausente em conta pre-M37.2 (opcional por contrato)', () => {
    const merged = mergeGoogleAuthPersistido(
      persistidoAntigo(),
      useGoogleAuth.getState()
    );

    // O campo e' opcional: undefined significa "readonly" para a UI. O
    // back-fill nao pode inventar 'write' aqui.
    expect(merged.contas.pessoa_a.escoposConcedidos).toBeUndefined();
  });

  it('preserva escoposConcedidos quando a conta ja o tem', () => {
    const persistido = persistidoAntigo();
    (persistido.contas as Record<string, any>).pessoa_a.escoposConcedidos =
      'write';

    const merged = mergeGoogleAuthPersistido(
      persistido,
      useGoogleAuth.getState()
    );

    expect(merged.contas.pessoa_a.escoposConcedidos).toBe('write');
  });

  it('back-filla contas ausente por inteiro (persistido corrompido)', () => {
    const merged = mergeGoogleAuthPersistido({}, useGoogleAuth.getState());

    expect(merged.contas.pessoa_a).toEqual(CONTA_VAZIA);
    expect(merged.contas.pessoa_b).toEqual(CONTA_VAZIA);
  });

  it('preserva as acoes do store apos a hidratacao', () => {
    const merged = mergeGoogleAuthPersistido(
      persistidoAntigo(),
      useGoogleAuth.getState()
    );

    expect(typeof merged.autenticar).toBe('function');
    expect(typeof merged.revogar).toBe('function');
    expect(typeof merged.refreshIfNeeded).toBe('function');
    expect(typeof merged.marcarInvalido).toBe('function');
  });

  it('guard: persistedState null/undefined/nao-objeto retorna o currentState intacto', () => {
    const atual = useGoogleAuth.getState();
    expect(mergeGoogleAuthPersistido(null, atual)).toBe(atual);
    expect(mergeGoogleAuthPersistido(undefined, atual)).toBe(atual);
    expect(mergeGoogleAuthPersistido('lixo', atual)).toBe(atual);
    expect(typeof mergeGoogleAuthPersistido(null, atual).autenticar).toBe(
      'function'
    );
  });
});
