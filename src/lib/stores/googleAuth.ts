// Store zustand persist para tokens OAuth Google de pessoa_a e
// pessoa_b. Persistido em SecureStore via secureStorage adapter
// (chave 'ouroboros.google.v1'). Tokens de cada conta cabem em
// menos de 2KB (vide A20 do BRIEF) — cache de eventos vai para
// arquivo, NUNCA aqui.
//
// Os campos sao serializaveis (string, number, null) para que o
// JSON persistido nao exploda em referencias circulares.
//
// Branch __DEV__ + Platform.OS === 'web': em dev web, autenticar()
// injeta token sintetico para validacao visual sem rede real
// (decisao §4 do spec). Em mobile real, abre o WebBrowser e
// realiza PKCE de verdade.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { secureStorage } from '@/lib/stores/persist';
import {
  GOOGLE_DISCOVERY,
  InvalidGrantError,
  pickClientId,
  refreshAccessToken,
  revogarToken,
  SCOPE_READONLY,
  trocarCodePorToken,
} from '@/lib/services/googleAuthFlow';

export interface ContaGoogle {
  accessToken: string | null;
  refreshToken: string | null;
  expiraEm: number; // epoch ms; 0 quando nunca conectado
  email: string | null;
  ultimaConexao: number; // epoch ms; 0 quando nunca conectado
  // Marcador soft: quando true, refresh token foi rejeitado e
  // o usuario precisa reconectar. UI mostra banner "invalido".
  invalido: boolean;
}

export type AutenticarResultado =
  | { ok: true }
  | { ok: false; motivo: 'cancelado' | 'erro' | 'sem_client_id' };

export interface GoogleAuthState {
  contas: { pessoa_a: ContaGoogle; pessoa_b: ContaGoogle };
  // Inicia o flow OAuth. Em dev web, injeta token mock; em mobile
  // real, abre WebBrowser e troca code por token.
  autenticar: (pessoa: PessoaAutor) => Promise<AutenticarResultado>;
  // Revoga tokens no servidor Google e limpa locais.
  revogar: (pessoa: PessoaAutor) => Promise<void>;
  // Garante access token valido. Faz refresh se expirou em <60s.
  // Retorna null quando refresh falhou (estado vira 'invalido').
  refreshIfNeeded: (pessoa: PessoaAutor) => Promise<string | null>;
  // Marca conta como invalida (chamado por calendarApi.ts em 401).
  marcarInvalido: (pessoa: PessoaAutor) => void;
}

const CONTA_VAZIA: ContaGoogle = {
  accessToken: null,
  refreshToken: null,
  expiraEm: 0,
  email: null,
  ultimaConexao: 0,
  invalido: false,
};

const ESTADO_INICIAL: { contas: GoogleAuthState['contas'] } = {
  contas: {
    pessoa_a: { ...CONTA_VAZIA },
    pessoa_b: { ...CONTA_VAZIA },
  },
};

// Chave de persist. v1 marca o shape atual; troca exige migracao.
const STORAGE_KEY = 'ouroboros.google.v1';

// Margem de tempo para renovar access token preventivamente.
const REFRESH_MARGEM_MS = 60_000;

// Mock OAuth para validacao Nivel A em web dev. Branch ativada
// apenas quando __DEV__ === true e Platform.OS === 'web'. Em
// release Android/iOS, dead-code (Platform.OS != 'web').
function isMockMode(): boolean {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  return dev && Platform.OS === 'web';
}

function tokenSinteticoMock(): {
  accessToken: string;
  refreshToken: string;
  expiraEm: number;
  email: string;
} {
  const agora = Date.now();
  return {
    accessToken: 'mock-access-token-dev-web',
    refreshToken: 'mock-refresh-token-dev-web',
    expiraEm: agora + 3600_000,
    email: 'usuario.mock@example.com',
  };
}

