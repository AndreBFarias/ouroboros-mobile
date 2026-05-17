// Funcoes puras do flow OAuth YouTube (R-INT-4, 2026-05-17).
// YouTube usa Google OAuth -- reusamos GOOGLE_DISCOVERY, mas com
// escopo `youtube.readonly` em vez de `calendar.events.readonly`.
//
// Decisao R-INT-4: store YouTube SEPARADO do googleAuth (Calendar).
// Justificativa:
//   - Google permite ate 1 escopo de cada vez no consent screen
//     quando user pede; multiplos escopos no mesmo refresh complicam
//     gerencia de erros (perda de Calendar quando YouTube revogado).
//   - User pode querer conectar Calendar mas nao YouTube, ou vice-versa.
//   - Refresh tokens sao por consent; misturar escopos pode forcar
//     re-consent inesperado.
//
// Reuso seletivo: importamos das funcoes de googleAuthFlow.ts:
//   - GOOGLE_DISCOVERY: endpoints OAuth (mesmos).
//   - trocarCodePorToken, refreshAccessToken, revogarToken: helpers
//     puros que ja existem e funcionam para qualquer escopo Google.
//   - InvalidGrantError: classe de erro reutilizada.
//
// Client ID: mesmo env.json.android.client_id usado pelo Calendar.
// Spotify tem chave separada, mas YouTube partilha o client_id Google
// porque ambos vivem no mesmo projeto Cloud (com.ouroboros.mobile).
// O usuario precisa apenas habilitar YouTube Data API v3 no Console
// do mesmo projeto.
//
// Comentarios sem acento (convencao shell/CI).
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import {
  GOOGLE_DISCOVERY,
  getClientIdFromEnv,
} from '@/lib/services/googleAuthFlow';

// Escopo unico: youtube.readonly. Acessa:
//   - GET /youtube/v3/videos: detalhes de video por id
//   - GET /youtube/v3/playlists: playlists do usuario (incluindo
//     "Watch later" como playlist `WL`).
//   - GET /youtube/v3/playlistItems: items de playlist (Liked = LL).
// Nao permite modificar nada na conta.
export const YOUTUBE_SCOPE =
  'https://www.googleapis.com/auth/youtube.readonly';

// Re-export do discovery Google. YouTube usa os mesmos endpoints.
export { GOOGLE_DISCOVERY as YOUTUBE_DISCOVERY };

export interface YouTubeClientIdInfo {
  clientId: string;
  redirectUri: string;
  ambiente: 'expo-go' | 'standalone';
}

// Detecta ambiente e devolve redirect_uri canonico Google (reverso-DNS
// terminando em :/oauthredirect). Mesma logica de googleAuthFlow.ts
// pickClientId, replicada aqui para isolamento e clareza (nao
// importamos pickClientId direto porque a logica de redirect_uri pode
// divergir no futuro se YouTube precisar de scheme distinto).
export function pickClientId(): YouTubeClientIdInfo {
  const clientId = getClientIdFromEnv();
  const ambiente: YouTubeClientIdInfo['ambiente'] =
    Constants.appOwnership === 'expo' ? 'expo-go' : 'standalone';

  if (ambiente === 'expo-go') {
    return {
      clientId,
      redirectUri: makeRedirectUri({ preferLocalhost: false }),
      ambiente,
    };
  }

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

// Wrap defensivo para callers de boot/render inicial.
export type PickYouTubeClientIdResultado =
  | YouTubeClientIdInfo
  | { erro: string };

export function pickClientIdSafe(): PickYouTubeClientIdResultado {
  try {
    return pickClientId();
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : 'erro desconhecido em pickClientId';
    return { erro: mensagem };
  }
}

// Re-export dos helpers de troca/refresh/revogacao do googleAuthFlow.
// YouTube usa os mesmos endpoints; nada precisa mudar.
export {
  trocarCodePorToken,
  refreshAccessToken,
  revogarToken,
  InvalidGrantError,
  type TokenResponse,
} from '@/lib/services/googleAuthFlow';
