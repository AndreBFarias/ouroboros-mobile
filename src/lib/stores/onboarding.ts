// Store de onboarding. Marca conclusao do fluxo (M23 -> H3 -> J1) e
// guarda escolhas informativas: tipo de companhia (esconde toggle
// pessoa quando sozinho), sexo declarado de cada pessoa (usado por
// I-CICLO e similares para inferencia padrao) e status das
// permissoes pedidas no Frame "Permissoes" (J1).
//
// Persiste em SecureStore via secureStorage adapter. Bump de chave
// para v3 em J1: usuarios v2 ganham defaults novos (sexoDeclarado
// null, permissoes com storage true e demais false). O fluxo de
// onboarding e refeito quando done=false.
//
// V4.0.2 (2026-05-08): setTipoCompanhia agora ESPELHA a escolha em
// useSettings.pessoa.tipoCompanhia (mapeia casal/amigos -> 'duo',
// sozinho -> 'sozinho'). Sem isso, SeletorPara, SeletorPessoaDestino,
// ItemTarefa e editar-pessoa.tsx (que leem de useSettings) ficavam
// presos em modo 'sozinho' independente da escolha do usuario.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { useSettings } from '@/lib/stores/settings';
import { escreverEstadoCanonico } from '@/lib/vault/escreverEstado';

export type TipoCompanhia = 'sozinho' | 'casal' | 'amigos';

export type SexoDeclarado =
  | 'masculino'
  | 'feminino'
  | 'nao-binario'
  | 'prefiro-nao-dizer'
  | null;

export type ChavePermissaoOnboarding =
  | 'storage'
  | 'camera'
  | 'microfone'
  | 'notificacoes'
  | 'localizacao';

export interface PermissoesOnboarding {
  // storage e implicito: marcado true ao final do Frame 2 (pasta).
  storage: boolean;
  camera: boolean;
  microfone: boolean;
  notificacoes: boolean;
  localizacao: boolean;
}

export interface SexoPorPessoa {
  pessoa_a: SexoDeclarado;
  pessoa_b: SexoDeclarado;
}

export interface OnboardingStore {
  done: boolean;
  tipoCompanhia: TipoCompanhia;
  sexoDeclarado: SexoPorPessoa;
  permissoes: PermissoesOnboarding;
  setTipoCompanhia: (t: TipoCompanhia) => void;
  setSexoDeclarado: (pessoa: PessoaAutor, sexo: SexoDeclarado) => void;
  setPermissao: (chave: ChavePermissaoOnboarding, granted: boolean) => void;
  marcarConcluido: () => void;
  resetar: () => void;
}

// AUDIT-P1-8 (2026-07-28): exportados para que o back-fill do restore
// (aplicarSnapshot em restaurarVault.ts) use exatamente o mesmo default
// do store, sem replicar o literal.
export const PERMISSOES_DEFAULT: PermissoesOnboarding = {
  storage: false,
  camera: false,
  microfone: false,
  notificacoes: false,
  localizacao: false,
};

export const SEXO_DEFAULT: SexoPorPessoa = {
  pessoa_a: null,
  pessoa_b: null,
};

// AUDIT-P1-8: estado inicial em constante unica. Fonte dos defaults do
// merge de hidratacao logo abaixo (evita drift entre o que o store
// comeca e o que o back-fill considera default).
const DEFAULT_STATE: Omit<
  OnboardingStore,
  | 'setTipoCompanhia'
  | 'setSexoDeclarado'
  | 'setPermissao'
  | 'marcarConcluido'
  | 'resetar'
> = {
  done: false,
  tipoCompanhia: 'sozinho',
  sexoDeclarado: SEXO_DEFAULT,
  permissoes: PERMISSOES_DEFAULT,
};

export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setTipoCompanhia: (tipoCompanhia) => {
        set({ tipoCompanhia });
        // Espelha em useSettings (canonico para componentes pos-M29)
        // mapeando: casal/amigos -> 'duo', sozinho -> 'sozinho'.
        const settingsValue: 'sozinho' | 'duo' =
          tipoCompanhia === 'sozinho' ? 'sozinho' : 'duo';
        useSettings.getState().setPessoa('tipoCompanhia', settingsValue);
      },
      setSexoDeclarado: (pessoa, sexo) =>
        set((s) => ({
          sexoDeclarado: { ...s.sexoDeclarado, [pessoa]: sexo },
        })),
      setPermissao: (chave, granted) =>
        set((s) => ({
          permissoes: { ...s.permissoes, [chave]: granted },
        })),
      marcarConcluido: () => set({ done: true }),
      resetar: () => {
        set({
          done: false,
          tipoCompanhia: 'sozinho',
          sexoDeclarado: { ...SEXO_DEFAULT },
          permissoes: { ...PERMISSOES_DEFAULT },
        });
        useSettings.getState().setPessoa('tipoCompanhia', 'sozinho');
      },
    }),
    {
      name: 'ouroboros.onboarding.v3',
      storage: createJSONStorage(() => secureStorage),
      // AUDIT-P1-8 (2026-07-28): merge custom na hidratacao (armadilha
      // A47). Sem ele o merge SHALLOW padrao do zustand faz o objeto
      // `permissoes` persistido substituir o default inteiro: uma
      // permissao nova adicionada por sprint posterior hidrata
      // `undefined` numa instalacao antiga -- e o app volta a pedir uma
      // permissao que o usuario ja concedeu. Vale o mesmo para
      // `sexoDeclarado`. Esta store nao tem version/migrate; o merge
      // roda em toda hidratacao e por isso basta.
      merge: mergeOnboardingPersistido,
    }
  )
);

// AUDIT-P1-8: deep-merge do estado persistido com os defaults, um
// sub-objeto por vez. Chave ausente cai no default; chave presente
// (escolha organica do usuario) vence.
function mesclarDefaultsOnboarding(
  ps: Record<string, unknown>
): typeof DEFAULT_STATE {
  return {
    ...DEFAULT_STATE,
    ...ps,
    sexoDeclarado: {
      ...SEXO_DEFAULT,
      ...((ps.sexoDeclarado as Record<string, unknown>) ?? {}),
    },
    permissoes: {
      ...PERMISSOES_DEFAULT,
      ...((ps.permissoes as Record<string, unknown>) ?? {}),
    },
  } as typeof DEFAULT_STATE;
}

// AUDIT-P1-8 (2026-07-28): funcao de merge da hidratacao do persist.
// Exportada para o teste exercitar o CODIGO REAL (cabeado em `merge`
// acima) em vez de uma replica tautologica. Guard para
// persistedState null/nao-objeto e spread de `currentState` PRIMEIRO
// para preservar as ACOES do store.
export function mergeOnboardingPersistido(
  persistedState: unknown,
  currentState: OnboardingStore
): OnboardingStore {
  if (!persistedState || typeof persistedState !== 'object') {
    return currentState;
  }
  return {
    ...currentState,
    ...mesclarDefaultsOnboarding(persistedState as Record<string, unknown>),
  };
}

// R-VAULT-CANONICAL-COMPLETE-A (2026-05-16): subscriber nao-mutativo
// que espelha o estado em vault/_estado/onboarding-<deviceId>.md.
// Debounced 500ms por key dentro de escreverEstadoCanonico.
useOnboarding.subscribe((state) => {
  escreverEstadoCanonico('onboarding', {
    done: state.done,
    tipoCompanhia: state.tipoCompanhia,
    sexoDeclarado: { ...state.sexoDeclarado },
    permissoes: { ...state.permissoes },
  });
});
