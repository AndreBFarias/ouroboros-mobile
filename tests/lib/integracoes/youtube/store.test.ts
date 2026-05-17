// Testes do store useYouTubeAuth (R-INT-4).
// Cobre comportamento canonico do refresh + invalid_grant + revogar.
//
// O store importa refreshAccessToken/revogarToken direto de
// googleAuthFlow.ts (nao via re-export youtube/oauth), entao spy no
// googleAuthFlow funciona. O youtube/oauth.ts mantem re-exports
// como conveniencia mas o store nao os usa.
//
// Comentarios sem acento.
import { useYouTubeAuth } from '@/lib/integracoes/youtube/store';
import * as ytOAuth from '@/lib/integracoes/youtube/oauth';
import * as googleFlow from '@/lib/services/googleAuthFlow';

const CONTA_VAZIA = {
  accessToken: null,
  refreshToken: null,
  expiraEm: 0,
  ultimaConexao: 0,
  invalido: false,
  scope: null,
};

beforeEach(() => {
  useYouTubeAuth.setState({ conta: { ...CONTA_VAZIA } });
  jest.restoreAllMocks();
});

describe('useYouTubeAuth.refreshIfNeeded', () => {
  test('sem token devolve null', async () => {
    const r = await useYouTubeAuth.getState().refreshIfNeeded();
    expect(r).toBeNull();
  });

  test('token valido devolve token atual sem chamar refresh', async () => {
    useYouTubeAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at',
        refreshToken: 'rt',
        expiraEm: Date.now() + 600_000,
      },
    });
    const refreshSpy = jest.spyOn(googleFlow, 'refreshAccessToken');
    const r = await useYouTubeAuth.getState().refreshIfNeeded();
    expect(r).toBe('at');
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  test('token expirado com refresh OK atualiza', async () => {
    useYouTubeAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at-old',
        refreshToken: 'rt',
        expiraEm: Date.now() - 1000,
      },
    });
    jest.spyOn(ytOAuth, 'pickClientId').mockReturnValue({
      clientId: 'cid',
      redirectUri: 'mock://callback',
      ambiente: 'standalone',
    });
    jest.spyOn(googleFlow, 'refreshAccessToken').mockResolvedValue({
      access_token: 'at-new',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'youtube.readonly',
    });
    const r = await useYouTubeAuth.getState().refreshIfNeeded();
    expect(r).toBe('at-new');
    expect(useYouTubeAuth.getState().conta.accessToken).toBe('at-new');
  });

  test('invalid_grant marca invalido', async () => {
    useYouTubeAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at-old',
        refreshToken: 'rt-bad',
        expiraEm: Date.now() - 1000,
      },
    });
    jest.spyOn(ytOAuth, 'pickClientId').mockReturnValue({
      clientId: 'cid',
      redirectUri: 'mock://callback',
      ambiente: 'standalone',
    });
    jest
      .spyOn(googleFlow, 'refreshAccessToken')
      .mockRejectedValue(new googleFlow.InvalidGrantError('expired'));

    const r = await useYouTubeAuth.getState().refreshIfNeeded();
    expect(r).toBeNull();
    expect(useYouTubeAuth.getState().conta.invalido).toBe(true);
  });
});

describe('useYouTubeAuth.marcarInvalido', () => {
  test('zera access e flag invalido true', () => {
    useYouTubeAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at',
        refreshToken: 'rt',
        expiraEm: Date.now() + 1000,
        ultimaConexao: Date.now(),
        scope: 'youtube.readonly',
      },
    });
    useYouTubeAuth.getState().marcarInvalido();
    const c = useYouTubeAuth.getState().conta;
    expect(c.invalido).toBe(true);
    expect(c.accessToken).toBeNull();
    expect(c.expiraEm).toBe(0);
  });
});

describe('useYouTubeAuth.desconectar', () => {
  test('chama revogarToken e zera conta', async () => {
    useYouTubeAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at',
        refreshToken: 'rt',
        expiraEm: Date.now() + 1000,
        ultimaConexao: Date.now(),
        scope: 'youtube.readonly',
      },
    });
    const spy = jest
      .spyOn(googleFlow, 'revogarToken')
      .mockResolvedValue(undefined);
    await useYouTubeAuth.getState().desconectar();
    expect(spy).toHaveBeenCalledWith('rt');
    expect(useYouTubeAuth.getState().conta).toEqual(CONTA_VAZIA);
  });

  test('falha de rede ainda zera conta local', async () => {
    useYouTubeAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at',
        refreshToken: 'rt',
        expiraEm: Date.now() + 1000,
      },
    });
    jest
      .spyOn(googleFlow, 'revogarToken')
      .mockRejectedValue(new Error('network'));
    await useYouTubeAuth.getState().desconectar();
    expect(useYouTubeAuth.getState().conta.accessToken).toBeNull();
  });
});