export const useGoogleAuth = create<GoogleAuthState>()(
  persist(
    (set, get) => ({
      ...ESTADO_INICIAL,
      autenticar: async (pessoa) => {
        if (isMockMode()) {
          const mock = tokenSinteticoMock();
          set((s) => ({
            contas: {
              ...s.contas,
              [pessoa]: {
                accessToken: mock.accessToken,
                refreshToken: mock.refreshToken,
                expiraEm: mock.expiraEm,
                email: mock.email,
                ultimaConexao: Date.now(),
                invalido: false,
              },
            },
          }));
          return { ok: true };
        }

        try {
          const { clientId, redirectUri } = pickClientId();
          // PKCE manual usando AuthRequest. Construimos a request,
          // disparamos, e processamos o resultado em uma so funcao
          // sem hook (chamada de servico, nao componente).
          const request = new AuthSession.AuthRequest({
            clientId,
            scopes: [SCOPE_READONLY, 'openid', 'email'],
            redirectUri,
            usePKCE: true,
            responseType: AuthSession.ResponseType.Code,
            extraParams: { access_type: 'offline', prompt: 'consent' },
          });
          await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
          const resultado = await request.promptAsync(GOOGLE_DISCOVERY, {
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
          // email vem no id_token (jwt). Nao validamos assinatura aqui;
          // confiamos no canal HTTPS direto com Google. Decode simples:
          let email: string | null = null;
          if (typeof tokens.id_token === 'string') {
            email = decodeEmailDoIdToken(tokens.id_token);
          }
          set((s) => ({
            contas: {
              ...s.contas,
              [pessoa]: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? null,
                expiraEm: Date.now() + tokens.expires_in * 1000,
                email,
                ultimaConexao: Date.now(),
                invalido: false,
              },
            },
          }));
          return { ok: true };
        } catch (e) {
          if (e instanceof Error && e.message.includes('env.json')) {
            return { ok: false, motivo: 'sem_client_id' };
          }
          return { ok: false, motivo: 'erro' };
        }
      },
      revogar: async (pessoa) => {
        const conta = get().contas[pessoa];
        const tokenParaRevogar = conta.refreshToken ?? conta.accessToken;
        if (
          typeof tokenParaRevogar === 'string' &&
          tokenParaRevogar.length > 0
        ) {
          // Best-effort: ignora erro de rede para nao travar revogacao
          // local. Se servidor recusou, conta ainda fica zerada local.
          try {
            await revogarToken(tokenParaRevogar);
          } catch {
            // segue para limpeza local
          }
        }
        set((s) => ({
          contas: {
            ...s.contas,
            [pessoa]: { ...CONTA_VAZIA },
          },
        }));
      },
      refreshIfNeeded: async (pessoa) => {
        const conta = get().contas[pessoa];
        if (
          typeof conta.accessToken !== 'string' ||
          conta.accessToken.length === 0 ||
          conta.invalido
        ) {
          return null;
        }
        const agora = Date.now();
        if (conta.expiraEm > agora + REFRESH_MARGEM_MS) {
          return conta.accessToken;
        }
        if (
          typeof conta.refreshToken !== 'string' ||
          conta.refreshToken.length === 0
        ) {
          // sem refresh, marca invalido
          get().marcarInvalido(pessoa);
          return null;
        }
        if (isMockMode()) {
          // em web dev, fingimos refresh sucesso com novo expiraEm.
          set((s) => ({
            contas: {
              ...s.contas,
              [pessoa]: {
                ...s.contas[pessoa],
                expiraEm: Date.now() + 3600_000,
              },
            },
          }));
          return get().contas[pessoa].accessToken;
        }
        try {
          const { clientId } = pickClientId();
          const novo = await refreshAccessToken(conta.refreshToken, clientId);
          set((s) => ({
            contas: {
              ...s.contas,
              [pessoa]: {
                ...s.contas[pessoa],
                accessToken: novo.access_token,
                expiraEm: Date.now() + novo.expires_in * 1000,
                refreshToken:
                  novo.refresh_token ?? s.contas[pessoa].refreshToken,
                invalido: false,
              },
            },
          }));
          return novo.access_token;
        } catch (e) {
          if (e instanceof InvalidGrantError) {
            get().marcarInvalido(pessoa);
            return null;
          }
          // erro transient: nao zera estado, apenas devolve null
          return null;
        }
      },
      marcarInvalido: (pessoa) => {
        set((s) => ({
          contas: {
            ...s.contas,
            [pessoa]: {
              ...s.contas[pessoa],
              accessToken: null,
              expiraEm: 0,
              invalido: true,
            },
          },
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      // Persistimos contas inteiras (tokens curtos, cabem em 2KB).
      partialize: (s) => ({ contas: s.contas }),
    }
  )
);

// Decode rudimentar do payload de um JWT id_token Google. NAO
// valida assinatura — apenas extrai 'email'. Confiamos no canal
// HTTPS direto com Google (token chega via fetch para token endpoint
// oficial). Retorna null em qualquer falha.
function decodeEmailDoIdToken(idToken: string): string | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1] ?? '';
    // base64url -> base64
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const raw =
      typeof atob === 'function'
        ? atob(padded)
        : ((globalThis as any).Buffer?.from(padded, 'base64').toString(
            'utf8'
          ) ?? '');
    const json = JSON.parse(raw) as { email?: unknown };
    return typeof json.email === 'string' ? json.email : null;
  } catch {
    return null;
  }
}
