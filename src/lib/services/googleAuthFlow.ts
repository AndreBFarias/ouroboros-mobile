// Funcoes puras do flow OAuth Google. Separadas do store para
// permitir testes determinísticos via fetch mockado e isolar
// detalhes do split clientId (vide A21 do BRIEF).
//
// Decisao P4 de 2026-09-08 (credencial por usuario): o client_id
// deixou de vir de um import ESTATICO de env.json e passa a ser lido em
// RUNTIME do store de credenciais, alimentado pela tela
// /settings/credenciais. Consequencias, na ordem em que importam:
//
//   - o aplicativo empacota e sobe SEM env.json nenhum;
//   - quem instala o APK usa a propria credencial, em vez de herdar a
//     de outra pessoa e esbarrar na allowlist do consent screen;
//   - as armadilhas A39 e A43 perdem a origem, porque nenhum arquivo
//     de src/ resolve mais o modulo env.json.
//
// A decisao anterior (2026-05-05, client_id em env.json em vez de
// EXPO_PUBLIC_*) fica registrada aqui porque explica o formato do
// valor: e' o mesmo client_id tipo `android` do Google Cloud Console,
// que serve tanto ao Expo Go (proxy) quanto ao dev-client e release
// (custom-scheme). O que mudou foi de onde ele vem, nao o que ele e'.
//
// Comentarios sem acento (convencao shell/CI).
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import { clientIdDe, SemCredencialError } from '@/lib/stores/credenciais';

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

export const SCOPE_READONLY =
  'https://www.googleapis.com/auth/calendar.events.readonly';

// M37.2 (escrita no Google Calendar): escopo read+write dos eventos.
// Superset de SCOPE_READONLY -- conceder calendar.events permite tanto
// listar quanto criar/deletar eventos. Google obriga reconsentimento do
// usuario para subir de readonly para este escopo (ver
// autenticarComEscopoEscrita em googleAuth.ts). Escopo minimo: nao pede
// 'calendar' completo (que daria acesso a calendarios secundarios e
// metadados alem do necessario).
export const SCOPE_CALENDAR_EVENTS =
  'https://www.googleapis.com/auth/calendar.events';

// R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO (2026-05-25): scope para upload de
// arquivos criados pelo proprio app no Drive do usuario. drive.file e' o
// scope MINIMO (nao-sensivel ao ponto de exigir verificacao pesada como
// drive completo): da acesso apenas a arquivos que o app criou/abriu, nao
// ao Drive inteiro. Mesmo assim, o Google exige que o scope seja
// registrado no OAuth consent screen do Cloud Console antes do upload
// funcionar em release (passo humano R-SEC-1). Ate la, o codigo fica
// dormente: o toggle backupDriveAutomatico nasce OFF e o cliente Drive so
// e' chamado quando o usuario liga explicitamente.
export const SCOPE_DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';

export interface ClientIdInfo {
  clientId: string;
  redirectUri: string;
  ambiente: 'expo-go' | 'standalone';
}

// Le o client_id do Google que a pessoa cadastrou neste aparelho.
// Lanca quando nao ha nenhum, para que o caller decida entre o ramo
// defensivo (pickClientIdSafe) e o try/catch que vira
// `motivo: 'sem_client_id'` nos stores. A mensagem descreve uma
// ausencia e aponta o caminho -- nao e' relato de defeito.
export function getClientIdGoogle(): string {
  const cid = clientIdDe('google');
  if (cid === null) {
    throw new SemCredencialError(
      'google',
      'Sem credencial do Google neste aparelho. Cadastre em Configurações, Credenciais próprias.'
    );
  }
  return cid;
}

// Detecta ambiente via Constants.appOwnership (vide A21).
//   'expo'                    -> Expo Go (usa proxy auth.expo.io)
//   'standalone' / 'guest'    -> dev-client ou release (custom scheme)
//   undefined em web          -> tratamos como standalone (mock)
//
// Lanca quando nao ha credencial do Google salva (via
// getClientIdGoogle). Callers que querem fluxo throw-then-catch usam
// esta funcao; callers que preferem ramo defensivo (boot, render
// inicial) usam pickClientIdSafe abaixo.
export function pickClientId(): ClientIdInfo {
  const clientId = getClientIdGoogle();
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

// Resultado defensivo de pickClientId. Quando nao ha credencial do
// Google salva, retorna { erro } em vez de lancar; permite que callers
// em boot / render inicial mostrem o texto de ausencia sem precisar
// wrap try/catch local.
//
// Discriminado por presenca da chave `erro` para narrowing TypeScript.
export type PickClientIdResultado = ClientIdInfo | { erro: string };

// Wrap defensivo de pickClientId. Captura QUALQUER erro de
// getClientIdGoogle (credencial ausente ou em branco) e devolve
// { erro: <mensagem> }. Callers diferenciam pelo discriminante:
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
