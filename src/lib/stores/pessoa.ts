// Store de identidade de pessoa. Mantem dois eixos:
//   - pessoaAtiva: quem esta usando o app neste momento (autor de novos
//     registros). Não aceita 'ambos' porque novo registro tem autor unico.
//   - filtroPessoa: lente de visualizacao, aceita 'ambos' para listas
//     combinadas.
// Persist via SecureStore para preservar nomes reais entre sessoes.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PESSOAS_CONFIG } from '@/config/pessoas.config';
import type { PessoaAutor, PessoaId } from '@/lib/schemas/pessoa';
import { secureStorage } from '@/lib/stores/persist';
import { useOnboarding } from '@/lib/stores/onboarding';
import { escreverEstadoCanonico } from '@/lib/vault/escreverEstado';

export interface PessoaStore {
  pessoaAtiva: PessoaAutor;
  filtroPessoa: PessoaId;
  nomes: Record<PessoaAutor, string>;
  // URI local da foto de perfil (após copiar para documentDirectory).
  // null = sem foto, fallback para inicial em fundo colorido.
  fotos: Record<PessoaAutor, string | null>;
  setPessoaAtiva: (p: PessoaAutor) => void;
  setFiltroPessoa: (p: PessoaId) => void;
  setNome: (p: PessoaAutor, nome: string) => void;
  setFoto: (p: PessoaAutor, uri: string | null) => void;
  // Volta nomes e fotos aos defaults. Útil para reset de onboarding
  // em ambiente de desenvolvimento ou para botao "limpar dados" em
  // settings.
  resetar: () => void;
}

// AUDIT-P1-8 (2026-07-28): defaults extraídos dos literais inline.
// Exportados para que o back-fill do restore (aplicarSnapshot em
// restaurarVault.ts) use exatamente o mesmo default do store.
export const NOMES_DEFAULT: Record<PessoaAutor, string> = {
  pessoa_a: PESSOAS_CONFIG.pessoa_a.nome,
  pessoa_b: PESSOAS_CONFIG.pessoa_b.nome,
};

export const FOTOS_DEFAULT: Record<PessoaAutor, string | null> = {
  pessoa_a: null,
  pessoa_b: null,
};

const DEFAULT_STATE: Omit<
  PessoaStore,
  'setPessoaAtiva' | 'setFiltroPessoa' | 'setNome' | 'setFoto' | 'resetar'
> = {
  pessoaAtiva: 'pessoa_a',
  filtroPessoa: 'pessoa_a',
  nomes: NOMES_DEFAULT,
  fotos: FOTOS_DEFAULT,
};

export const usePessoa = create<PessoaStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setPessoaAtiva: (pessoaAtiva) => set({ pessoaAtiva }),
      setFiltroPessoa: (filtroPessoa) => set({ filtroPessoa }),
      setNome: (p, nome) => set((s) => ({ nomes: { ...s.nomes, [p]: nome } })),
      setFoto: (p, uri) => set((s) => ({ fotos: { ...s.fotos, [p]: uri } })),
      resetar: () =>
        set({
          ...DEFAULT_STATE,
          nomes: { ...NOMES_DEFAULT },
          fotos: { ...FOTOS_DEFAULT },
        }),
    }),
    {
      name: 'ouroboros.pessoa.v1',
      storage: createJSONStorage(() => secureStorage),
      // AUDIT-P1-8 (2026-07-28): merge custom na hidratação (armadilha
      // A47). Sem ele o merge shallow padrão do zustand faz o objeto
      // `fotos` (ou `nomes`) persistido substituir o default inteiro:
      // uma pessoa nova acrescentada ao Record hidrataria `undefined` e
      // o avatar dela cairia para a inicial. Store sem version/migrate;
      // o merge roda em toda hidratação e por isso basta.
      merge: mergePessoaPersistido,
    }
  )
);

