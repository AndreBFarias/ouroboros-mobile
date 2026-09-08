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
// Client ID: decisao P4 de 2026-09-08 (credencial por usuario). Vem em
// RUNTIME do store de credenciais, alimentado pela tela
// /settings/credenciais; nada de import estatico de env.json. Isso
// importa mais aqui que no Google: o Development mode do Spotify tem
// teto de 5 contas, entao distribuir a credencial do dono no APK
// deixaria o sexto usuario para tras sem explicacao. Quando nao ha
// credencial, getClientIdSpotify lanca e a interface mostra o texto de
// ausencia em vez de tentar conectar.
//
// Redirect URI: scheme custom `ouroboros://oauth-spotify-callback`
// (registrado em app.json scheme[]). Em Expo Go, expo-auth-session
// usa o proxy auth.expo.io automaticamente; em dev-client/release,
// scheme custom volta direto pro app.
//
// Comentarios sem acento (convencao shell/CI).
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import { clientIdDe, SemCredencialError } from '@/lib/stores/credenciais';

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

// Le o client_id do Spotify cadastrado neste aparelho. Lanca quando nao
// ha nenhum; a UI captura via pickClientIdSafe, ou o store devolve
// `motivo: 'sem_client_id'`. A mensagem descreve uma ausencia e aponta
// o caminho -- nao e' relato de defeito.
export function getClientIdSpotify(): string {
  const cid = clientIdDe('spotify');
  if (cid === null) {
    throw new SemCredencialError(
      'spotify',
      'Sem credencial do Spotify neste aparelho. Cadastre em Configurações, Credenciais próprias.'
    );
  }
  return cid;
}

// Detecta ambiente via Constants.appOwnership (mesma logica do Google).
//   'expo'                    -> Expo Go (proxy auth.expo.io)
//   'standalone' / 'guest'    -> dev-client ou release (custom scheme)
//
// Lanca quando nao ha credencial do Spotify salva.
export function pickClientId(): SpotifyClientIdInfo {
  const clientId = getClientIdSpotify();
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

// Resultado defensivo de pickClientId. Quando nao ha credencial do
// Spotify salva, retorna { erro } em vez de lancar. Permite que callers
// em boot / render inicial mostrem o texto de ausencia sem precisar
// wrap try/catch local.
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
