// Tests do store useGoogleAuth: refreshIfNeeded, marcarInvalido,
// revogar, autenticar (mock branch web dev).
//
// Comentarios sem acento.
import { useGoogleAuth } from '@/lib/stores/googleAuth';
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
    jest
      .spyOn(googleAuthFlow, 'pickClientId')
      .mockReturnValue({
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
    jest
      .spyOn(googleAuthFlow, 'pickClientId')
      .mockReturnValue({
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
