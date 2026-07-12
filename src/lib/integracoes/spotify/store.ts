// Store zustand persist para tokens OAuth Spotify (R-INT-4, 2026-05-17).
// Espelha o padrao de useGoogleAuth: tokens em SecureStore via
// secureStorage adapter, chave canonica 'ouroboros.spotify.v1'.
//
// Tokens cabem em ~1KB (access + refresh + expira_em + scope); seguro
// pra SecureStore (A20 do BRIEF: limite ~2KB por valor).
//
// Diferencas vs Google:
//   - Conta unica (nao split pessoa_a/pessoa_b). Spotify e perfil
//     individual; em casal cada um tem sua propria conta no
//     dispositivo. v1 suporta apenas 1 conta conectada por device.
//   - Sem id_token (Spotify nao emite JWT OIDC). email/displayName
//     vem da Web API /me apos primeiro fetch -- v1 nao salva (read
//     direto quando precisar).
//
// Branch __DEV__ + Platform.OS === 'web': injeta token sintetico para
// validacao Gauntlet sem rede real (mesmo padrao do googleAuth).
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { secureStorage } from '@/lib/stores/persist';
import {
  pickClientId,
  refreshAccessToken,
  SpotifyInvalidGrantError,
  SPOTIFY_DISCOVERY,
  SPOTIFY_SCOPES,
  trocarCodePorToken,
} from '@/lib/integracoes/spotify/oauth';

export interface ContaSpotify {
  accessToken: string | null;
  refreshToken: string | null;
  expiraEm: number; // epoch ms; 0 quando nunca conectado
  ultimaConexao: number; // epoch ms; 0 quando nunca conectado
  // Marcador soft: refresh token rejeitado -> usuario precisa reconectar.
  invalido: boolean;
  // Scope concedido (string separada por espacos retornada pela API).
  // Util para detectar se a conta foi conectada com escopos antigos.
  scope: string | null;
}

export type AutenticarSpotifyResultado =
  | { ok: true }
  | { ok: false; motivo: 'cancelado' | 'erro' | 'sem_client_id' };

export interface SpotifyAuthState {
  conta: ContaSpotify;
  // Inicia o flow OAuth PKCE. Em dev web, injeta token mock; em mobile
  // real, abre WebBrowser e troca code por token.
  autenticar: () => Promise<AutenticarSpotifyResultado>;
  // Limpa tokens locais. Spotify nao tem endpoint de revogacao
  // publico (diferente do Google revoke); o usuario precisa revogar
  // manualmente em https://www.spotify.com/account/apps/.
  desconectar: () => void;
  // Garante access token valido. Faz refresh se expirou em <60s.
  // Retorna null quando refresh falhou (estado vira 'invalido').
  refreshIfNeeded: () => Promise<string | null>;
  // Marca conta como invalida (chamado por client.ts em 401).
  marcarInvalido: () => void;
}

const CONTA_VAZIA: ContaSpotify = {
  accessToken: null,
  refreshToken: null,
  expiraEm: 0,
  ultimaConexao: 0,
  invalido: false,
  scope: null,
};

const STORAGE_KEY = 'ouroboros.spotify.v1';
const REFRESH_MARGEM_MS = 60_000;

function isMockMode(): boolean {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  return dev && Platform.OS === 'web';
}

function tokenSinteticoMock(): {
  accessToken: string;
  refreshToken: string;
  expiraEm: number;
  scope: string;
} {
  return {
    accessToken: 'mock-spotify-access-token-dev-web',
    refreshToken: 'mock-spotify-refresh-token-dev-web',
    expiraEm: Date.now() + 3600_000,
    scope: SPOTIFY_SCOPES.join(' '),
  };
}

export const useSpotifyAuth = create<SpotifyAuthState>()(
  persist(
    (set, get) => ({
      conta: { ...CONTA_VAZIA },
      autenticar: async () => {
        if (isMockMode()) {
          const mock = tokenSinteticoMock();
          set({
            conta: {
              accessToken: mock.accessToken,
              refreshToken: mock.refreshToken,
              expiraEm: mock.expiraEm,
              ultimaConexao: Date.now(),
              invalido: false,
              scope: mock.scope,
            },
          });
          return { ok: true };
        }

        try {
          const { clientId, redirectUri } = pickClientId();
          const request = new AuthSession.AuthRequest({
            clientId,
            scopes: [...SPOTIFY_SCOPES],
            redirectUri,
            usePKCE: true,
            responseType: AuthSession.ResponseType.Code,
          });
          await request.makeAuthUrlAsync(SPOTIFY_DISCOVERY);
          const resultado = await request.promptAsync(SPOTIFY_DISCOVERY, {
            showInRecents: true,
          });
          if (resultado.type === 'cancel' || resultado.type === 'dismiss') {
            return { ok: false, motivo: 'cancelado' };
          }
          if (resultado.type !== 'success') {
            return { ok: false, motivo: 'erro' };
          }
          const code = resultado.params.code;
          const codeVerifier = request.codeVerifier;
          if (typeof code !== 'string' || typeof codeVerifier !== 'string') {
            return { ok: false, motivo: 'erro' };
          }
          const tokens = await trocarCodePorToken({
            code,
            codeVerifier,
            clientId,
            redirectUri,
          });
          set({
            conta: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token ?? null,
              expiraEm: Date.now() + tokens.expires_in * 1000,
              ultimaConexao: Date.now(),
              invalido: false,
              scope: tokens.scope ?? null,
            },
          });
          return { ok: true };
        } catch (e) {
          if (e instanceof Error && e.message.includes('spotify.client_id')) {
            return { ok: false, motivo: 'sem_client_id' };
          }
          return { ok: false, motivo: 'erro' };
        }
      },
      desconectar: () => {
        // Spotify nao expoe revoke endpoint publico. Limpamos local
        // e o usuario revoga manualmente em
        // https://www.spotify.com/account/apps/ se quiser.
        set({ conta: { ...CONTA_VAZIA } });
      },
      refreshIfNeeded: async () => {
        const c = get().conta;
        if (
          typeof c.accessToken !== 'string' ||
          c.accessToken.length === 0 ||
          c.invalido
        ) {
          return null;
        }
        const agora = Date.now();
        if (c.expiraEm > agora + REFRESH_MARGEM_MS) {
          return c.accessToken;
        }
        if (typeof c.refreshToken !== 'string' || c.refreshToken.length === 0) {
          get().marcarInvalido();
          return null;
        }
        if (isMockMode()) {
          set((s) => ({
            conta: { ...s.conta, expiraEm: Date.now() + 3600_000 },
          }));
          return get().conta.accessToken;
        }
        try {
          const { clientId } = pickClientId();
          const novo = await refreshAccessToken(c.refreshToken, clientId);
          set((s) => ({
            conta: {
              ...s.conta,
              accessToken: novo.access_token,
              expiraEm: Date.now() + novo.expires_in * 1000,
              refreshToken: novo.refresh_token ?? s.conta.refreshToken,
              invalido: false,
              scope: novo.scope ?? s.conta.scope,
            },
          }));
          return novo.access_token;
        } catch (e) {
          if (e instanceof SpotifyInvalidGrantError) {
            get().marcarInvalido();
            return null;
          }
          return null;
        }
      },
      marcarInvalido: () => {
        set((s) => ({
          conta: {
            ...s.conta,
            accessToken: null,
            expiraEm: 0,
            invalido: true,
          },
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ conta: s.conta }),
    }
  )
);
