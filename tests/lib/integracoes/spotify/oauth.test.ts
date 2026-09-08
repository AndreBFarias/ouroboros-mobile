// Testes unit do flow OAuth Spotify (R-INT-4, 2026-05-17).
// Cobre:
//   - trocarCodePorToken: corpo POST x-www-form-urlencoded com PKCE.
//   - refreshAccessToken: erro generico vs InvalidGrantError.
//   - pickClientIdSafe: sem credencial -> { erro }, com credencial ->
//     { clientId, redirectUri, ambiente }.
//
// Comentarios sem acento.
//
// P4 (2026-09-08): a fonte do client_id deixou de ser o import estatico
// de env.json e passou a ser o store de credenciais, alimentado pela
// tela /settings/credenciais. O helper carregar() abaixo semeia o store
// em vez de mockar um arquivo JSON.
//
// Isso apaga a causa raiz da armadilha A43, documentada em detalhe na
// versao anterior deste cabecalho: o `{ virtual: true }` do doMock
// colidia com env.json quando ele era symlink dentro de uma copia de
// trabalho, porque o resolver seguia ate o realpath e as chaves de
// cache divergiam. Sem nenhum arquivo env.json no grafo de modulos de
// src/, nao ha symlink que possa divergir.
//
// Approach: require() dentro de cada teste para isolar o module cache e
// trocar appOwnership via jest.resetModules + jest.doMock. O store de
// credenciais e' requerido DEPOIS do resetModules, no mesmo registro do
// modulo sob teste -- semear outra instancia nao teria efeito.

jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: () => 'https://auth.expo.io/@owner/slug',
}));

// expo-constants e' remockado via doMock dentro de carregar() para
// mudar appOwnership sem problema de hoisting; a credencial entra pelo
// store, nao por mock de modulo.

function carregar(
  clientId: string | null,
  ownership: 'expo' | 'standalone' | undefined = 'standalone'
) {
  jest.resetModules();
  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: { appOwnership: ownership },
  }));
  const mod = require('@/lib/integracoes/spotify/oauth');
  // Semeado DEPOIS do resetModules e do require acima: os dois precisam
  // vir do mesmo registro de modulos, senao o store semeado nao e' o
  // mesmo que oauth.ts consulta.
  const { useCredenciais } =
    require('@/lib/stores/credenciais') as typeof import('@/lib/stores/credenciais');
  useCredenciais.setState({ spotify: clientId });
  return mod;
}

describe('getClientIdSpotify', () => {
  test('retorna o client_id que a pessoa cadastrou', () => {
    const mod = carregar('cid-x');
    expect(mod.getClientIdSpotify()).toBe('cid-x');
  });

  test('lanca SemCredencialError quando nao ha credencial', () => {
    const mod = carregar(null);
    const { ehSemCredencial } =
      require('@/lib/stores/credenciais') as typeof import('@/lib/stores/credenciais');
    expect(() => mod.getClientIdSpotify()).toThrow();
    try {
      mod.getClientIdSpotify();
    } catch (e) {
      // O ramo honesto da interface (motivo: 'sem_client_id') decide
      // pelo TIPO. Se este expect cair, o store volta a devolver
      // 'erro' generico e a pessoa perde a explicacao.
      expect(ehSemCredencial(e)).toBe(true);
    }
  });

  test('string vazia conta como ausencia', () => {
    const mod = carregar('   ');
    expect(() => mod.getClientIdSpotify()).toThrow();
  });
});

describe('pickClientId', () => {
  test('standalone usa scheme custom ouroboros://oauth-spotify-callback', () => {
    const mod = carregar('cid-x', 'standalone');
    const r = mod.pickClientId();
    expect(r.clientId).toBe('cid-x');
    expect(r.redirectUri).toBe('ouroboros://oauth-spotify-callback');
    expect(r.ambiente).toBe('standalone');
  });

  test('expo-go usa proxy via makeRedirectUri', () => {
    const mod = carregar('cid-x', 'expo');
    const r = mod.pickClientId();
    expect(r.redirectUri).toBe('https://auth.expo.io/@owner/slug');
    expect(r.ambiente).toBe('expo-go');
  });
});

describe('pickClientIdSafe', () => {
  test('retorna ClientIdInfo quando ha credencial', () => {
    const mod = carregar('cid-x');
    const r = mod.pickClientIdSafe();
    expect('erro' in r).toBe(false);
    expect(r.clientId).toBe('cid-x');
  });

  test('retorna { erro } quando nao ha credencial', () => {
    const mod = carregar(null);
    const r = mod.pickClientIdSafe();
    expect('erro' in r).toBe(true);
    expect(r.erro).toMatch(/credencial do Spotify/);
  });
});

describe('trocarCodePorToken', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('POST x-www-form-urlencoded com PKCE devolve token', async () => {
    const mod = carregar('cid');
    const mockResp = {
      access_token: 'at-1',
      refresh_token: 'rt-1',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'user-read-currently-playing',
    };
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResp,
    } as unknown as Response);

    const r = await mod.trocarCodePorToken({
      code: 'C0DE',
      codeVerifier: 'VERIF1ER',
      clientId: 'cid',
      redirectUri: 'ouroboros://oauth-spotify-callback',
    });

    expect(r.access_token).toBe('at-1');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://accounts.spotify.com/api/token');
    expect((init as RequestInit).method).toBe('POST');
    const body = (init as RequestInit).body as string;
    expect(body).toContain('client_id=cid');
    expect(body).toContain('code=C0DE');
    expect(body).toContain('code_verifier=VERIF1ER');
    expect(body).toContain('grant_type=authorization_code');
  });

  test('lanca erro com texto do servidor em status nao-200', async () => {
    const mod = carregar('cid');
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'invalid_request',
    } as unknown as Response);
    await expect(
      mod.trocarCodePorToken({
        code: 'x',
        codeVerifier: 'x',
        clientId: 'x',
        redirectUri: 'x',
      })
    ).rejects.toThrow(/400.*invalid_request/);
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('sucesso devolve novo access_token', async () => {
    const mod = carregar('cid');
    const mockResp = {
      access_token: 'new-at',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'user-read-currently-playing',
    };
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResp,
    } as unknown as Response);

    const r = await mod.refreshAccessToken('rt-1', 'cid');
    expect(r.access_token).toBe('new-at');
  });

  test('400 com invalid_grant lanca SpotifyInvalidGrantError', async () => {
    const mod = carregar('cid');
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'error=invalid_grant',
    } as unknown as Response);
    await expect(
      mod.refreshAccessToken('rt-bad', 'cid')
    ).rejects.toBeInstanceOf(mod.SpotifyInvalidGrantError);
  });

  test('500 generico lanca Error nao-tipado', async () => {
    const mod = carregar('cid');
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'server',
    } as unknown as Response);
    await expect(mod.refreshAccessToken('rt', 'cid')).rejects.toThrow(/500/);
  });
});