// AUDIT-P1-8: deep-merge do estado persistido com os defaults, um
// sub-objeto por vez. Chave ausente cai no default; chave presente
// (nome escolhido, foto escolhida) vence o default.
function mesclarDefaultsPessoa(
  ps: Record<string, unknown>
): typeof DEFAULT_STATE {
  return {
    ...DEFAULT_STATE,
    ...ps,
    nomes: {
      ...NOMES_DEFAULT,
      ...((ps.nomes as Record<string, unknown>) ?? {}),
    },
    fotos: {
      ...FOTOS_DEFAULT,
      ...((ps.fotos as Record<string, unknown>) ?? {}),
    },
  } as typeof DEFAULT_STATE;
}

// AUDIT-P1-8 (2026-07-28): função de merge da hidratação do persist.
// Exportada para o teste exercitar o CÓDIGO REAL (cabeado em `merge`
// acima) em vez de uma réplica tautológica. Guard para persistedState
// null/não-objeto e spread de `currentState` PRIMEIRO para preservar as
// AÇÕES do store.
export function mergePessoaPersistido(
  persistedState: unknown,
  currentState: PessoaStore
): PessoaStore {
  if (!persistedState || typeof persistedState !== 'object') {
    return currentState;
  }
  return {
    ...currentState,
    ...mesclarDefaultsPessoa(persistedState as Record<string, unknown>),
  };
}

// R-VAULT-CANONICAL-COMPLETE-A (2026-05-16): subscriber nao-mutativo
// que espelha o estado em vault/_estado/pessoa-<deviceId>.md. Debounced
// 500ms por key dentro de escreverEstadoCanonico.
//
// AUDIT-P4-8 (2026-09-05): `nomes` e `fotos` saíram do payload. O .md
// vive num Vault que o Syncthing propaga e que a exportação empacota;
// nome real e URI de foto ficam só no SecureStore. Só os
// identificadores canônicos vão para o espelho.
usePessoa.subscribe((state) => {
  escreverEstadoCanonico('pessoa', {
    pessoaAtiva: state.pessoaAtiva,
    filtroPessoa: state.filtroPessoa,
  });
});

// Resolve nome de exibicao para qualquer PessoaId (inclui 'ambos').
// Para autores (pessoa_a/b), pega do store; para 'ambos', ramifica por
// tipoCompanhia: 'casal' -> 'Casal', 'amigos' -> 'Todos', fallback
// defensivo 'Ambos' (sozinho nunca deveria pedir o label, mas mantem a
// resposta sensata para nao quebrar UI). Versao sincrona usa getState
// (nao reativa) — reservado para logging, sort e util fora de
// componentes.
export function nomeDe(pessoa: PessoaId): string {
  if (pessoa === 'ambos') {
    const { tipoCompanhia } = useOnboarding.getState();
    if (tipoCompanhia === 'casal') return 'Casal';
    if (tipoCompanhia === 'amigos') return 'Todos';
    return 'Ambos';
  }
  const { nomes } = usePessoa.getState();
  return nomes[pessoa] ?? PESSOAS_CONFIG[pessoa].nome;
}

// Versao reativa de nomeDe(): usa o seletor zustand para que componentes
// re-renderizem quando o nome muda (ex: usuario edita em Settings) ou
// quando tipoCompanhia muda em runtime (ex: troca de modo no
// onboarding). Use dentro de componentes; fora deles (logging, sort,
// util sincrono), continue com nomeDe() puro.
export function useNomeDe(pessoa: PessoaId): string {
  const nomeA = usePessoa((s) => s.nomes.pessoa_a);
  const nomeB = usePessoa((s) => s.nomes.pessoa_b);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
  if (pessoa === 'pessoa_a') {
    return nomeA ?? PESSOAS_CONFIG.pessoa_a.nome;
  }
  if (pessoa === 'pessoa_b') {
    return nomeB ?? PESSOAS_CONFIG.pessoa_b.nome;
  }
  // 'ambos':
  if (tipoCompanhia === 'casal') return 'Casal';
  if (tipoCompanhia === 'amigos') return 'Todos';
  return 'Ambos';
}
