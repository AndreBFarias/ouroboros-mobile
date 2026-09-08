// Store das credenciais que a pessoa cadastra no proprio aparelho
// (P4 das decisoes de 2026-09-08, "credencial por usuario com
// degradacao graciosa e visivel").
//
// POR QUE ESTE MODULO EXISTE
//
// Ate 2026-09-08 o client_id do Google e o do Spotify entravam por
// import ESTATICO de env.json em src/lib/services/googleAuthFlow.ts e
// src/lib/integracoes/spotify/oauth.ts. Isso tinha tres consequencias:
//
//   1. Clone sem env.json nao empacotava -- o Metro falhava resolvendo
//      o modulo, e a mensagem falava de arquivo ausente, nao de OAuth.
//   2. Quem instalava o APK herdava a credencial de outra pessoa. O
//      consent screen do Google esta em modo Testing com allowlist e o
//      teto do Development mode do Spotify e' de 5 contas: fora da
//      lista, Agenda, backup no Drive e YouTube falhavam de forma
//      opaca no primeiro uso.
//   3. Armadilhas A39 e A43 (env.json ausente no CI, env.json symlink
//      colidindo com jest.doMock) nasciam justamente desse import.
//
// Agora a leitura e' em RUNTIME e tolerante a ausencia: sem credencial
// salva, as integracoes ficam desligadas e a interface diz por que, em
// vez de tentar conectar e receber uma recusa do servidor.
//
// ONDE O VALOR MORA
//
// SecureStore (via o adapter secureStorage, que cai em localStorage no
// Web para o Gauntlet). Fora do bundle, portanto: nao entra no APK, nao
// entra no git, e desinstalar o aplicativo leva a credencial junto.
// Client_id cabe folgado no limite de ~2KB do SecureStore (A20); nao
// guardamos client_secret -- os dois fluxos sao PKCE, onde o client_id
// e' publico por desenho e nao existe secret para proteger.
//
// LEITURA SINCRONA
//
// pickClientId() e' sincrono e roda dentro do fluxo OAuth. Por isso os
// leitores abaixo consultam getState() em vez de expor Promise. A
// hidratacao do persist e' assincrona: durante os primeiros frames do
// boot, clientIdDe() devolve null mesmo com credencial salva. Isso e'
// aceitavel porque todo caminho que le a credencial parte de um toque
// da pessoa, muito depois da hidratacao -- o mesmo pressuposto que os
// stores de token (googleAuth, spotify, youtube) ja fazem.
//
// Comentarios sem acento (convencao shell/CI). Strings de UI em PT-BR
// com acentuacao completa.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';

// Os dois provedores que exigem credencial propria. O Google cobre
// Agenda (Calendar), backup no Drive e YouTube -- um unico client_id
// atende os tres, porque sao o mesmo projeto no Cloud Console.
export type ServicoCredencial = 'google' | 'spotify';

export interface CredenciaisState {
  google: string | null;
  spotify: string | null;
  // Salva a credencial. Valor em branco equivale a remover: a pessoa
  // apagar o campo e confirmar e' um jeito legitimo de desligar.
  definir: (servico: ServicoCredencial, valor: string) => void;
  remover: (servico: ServicoCredencial) => void;
}

const STORAGE_KEY = 'ouroboros.credenciais.v1';

const VAZIO: Pick<CredenciaisState, 'google' | 'spotify'> = {
  google: null,
  spotify: null,
};

// Normaliza o que a pessoa colou: espaco em volta some (colar de um PDF
// ou de um campo do painel arrasta espaco com frequencia) e string
// vazia vira null, para que "existe credencial" seja uma pergunta so.
export function normalizarClientId(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  return limpo.length > 0 ? limpo : null;
}

export const useCredenciais = create<CredenciaisState>()(
  persist(
    (set) => ({
      ...VAZIO,
      definir: (servico, valor) => {
        set({ [servico]: normalizarClientId(valor) } as Partial<
          Pick<CredenciaisState, ServicoCredencial>
        >);
      },
      remover: (servico) => {
        set({ [servico]: null } as Partial<
          Pick<CredenciaisState, ServicoCredencial>
        >);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ google: s.google, spotify: s.spotify }),
      // Armadilha A47: o merge shallow padrao do zustand deixa chave
      // nova hidratar `undefined` em instalacao antiga. Com deep-merge
      // dos defaults, um provedor acrescentado numa sprint futura
      // nasce null (ausente) em vez de undefined (indefinido), e o
      // codigo que pergunta "tem credencial?" nao decide por lixo.
      merge: mergeCredenciaisPersistido,
    }
  )
);

// Exportada para o teste exercitar o codigo REAL cabeado em `merge`
// acima, em vez de uma replica tautologica (mesmo padrao de
// mergeSpotifyPersistido). Spread de currentState PRIMEIRO para
// preservar as acoes do store.
export function mergeCredenciaisPersistido(
  persistedState: unknown,
  currentState: CredenciaisState
): CredenciaisState {
  if (!persistedState || typeof persistedState !== 'object') {
    return currentState;
  }
  const ps = persistedState as Record<string, unknown>;
  return {
    ...currentState,
    google: normalizarClientId(ps.google),
    spotify: normalizarClientId(ps.spotify),
  };
}

// Erro de AUSENCIA de credencial, com tipo proprio.
//
// Antes de P4 os stores decidiam entre `motivo: 'sem_client_id'` e
// `motivo: 'erro'` farejando a substring 'env.json' na mensagem
// (src/lib/stores/googleAuth.ts, integracoes/youtube/store.ts,
// integracoes/spotify/store.ts). Isso amarrava um ramo de interface ao
// texto de uma mensagem: bastava reescrever a frase para o caminho
// honesto virar "erro" generico, em silencio e com a suite verde.
// Com classe propria, quem pergunta "e' ausencia de credencial?"
// pergunta ao tipo, e a frase fica livre para mudar.
export class SemCredencialError extends Error {
  readonly servico: ServicoCredencial;

  constructor(servico: ServicoCredencial, mensagem: string) {
    super(mensagem);
    this.name = 'SemCredencialError';
    this.servico = servico;
  }
}

export function ehSemCredencial(e: unknown): e is SemCredencialError {
  return e instanceof SemCredencialError;
}

// Leitura sincrona da credencial. null quando a pessoa ainda nao
// cadastrou -- ausencia, nao defeito.
export function clientIdDe(servico: ServicoCredencial): string | null {
  return normalizarClientId(useCredenciais.getState()[servico]);
}

export function temCredencial(servico: ServicoCredencial): boolean {
  return clientIdDe(servico) !== null;
}

// Conferencia de FORMA, nao de validade. Serve para a tela avisar que o
// valor colado provavelmente veio pela metade, antes de a pessoa
// descobrir isso no meio do fluxo OAuth. Nao bloqueia nada: se o Google
// ou o Spotify mudarem o formato, quem decide continua sendo o servidor
// deles, e a pessoa segue conseguindo salvar o que tem em maos.
//
// Google: o client_id do Cloud Console termina em
// `.apps.googleusercontent.com`, e pickClientId depende disso para
// montar o redirect reverso-DNS (Q22.B).
// Spotify: 32 caracteres hexadecimais, conforme o painel de
// developer.spotify.com.
export function pareceClientIdCompleto(
  servico: ServicoCredencial,
  valor: string
): boolean {
  const v = normalizarClientId(valor);
  if (v === null) return false;
  if (servico === 'google') return v.endsWith('.apps.googleusercontent.com');
  return /^[0-9a-f]{32}$/i.test(v);
}
