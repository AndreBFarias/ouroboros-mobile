// Funcoes puras do flow OAuth Spotify (R-INT-4, 2026-05-17).
// Espelha o padrao de googleAuthFlow.ts -- separado do store para
// permitir mocks deterministicos via fetch em testes unitarios.
//
// Decisao R-INT-4: Spotify Web API only (read-only). Suficiente para
// "tocando agora" no dashboard, "histórico recente" no Recap e
// "top tracks" para futuras estatisticas. Web Playback SDK NAO usado
// (control de playback dentro do app sai do escopo da v1).
//
// Decisao D2=A (R-MEDIA-1 _BACKLOG e R-INT-4): exceção explicita a
// filosofia "sem rede de saida". Spotify OAuth + GETs read-only sao
// liberados; nenhum dado pessoal sai alem do que a propria conta do
// usuario expoe na Web API.
//
// PKCE: Spotify exige PKCE para todos os clientes publicos (sem
// client_secret no app). Padrao identico ao Google: code_verifier
// 43-128 chars URL-safe + code_challenge SHA-256.
//
// Client ID: vem de env.json sob chave `spotify.client_id` (gitignored,
// configurado pelo usuario via Spotify Developer Dashboard em
// https://developer.spotify.com/dashboard). Quando ausente,
// getClientIdFromEnv lanca erro claro e UI mostra fallback "Configure
// env.json".
//
// Redirect URI: scheme custom `ouroboros://oauth-spotify-callback`
// (registrado em app.json scheme[]). Em Expo Go, expo-auth-session
// usa o proxy auth.expo.io automaticamente; em dev-client/release,
// scheme custom volta direto pro app.
//
// Comentarios sem acento (convencao shell/CI).
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import envJson from '../../../../env.json';

interface EnvOAuth {
  // Reusa o shape canonico de env.json existente (Google) e estende
  // com a chave `spotify`. Quando ausente, fallback para erro claro.
  spotify?: {
    client_id?: string;
  };
}

const env = envJson as unknown as EnvOAuth;

export const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
} as const;

// Escopos read-only solicitados.
//
// - user-read-currently-playing: GET /me/player/currently-playing
// - user-read-recently-played: GET /me/player/recently-played
// - user-top-read: GET /me/top/{type}
// - playlist-read-private: GET /me/playlists (futuro)
//
// Todos read-only; nada permite modificar a conta do usuario.
export const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
] as const;

export interface SpotifyClientIdInfo {
  clientId: string;
  redirectUri: string;
  ambiente: 'expo-go' | 'standalone';
}

// Le client_id do env.json sob chave `spotify`. Lanca erro claro quando
// ausente (UI captura via pickClientIdSafe e mostra fallback).
export function getClientIdFromEnv(): string {
  const cid = env.spotify?.client_id;
  if (typeof cid !== 'string' || cid.length === 0) {
    throw new Error(
      'env.json sem spotify.client_id. Cadastre em https://developer.spotify.com/dashboard.'
    );
  }
  return cid;
}

// Detecta ambiente via Constants.appOwnership (mesma logica do Google).
//   'expo'                    -> Expo Go (proxy auth.expo.io)
//   'standalone' / 'guest'    -> dev-client ou release (custom scheme)
//
// Lanca quando env.json esta ausente ou sem spotify.client_id.
export function pickClientId(): SpotifyClientIdInfo {
  const clientId = getClientIdFromEnv();
  const ambiente: SpotifyClientIdInfo['ambiente'] =
    Constants.appOwnership === 'expo' ? 'expo-go' : 'standalone';

  if (ambiente === 'expo-go') {
    return {
      clientId,
      redirectUri: makeRedirectUri({ preferLocalhost: false }),
      ambiente,
    };
  }

  // Custom scheme registrado em app.json para Spotify. Ao contrario do
  // Google (que exige scheme reverso-DNS), Spotify aceita qualquer URI
  // que casa exatamente com o cadastrado no Dashboard. Convencao:
  //   ouroboros://oauth-spotify-callback
  return {
    clientId,
    redirectUri: 'ouroboros://oauth-spotify-callback',
    ambiente,
  };
}

// Resultado defensivo de pickClientId. Quando env.json esta ausente
// ou sem spotify.client_id, retorna { erro } em vez de lancar. Permite
// que callers em boot / render inicial mostrem fallback de UI sem
// precisar wrap try/catch local.
export type PickSpotifyClientIdResultado =
  | SpotifyClientIdInfo
  | { erro: string };

export function pickClientIdSafe(): PickSpotifyClientIdResultado {
  try {
    return pickClientId();
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : 'erro desconhecido em pickClientId';
    return { erro: mensagem };
  }
}

// Shape canonico de resposta do token endpoint do Spotify. Token
// endpoint retorna access_token + refresh_token + expires_in (segundos)
// + scope. Identico ao Google.
export interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface TrocarCodeInput {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}

// Troca code (PKCE) por tokens via POST x-www-form-urlencoded. Lanca em
// status >= 400 com texto do servidor para diagnostico.
export async function trocarCodePorToken(
  input: TrocarCodeInput
): Promise<SpotifyTokenResponse> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: input.redirectUri,
  }).toString();

  const res = await fetch(SPOTIFY_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const detalhe = await res.text();
    throw new Error(`trocarCodePorToken ${res.status}: ${detalhe}`);
  }
  return (await res.json()) as SpotifyTokenResponse;
}

// Refresh do access token via refresh_token. Spotify exige client_id
// no body do refresh (sem client_secret -- e' PKCE). Lanca em erro;
// caller decide se zera a conta.
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string
): Promise<SpotifyTokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();

  const res = await fetch(SPOTIFY_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const detalhe = await res.text();
    if (res.status === 400 && detalhe.includes('invalid_grant')) {
      throw new SpotifyInvalidGrantError(detalhe);
    }
    throw new Error(`refreshAccessToken ${res.status}: ${detalhe}`);
  }
  return (await res.json()) as SpotifyTokenResponse;
}

// Erro especifico de refresh com refresh_token invalido (revogado pelo
// usuario externamente). Caller marca conta como invalida.
export class SpotifyInvalidGrantError extends Error {
  constructor(detalhe: string) {
    super(`invalid_grant: ${detalhe}`);
    this.name = 'SpotifyInvalidGrantError';
  }
}
