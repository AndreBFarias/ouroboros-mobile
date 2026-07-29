// Testes do store useSpotifyAuth (R-INT-4).
// Cobre:
//   - estado inicial e CONTA_VAZIA shape.
//   - refreshIfNeeded: sem token / token valido / token expirado +
//     refresh OK / refresh invalid_grant -> marcado invalido.
//   - marcarInvalido: zera accessToken e seta invalido true.
//   - desconectar: zera conta.
//
// Comentarios sem acento.
import {
  useSpotifyAuth,
  mergeSpotifyPersistido,
} from '@/lib/integracoes/spotify/store';
import * as spotifyOAuth from '@/lib/integracoes/spotify/oauth';

const CONTA_VAZIA = {
  accessToken: null,
  refreshToken: null,
  expiraEm: 0,
  ultimaConexao: 0,
  invalido: false,
  scope: null,
};

beforeEach(() => {
  useSpotifyAuth.setState({ conta: { ...CONTA_VAZIA } });
  jest.restoreAllMocks();
});

describe('useSpotifyAuth.refreshIfNeeded', () => {
  test('sem token devolve null', async () => {
    const r = await useSpotifyAuth.getState().refreshIfNeeded();
    expect(r).toBeNull();
  });

  test('token valido (>60s) devolve token atual', async () => {
    useSpotifyAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at-valid',
        refreshToken: 'rt-valid',
        expiraEm: Date.now() + 600_000,
      },
    });
    const r = await useSpotifyAuth.getState().refreshIfNeeded();
    expect(r).toBe('at-valid');
  });

  test('token expirado sem refresh marca invalido', async () => {
    useSpotifyAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at-old',
        refreshToken: null,
        expiraEm: Date.now() - 1000,
      },
    });
    const r = await useSpotifyAuth.getState().refreshIfNeeded();
    expect(r).toBeNull();
    expect(useSpotifyAuth.getState().conta.invalido).toBe(true);
  });

  test('refresh sucesso atualiza access token', async () => {
    useSpotifyAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at-old',
        refreshToken: 'rt-valid',
        expiraEm: Date.now() - 1000,
      },
    });
    jest.spyOn(spotifyOAuth, 'pickClientId').mockReturnValue({
      clientId: 'cid',
      redirectUri: 'mock://callback',
      ambiente: 'standalone',
    });
    jest.spyOn(spotifyOAuth, 'refreshAccessToken').mockResolvedValue({
      access_token: 'at-new',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'user-read-currently-playing',
    });

    const r = await useSpotifyAuth.getState().refreshIfNeeded();
    expect(r).toBe('at-new');
    expect(useSpotifyAuth.getState().conta.accessToken).toBe('at-new');
    expect(useSpotifyAuth.getState().conta.invalido).toBe(false);
  });

  test('refresh com invalid_grant marca invalido', async () => {
    useSpotifyAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at-old',
        refreshToken: 'rt-bad',
        expiraEm: Date.now() - 1000,
      },
    });
    jest.spyOn(spotifyOAuth, 'pickClientId').mockReturnValue({
      clientId: 'cid',
      redirectUri: 'mock://callback',
      ambiente: 'standalone',
    });
    jest
      .spyOn(spotifyOAuth, 'refreshAccessToken')
      .mockRejectedValue(new spotifyOAuth.SpotifyInvalidGrantError('expired'));

    const r = await useSpotifyAuth.getState().refreshIfNeeded();
    expect(r).toBeNull();
    expect(useSpotifyAuth.getState().conta.invalido).toBe(true);
  });
});

describe('useSpotifyAuth.marcarInvalido', () => {
  test('zera access e flag invalido true', () => {
    useSpotifyAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at',
        refreshToken: 'rt',
        expiraEm: Date.now() + 1000,
        ultimaConexao: Date.now(),
        scope: 'user-read-currently-playing',
      },
    });
    useSpotifyAuth.getState().marcarInvalido();
    const c = useSpotifyAuth.getState().conta;
    expect(c.invalido).toBe(true);
    expect(c.accessToken).toBeNull();
    expect(c.expiraEm).toBe(0);
    // refresh e scope permanecem para informar a UI
    expect(c.scope).toBe('user-read-currently-playing');
  });
});

