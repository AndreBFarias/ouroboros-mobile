// Funcoes puras do flow OAuth Google. Separadas do store para
// permitir testes determinísticos via fetch mockado e isolar
// detalhes do split clientId (vide A21 do BRIEF).
//
// Decisao durol 2026-05-05: client_id vem de env.json (raiz do
// projeto, gitignored) em vez de env vars EXPO_PUBLIC_*. O
// arquivo env.json contem o JSON OAuth original gerado pelo
// Google Cloud Console; nada hardcoded em codigo versionado. ADR-0018
// adaptado: split por ambiente continua valido conceitualmente,
// mas para a v1.0 o dono usa um unico clientId tipo "OAuth desktop"
// (env.installed.client_id) que serve tanto para Expo Go (proxy)
// quanto para dev-client/release (custom-scheme), porque o
// expo-auth-session ainda usa o mesmo client_id em ambos os fluxos
// quando configurado com makeRedirectUri por ambiente. M37.2 ou
// sprint posterior decide se split via env vars retorna.
//
// Comentarios sem acento (convencao shell/CI).
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import envJson from '../../../env.json';

interface EnvOAuth {
  // Q0 (Onda Q, 2026-05-12): chave canonica e' `android` pra refletir
  // o tipo do OAuth client no Google Cloud (com.ouroboros.mobile +
  // SHA-1). Mantemos `installed` como fallback para compat com env.json
  // exportados em versoes anteriores do projeto.
  android?: {
    client_id?: string;
    project_id?: string;
    auth_uri?: string;
    token_uri?: string;
  };
  installed?: {
    client_id?: string;
    project_id?: string;
    auth_uri?: string;
    token_uri?: string;
  };
}

const env = envJson as EnvOAuth;

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

export const SCOPE_READONLY =
  'https://www.googleapis.com/auth/calendar.events.readonly';

export interface ClientIdInfo {
  clientId: string;
  redirectUri: string;
  ambiente: 'expo-go' | 'standalone';
}

// Le o client_id do env.json. Prefere `android` (canonico pos-Q0
// 2026-05-12); cai em `installed` legado se necessario. Lanca erro
// claro se ambos ausentes para que a UI possa mostrar fallback
// "Configure env.json" em vez de crash generico.
export function getClientIdFromEnv(): string {
  const cid = env.android?.client_id ?? env.installed?.client_id;
  if (typeof cid !== 'string' || cid.length === 0) {
    throw new Error(
      'env.json ausente ou sem android.client_id. Veja docs/SETUP-OAUTH-GOOGLE.md.'
    );
  }
  return cid;
}

// Detecta ambiente via Constants.appOwnership (vide A21).
//   'expo'                    -> Expo Go (usa proxy auth.expo.io)
//   'standalone' / 'guest'    -> dev-client ou release (custom scheme)
//   undefined em web          -> tratamos como standalone (mock)
//
// Lanca quando env.json esta ausente ou sem android.client_id (via
// getClientIdFromEnv). Callers que querem fluxo throw-then-catch usam
// esta funcao; callers que preferem ramo defensivo (boot, render
// inicial) usam pickClientIdSafe abaixo.
export function pickClientId(): ClientIdInfo {
  const clientId = getClientIdFromEnv();
  const ambiente: ClientIdInfo['ambiente'] =
    Constants.appOwnership === 'expo' ? 'expo-go' : 'standalone';

  if (ambiente === 'expo-go') {
    return {
      clientId,
      // makeRedirectUri detecta automaticamente o proxy quando
      // o app roda em Expo Go.
      redirectUri: makeRedirectUri({ preferLocalhost: false }),
      ambiente,
    };
  }

  // Q22.B (2026-05-13, segunda causa raiz): OAuth client tipo iOS
  // do Google Cloud Console exige redirect_uri no formato reverso-DNS
  // do clientId, terminando em `:/oauthredirect`. Custom schemes
  // arbitrarios (`ouroboros://oauth-callback`) sao rejeitados pelo
  // Google com erro 400 invalid_request. O scheme reverso-DNS
  // (com.googleusercontent.apps.<client-id-prefix>) e' registrado
  // adicionalmente em app.json `scheme` array, permitindo que o
  // Android volte ao app quando o Google redirecionar pra essa URI.
  //
  // Formato canonico: dado clientId
  //   `<NUMERO>-<HASH>.apps.googleusercontent.com`
  // o reverso e':
  //   `com.googleusercontent.apps.<NUMERO>-<HASH>:/oauthredirect`
  const reverso = `com.googleusercontent.apps.${clientId.replace(
    '.apps.googleusercontent.com',
    ''
  )}`;
  return {
    clientId,
    redirectUri: `${reverso}:/oauthredirect`,
    ambiente,
  };
}

// Resultado defensivo de pickClientId. Quando env.json esta ausente ou
// sem android.client_id, retorna { erro } em vez de lancar; permite que
// callers em boot / render inicial mostrem fallback de UI ("OAuth
// indisponivel: env.json ausente") sem precisar wrap try/catch local.
//
// Discriminado por presenca da chave `erro` para narrowing TypeScript.
export type PickClientIdResultado = ClientIdInfo | { erro: string };

// Wrap defensivo de pickClientId. Captura QUALQUER erro de
// getClientIdFromEnv (env.json ausente, json malformado, client_id vazio)
// e devolve { erro: <mensagem> }. Callers diferenciam pelo discriminante:
//
//   const r = pickClientIdSafe();
//   if ('erro' in r) { /* renderiza fallback */ } else { /* usa r.clientId */ }
//
// Erros de outras origens (ex: importacao do Constants quebrada) tambem
// caem aqui; mensagem repassada para diagnostico de log.
export function pickClientIdSafe(): PickClientIdResultado {
  try {
    return pickClientId();
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : 'erro desconhecido em pickClientId';
    return { erro: mensagem };
  }
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

interface TrocarCodeInput {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}

// Troca code (PKCE) por tokens. Lanca em status >= 400 com texto
// do servidor para diagnostico.
export async function trocarCodePorToken(
  input: TrocarCodeInput
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: input.redirectUri,
  }).toString();

  const res = await fetch(GOOGLE_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const detalhe = await res.text();
    throw new Error(`trocarCodePorToken ${res.status}: ${detalhe}`);
  }
  return (await res.json()) as TokenResponse;
}

// Refresh do access token. Pode lancar 'invalid_grant' quando o
// usuario revogou acesso externamente (myaccount.google.com).
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();

  const res = await fetch(GOOGLE_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const detalhe = await res.text();
    if (res.status === 400 && detalhe.includes('invalid_grant')) {
      throw new InvalidGrantError(detalhe);
    }
    throw new Error(`refreshAccessToken ${res.status}: ${detalhe}`);
  }
  return (await res.json()) as TokenResponse;
}

export class InvalidGrantError extends Error {
  constructor(detalhe: string) {
    super(`invalid_grant: ${detalhe}`);
    this.name = 'InvalidGrantError';
  }
}

// Revoga token (access ou refresh). Idempotente; ignora 400 quando
// o token ja foi revogado.
export async function revogarToken(token: string): Promise<void> {
  const body = new URLSearchParams({ token }).toString();
  const res = await fetch(GOOGLE_DISCOVERY.revocationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  // 200 = revogado; 400 = ja revogado (ok). Outros lancam.
  if (res.status !== 200 && res.status !== 400) {
    const detalhe = await res.text();
    throw new Error(`revogarToken ${res.status}: ${detalhe}`);
  }
}
