// Testes unit do flow OAuth Spotify (R-INT-4, 2026-05-17).
// Cobre:
//   - trocarCodePorToken: corpo POST x-www-form-urlencoded com PKCE.
//   - refreshAccessToken: erro generico vs InvalidGrantError.
//   - pickClientIdSafe: env.json ausente -> { erro }, env.json ok ->
//     { clientId, redirectUri, ambiente }.
//
// Comentarios sem acento.
//
// Approach: usamos require() dentro de cada test para isolar o module
// cache e remockear o env.json conforme necessario via jest.resetModules
// + jest.doMock. Isso evita problemas com jest.mock hoisting + var de
// modulo nao-inicializada no factory.

jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: () => 'https://auth.expo.io/@owner/slug',
}));

// R-INFRA-JEST-ENV-MOCK-FLAKE (2026-05-26): mock base de env.json via
// jest.mock hoisted no topo, identico ao padrao canonico estavel de
// googleAuthFlow-pickClientIdSafe.test.ts. O shape anterior usava apenas
// jest.doMock(..., { virtual: true }) dentro de carregar(), o que falhava
// no run completo do smoke DENTRO de worktree (env.json e symlink).
//
// Causa raiz: { virtual: true } diz ao Jest que o modulo nao existe
// fisicamente, mas env.json existe (symlink). Quando outra suite carrega
// env.json antes desta no mesmo worker, o resolver segue o symlink ate o
// realpath do repo main e popula o cache sob essa chave. O import de
// oauth.ts (`import envJson from '../../../../env.json'`) resolve para o
// realpath, mas o jest.doMock virtual registra sob o path do symlink do
// worktree -> as chaves divergem e o mock nao intercepta. Resultado:
// getClientIdFromEnv le o env.json real (sem spotify.client_id) e lanca.
//
// Fix: jest.mock hoisted (sem virtual) registra o mock para o specifier
// ANTES de qualquer require resolver o path fisicamente, tornando-o
// deterministico independente de symlink/ordem de carga. jest.doMock
// dentro de carregar() continua sobrescrevendo por teste apos resetModules.
jest.mock('../../../../env.json', () => ({
  spotify: { client_id: 'cid-base' },
}));

// expo-constants e env.json sao remockados via doMock dentro de cada
// teste pra permitir mudar appOwnership e spotify.client_id sem
// problema de hoisting.

function carregar(
  envObj: { spotify?: { client_id?: string } } | null,
  ownership: 'expo' | 'standalone' | undefined = 'standalone'
) {
  jest.resetModules();
  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: { appOwnership: ownership },
  }));
  jest.doMock('../../../../env.json', () => (envObj === null ? {} : envObj));
  return require('@/lib/integracoes/spotify/oauth');
}

describe('getClientIdFromEnv', () => {
  test('retorna client_id quando env.json esta preenchido', () => {
    const mod = carregar({ spotify: { client_id: 'cid-x' } });
    expect(mod.getClientIdFromEnv()).toBe('cid-x');
  });

  test('lanca erro claro quando spotify.client_id ausente', () => {
    const mod = carregar({});
    expect(() => mod.getClientIdFromEnv()).toThrow(/spotify.client_id/);
  });

  test('lanca erro quando client_id e string vazia', () => {
    const mod = carregar({ spotify: { client_id: '' } });
    expect(() => mod.getClientIdFromEnv()).toThrow();
  });
});

describe('pickClientId', () => {
  test('standalone usa scheme custom ouroboros://oauth-spotify-callback', () => {
    const mod = carregar(
      { spotify: { client_id: 'cid-x' } },
      'standalone'
    );
    const r = mod.pickClientId();
    expect(r.clientId).toBe('cid-x');
    expect(r.redirectUri).toBe('ouroboros://oauth-spotify-callback');
    expect(r.ambiente).toBe('standalone');
  });

  test('expo-go usa proxy via makeRedirectUri', () => {
    const mod = carregar(
      { spotify: { client_id: 'cid-x' } },
      'expo'
    );
    const r = mod.pickClientId();
    expect(r.redirectUri).toBe('https://auth.expo.io/@owner/slug');
    expect(r.ambiente).toBe('expo-go');
  });
});

describe('pickClientIdSafe', () => {
  test('retorna ClientIdInfo quando env.json valido', () => {
    const mod = carregar({ spotify: { client_id: 'cid-x' } });
    const r = mod.pickClientIdSafe();
    expect('erro' in r).toBe(false);
    expect(r.clientId).toBe('cid-x');
  });

  test('retorna { erro } quando env.json sem spotify.client_id', () => {
    const mod = carregar({});
    const r = mod.pickClientIdSafe();
    expect('erro' in r).toBe(true);
    expect(r.erro).toMatch(/spotify.client_id/);
  });
});

describe('trocarCodePorToken', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('POST x-www-form-urlencoded com PKCE devolve token', async () => {
    const mod = carregar({ spotify: { client_id: 'cid' } });
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
    const mod = carregar({ spotify: { client_id: 'cid' } });
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
    const mod = carregar({ spotify: { client_id: 'cid' } });
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
    const mod = carregar({ spotify: { client_id: 'cid' } });
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'error=invalid_grant',
    } as unknown as Response);
    await expect(mod.refreshAccessToken('rt-bad', 'cid')).rejects.toBeInstanceOf(
      mod.SpotifyInvalidGrantError
    );
  });

  test('500 generico lanca Error nao-tipado', async () => {
    const mod = carregar({ spotify: { client_id: 'cid' } });
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'server',
    } as unknown as Response);
    await expect(mod.refreshAccessToken('rt', 'cid')).rejects.toThrow(/500/);
  });
});