describe('useSpotifyAuth.desconectar', () => {
  test('zera tudo', () => {
    useSpotifyAuth.setState({
      conta: {
        ...CONTA_VAZIA,
        accessToken: 'at',
        refreshToken: 'rt',
        expiraEm: Date.now() + 1000,
        ultimaConexao: Date.now(),
        scope: 'x',
      },
    });
    useSpotifyAuth.getState().desconectar();
    expect(useSpotifyAuth.getState().conta).toEqual(CONTA_VAZIA);
  });
});

// AUDIT-P1-8 (2026-07-28): back-fill da hidratacao (armadilha A47).
//
// Store sem version/migrate: TODA hidratacao passa pelo merge. Sem o
// custom, valia o merge SHALLOW do zustand, onde o objeto `conta`
// persistido substitui o default inteiro -- um campo novo de
// ContaSpotify hidrata `undefined` em toda conta ja conectada.
//
// Os testes chamam a funcao REAL `mergeSpotifyPersistido` (a mesma
// cabeada em `merge` no persist config).
describe('mergeSpotifyPersistido (back-fill nested - AUDIT-P1-8)', () => {
  beforeEach(() => {
    useSpotifyAuth.setState({ conta: { ...CONTA_VAZIA } });
  });

  // Conta organica conectada antes de `scope` entrar em ContaSpotify.
  function persistidoAntigo(): Record<string, unknown> {
    return {
      conta: {
        accessToken: 'spotify-token-organico',
        refreshToken: 'spotify-refresh-organico',
        expiraEm: 1_800_000_000_000,
        ultimaConexao: 1_700_000_000_000,
        invalido: false,
        // scope AUSENTE de proposito (campo novo do shape).
      },
    };
  }

  it('back-filla campo novo da conta com o default, preservando os tokens', () => {
    const persistido = persistidoAntigo();
    expect((persistido.conta as Record<string, unknown>).scope).toBeUndefined();

    const merged = mergeSpotifyPersistido(
      persistido,
      useSpotifyAuth.getState()
    );

    // O fix: cai no default null, nao em undefined.
    expect(merged.conta.scope).toBeNull();
    // Conexao organica intacta: sem isto o usuario seria deslogado.
    expect(merged.conta.accessToken).toBe('spotify-token-organico');
    expect(merged.conta.refreshToken).toBe('spotify-refresh-organico');
    expect(merged.conta.expiraEm).toBe(1_800_000_000_000);
    expect(merged.conta.ultimaConexao).toBe(1_700_000_000_000);
    expect(merged.conta.invalido).toBe(false);
  });

  it('back-filla conta ausente por inteiro (persistido corrompido)', () => {
    const merged = mergeSpotifyPersistido({}, useSpotifyAuth.getState());

    expect(merged.conta).toEqual(CONTA_VAZIA);
  });

  it('preserva as acoes do store apos a hidratacao', () => {
    const merged = mergeSpotifyPersistido(
      persistidoAntigo(),
      useSpotifyAuth.getState()
    );

    expect(typeof merged.autenticar).toBe('function');
    expect(typeof merged.desconectar).toBe('function');
    expect(typeof merged.refreshIfNeeded).toBe('function');
    expect(typeof merged.marcarInvalido).toBe('function');
  });

  it('guard: persistedState null/undefined/nao-objeto retorna o currentState intacto', () => {
    const atual = useSpotifyAuth.getState();
    expect(mergeSpotifyPersistido(null, atual)).toBe(atual);
    expect(mergeSpotifyPersistido(undefined, atual)).toBe(atual);
    expect(mergeSpotifyPersistido('lixo', atual)).toBe(atual);
    expect(typeof mergeSpotifyPersistido(null, atual).autenticar).toBe(
      'function'
    );
  });
});
