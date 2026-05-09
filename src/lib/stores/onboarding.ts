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

interface OnboardingStore {
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

const PERMISSOES_DEFAULT: PermissoesOnboarding = {
  storage: false,
  camera: false,
  microfone: false,
  notificacoes: false,
  localizacao: false,
};

const SEXO_DEFAULT: SexoPorPessoa = {
  pessoa_a: null,
  pessoa_b: null,
};

export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      done: false,
      tipoCompanhia: 'sozinho',
      sexoDeclarado: SEXO_DEFAULT,
      permissoes: PERMISSOES_DEFAULT,
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
    }
  )
);
