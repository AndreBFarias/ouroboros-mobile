// Store global de configuracoes. Ponto unico onde toggles de feature,
// lembretes, biometria, sync e qualidade do scanner vivem. M00.5 cria
// o shape completo (CONTRACT secao 1.5) com defaults conservadores;
// a UI de Settings sera implementada em M15 e sprints opt-in
// (M14.5/M16/M17/M18/M11.5/M20) consumirao toggles existentes.
//
// Persiste em SecureStore via secureStorage adapter, chave
// `ouroboros.settings.v1`. Mudancas de shape exigem ADR sucessor e
// bump de chave (`ouroboros.settings.v2`).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export type SyncMethod = 'syncthing' | 'obsidian-sync' | 'nao-uso';
export type ScannerQualidade = '8mp' | '12mp' | 'maxima';
export type TipoCompanhia = 'sozinho' | 'duo';

export interface Lembrete {
  ativo: boolean;
  // HH:MM, 24h, sem segundos. Default conservador 09:00.
  horario: string;
}

export interface SettingsState {
  somVibracao: {
    humor: boolean;
    vitoria: boolean;
    trigger: boolean;
    fab: boolean;
    alarme: boolean;
  };
  lembretes: {
    medicacao: Lembrete;
    treino: Lembrete;
    humor: Lembrete;
  };
  pessoa: {
    ativa: PessoaAutor;
    vaultCompartilhado: boolean;
    tipoCompanhia: TipoCompanhia;
  };
  sync: {
    metodo: SyncMethod;
    qualidadeScanner: ScannerQualidade;
  };
  featureToggles: {
    cicloMenstrual: boolean;
    alarmePessoal: boolean;
    todoLeve: boolean;
    contadorDiasSem: boolean;
    calendarioConquistas: boolean;
    widgetHomescreen: boolean;
    // M20: sub-toggle aninhado de privacidade do widget. Quando o
    // usuario aceita explicitamente, o widget pode mostrar nome
    // completo ao inves de apenas inicial. Default off.
    widgetMostraNome: boolean;
  };
  privacidade: {
    biometriaAbrir: boolean;
    ocultarTranscricoes: boolean;
  };
  midia: {
    capPorRegistro: number;
    permitirAudio: boolean;
  };
  // Mutators canonicos. M15 substituira a UI por chamadas tipadas;
  // sprints opt-in chamam apenas os toggles relevantes.
  setSomVibracao: <K extends keyof SettingsState['somVibracao']>(
    chave: K,
    valor: boolean
  ) => void;
  setLembrete: <K extends keyof SettingsState['lembretes']>(
    chave: K,
    valor: Partial<Lembrete>
  ) => void;
  setPessoa: <K extends keyof SettingsState['pessoa']>(
    chave: K,
    valor: SettingsState['pessoa'][K]
  ) => void;
  setSync: <K extends keyof SettingsState['sync']>(
    chave: K,
    valor: SettingsState['sync'][K]
  ) => void;
  setFeatureToggle: <K extends keyof SettingsState['featureToggles']>(
    chave: K,
    valor: boolean
  ) => void;
  setPrivacidade: <K extends keyof SettingsState['privacidade']>(
    chave: K,
    valor: boolean
  ) => void;
  setMidia: <K extends keyof SettingsState['midia']>(
    chave: K,
    valor: SettingsState['midia'][K]
  ) => void;
  resetar: () => void;
}

// Defaults conservadores (CONTRACT secao 1.5):
// - Toggles de feature comecam desligados (opt-in explicito).
// - Trigger som off por padrao (momento delicado).
// - Cap de midia em 4 itens por registro.
// - Lembretes default 09:00 mas inativos.
const DEFAULT_STATE: Omit<
  SettingsState,
  | 'setSomVibracao'
  | 'setLembrete'
  | 'setPessoa'
  | 'setSync'
  | 'setFeatureToggle'
  | 'setPrivacidade'
  | 'setMidia'
  | 'resetar'
> = {
  somVibracao: {
    humor: true,
    vitoria: true,
    trigger: false,
    fab: true,
    alarme: true,
  },
  lembretes: {
    medicacao: { ativo: false, horario: '09:00' },
    treino: { ativo: false, horario: '18:00' },
    humor: { ativo: false, horario: '21:00' },
  },
  pessoa: {
    ativa: 'pessoa_a',
    vaultCompartilhado: true,
    tipoCompanhia: 'sozinho',
  },
  sync: {
    metodo: 'nao-uso',
    qualidadeScanner: '12mp',
  },
  featureToggles: {
    cicloMenstrual: false,
    alarmePessoal: false,
    todoLeve: false,
    contadorDiasSem: false,
    calendarioConquistas: false,
    widgetHomescreen: false,
    widgetMostraNome: false,
  },
  privacidade: {
    biometriaAbrir: false,
    ocultarTranscricoes: false,
  },
  midia: {
    capPorRegistro: 4,
    permitirAudio: true,
  },
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setSomVibracao: (chave, valor) =>
        set((s) => ({
          somVibracao: { ...s.somVibracao, [chave]: valor },
        })),
      setLembrete: (chave, valor) =>
        set((s) => ({
          lembretes: {
            ...s.lembretes,
            [chave]: { ...s.lembretes[chave], ...valor },
          },
        })),
      setPessoa: (chave, valor) =>
        set((s) => ({
          pessoa: { ...s.pessoa, [chave]: valor },
        })),
      setSync: (chave, valor) =>
        set((s) => ({
          sync: { ...s.sync, [chave]: valor },
        })),
      setFeatureToggle: (chave, valor) =>
        set((s) => ({
          featureToggles: { ...s.featureToggles, [chave]: valor },
        })),
      setPrivacidade: (chave, valor) =>
        set((s) => ({
          privacidade: { ...s.privacidade, [chave]: valor },
        })),
      setMidia: (chave, valor) =>
        set((s) => ({
          midia: { ...s.midia, [chave]: valor },
        })),
      resetar: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: 'ouroboros.settings.v1',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
