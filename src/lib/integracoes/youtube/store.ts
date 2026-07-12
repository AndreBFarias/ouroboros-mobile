// Store zustand persist para tokens OAuth YouTube (R-INT-4, 2026-05-17).
// Conta unica (nao split pessoa_a/pessoa_b) -- YouTube e conta Google
// pessoal; em casal, cada um conecta no proprio device. v1 suporta
// apenas 1 conta por device.
//
// SecureStore via secureStorage adapter, chave 'ouroboros.youtube.v1'.
// Tokens cabem em ~1KB (A20 do BRIEF).
//
// Branch __DEV__ + Platform.OS === 'web': injeta token sintetico
// (mesmo padrao do googleAuth e spotify).
//
// Helpers OAuth de googleAuthFlow.ts importados DIRETO da origem
// (nao via re-export youtube/oauth) para que jest.spyOn funcione em
// testes -- ESM re-export cria propriedades nao-configuraveis, e
// `jest.spyOn(ytOAuth, 'refreshAccessToken')` falha com "Cannot
// redefine property". O re-export em youtube/oauth.ts e' mantido
// para conveniencia de callers externos que so importam de
// `youtube/oauth`.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { secureStorage } from '@/lib/stores/persist';
import {
  refreshAccessToken,
  revogarToken,
  trocarCodePorToken,
  InvalidGrantError,
} from '@/lib/services/googleAuthFlow';
import {
  pickClientId,
  YOUTUBE_DISCOVERY,
  YOUTUBE_SCOPE,
} from '@/lib/integracoes/youtube/oauth';

export interface ContaYouTube {
  accessToken: string | null;
  refreshToken: string | null;
  expiraEm: number; // epoch ms; 0 quando nunca conectado
  ultimaConexao: number; // epoch ms; 0 quando nunca conectado
  // Marcador soft: refresh token rejeitado -> usuario precisa reconectar.
  invalido: boolean;
  // Scope concedido (string separada por espacos).
  scope: string | null;
}

export type AutenticarYouTubeResultado =
  | { ok: true }
  | { ok: false; motivo: 'cancelado' | 'erro' | 'sem_client_id' };

export interface YouTubeAuthState {
  conta: ContaYouTube;
  // Inicia o flow OAuth PKCE. Em dev web, injeta token mock.
  autenticar: () => Promise<AutenticarYouTubeResultado>;
  // Revoga tokens no servidor Google e limpa locais.
  desconectar: () => Promise<void>;
  // Garante access token valido. Faz refresh se expirou em <60s.
  refreshIfNeeded: () => Promise<string | null>;
  // Marca conta como invalida (chamado por client.ts em 401).
  marcarInvalido: () => void;
}

const CONTA_VAZIA: ContaYouTube = {
  accessToken: null,
  refreshToken: null,
  expiraEm: 0,
  ultimaConexao: 0,
  invalido: false,
  scope: null,
};

const STORAGE_KEY = 'ouroboros.youtube.v1';
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
    accessToken: 'mock-youtube-access-token-dev-web',
    refreshToken: 'mock-youtube-refresh-token-dev-web',
    expiraEm: Date.now() + 3600_000,
    scope: YOUTUBE_SCOPE,
  };
}

export const useYouTubeAuth = create<YouTubeAuthState>()(
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
            scopes: [YOUTUBE_SCOPE, 'openid', 'email'],
            redirectUri,
            usePKCE: true,
            responseType: AuthSession.ResponseType.Code,
            extraParams: { access_type: 'offline', prompt: 'consent' },
          });
          await request.makeAuthUrlAsync(YOUTUBE_DISCOVERY);
          const resultado = await request.promptAsync(YOUTUBE_DISCOVERY, {
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
          if (e instanceof Error && e.message.includes('env.json')) {
            return { ok: false, motivo: 'sem_client_id' };
          }
          return { ok: false, motivo: 'erro' };
        }
      },
      desconectar: async () => {
        const c = get().conta;
        const tokenParaRevogar = c.refreshToken ?? c.accessToken;
        if (
          typeof tokenParaRevogar === 'string' &&
          tokenParaRevogar.length > 0
        ) {
          try {
            await revogarToken(tokenParaRevogar);
          } catch {
            // segue para limpeza local
          }
        }
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
          if (e instanceof InvalidGrantError) {
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
