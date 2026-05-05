// Store global de configuracoes (shape v2 - sprint M29).
//
// Mudancas vs v1:
//   - somVibracao reduzido a 4 toggles: geral (mestre), despertar,
//     conquista, botoes. Defaults todos true; geral off desabilita
//     visual e funcionalmente os outros 3.
//   - featureToggles defaults TRUE para o app nao nascer vazio
//     (excecao: widgetMostraNome continua false por privacidade).
//   - lembretes REMOVIDO (M30 absorve em alarmes pre-cadastrados).
//   - sync REMOVIDO (Syncthing-ready implicito, qualidade scanner
//     sempre 'maxima').
//
// Persiste em SecureStore via secureStorage adapter, chave nova
// `ouroboros.settings.v2`. Migracao one-shot v0/v1 -> v2 mapeia
// conservador (preserva intencao do usuario): sv.alarme -> despertar,
// sv.vitoria -> conquista, sv.humor||sv.fab -> botoes. Geral assume
// true. Lembretes e sync sao descartados (M30 trata migracao de
// lembretes para alarmes em `migrarLembretesParaAlarmes()`).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export type TipoCompanhia = 'sozinho' | 'duo';

export interface SettingsState {
  somVibracao: {
    // Mestre. Off desabilita os outros 3 visualmente e funcionalmente.
    geral: boolean;
    // Alarmes (despertar, alarme pessoal).
    despertar: boolean;
    // Marcos e conquistas desbloqueadas.
    conquista: boolean;
    // Humor, fab, trigger, navegacao em sliders/pickers.
    botoes: boolean;
  };
  pessoa: {
    ativa: PessoaAutor;
    vaultCompartilhado: boolean;
    tipoCompanhia: TipoCompanhia;
  };
  featureToggles: {
    cicloMenstrual: boolean;
    alarmePessoal: boolean;
    todoLeve: boolean;
    contadorDiasSem: boolean;
    calendarioConquistas: boolean;
    widgetHomescreen: boolean;
    // Sub-toggle aninhado de privacidade do widget. Quando o usuario
    // aceita explicitamente, o widget pode mostrar nome completo ao
    // inves de apenas inicial. Default off (privacidade reforcada).
    widgetMostraNome: boolean;
    // M35: aba Financas em modo "Em desenvolvimento". Default false:
    // a aba fica desligada (item some do menu lateral) ate o pipeline
    // backend publicar cache no Vault. Quando o usuario liga, o item
    // aparece no menu e a tela renderiza um EmptyState honesto.
    mostrarFinancasEmDesenvolvimento: boolean;
  };
  privacidade: {
    biometriaAbrir: boolean;
    ocultarTranscricoes: boolean;
  };
  midia: {
    capPorRegistro: number;
    permitirAudio: boolean;
  };
  // Mutators canonicos. Sprints opt-in chamam apenas os toggles
  // relevantes; setSync/setLembrete foram removidos no shape v2.
  setSomVibracao: <K extends keyof SettingsState['somVibracao']>(
    chave: K,
    valor: boolean
  ) => void;
  setPessoa: <K extends keyof SettingsState['pessoa']>(
    chave: K,
    valor: SettingsState['pessoa'][K]
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

// Defaults v2 (sprint M29):
// - somVibracao: tudo TRUE (geral mestre on, 3 contextuais on).
// - featureToggles: tudo TRUE excepto widgetMostraNome (privacidade).
// - cap de midia em 4 itens por registro.
const DEFAULT_STATE_V2: Omit<
  SettingsState,
  | 'setSomVibracao'
  | 'setPessoa'
  | 'setFeatureToggle'
  | 'setPrivacidade'
  | 'setMidia'
  | 'resetar'
> = {
  somVibracao: {
    geral: true,
    despertar: true,
    conquista: true,
    botoes: true,
  },
  pessoa: {
    ativa: 'pessoa_a',
    vaultCompartilhado: true,
    tipoCompanhia: 'sozinho',
  },
  featureToggles: {
    cicloMenstrual: true,
    alarmePessoal: true,
    todoLeve: true,
    contadorDiasSem: true,
    calendarioConquistas: true,
    widgetHomescreen: true,
    widgetMostraNome: false,
    // M35: default OFF. v1.0 nao publica cache de financas; a aba so
    // volta a aparecer quando o usuario liga este toggle conscientemente.
    mostrarFinancasEmDesenvolvimento: false,
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
      ...DEFAULT_STATE_V2,
      setSomVibracao: (chave, valor) =>
        set((s) => ({
          somVibracao: { ...s.somVibracao, [chave]: valor },
        })),
      setPessoa: (chave, valor) =>
        set((s) => ({
          pessoa: { ...s.pessoa, [chave]: valor },
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
      resetar: () => set({ ...DEFAULT_STATE_V2 }),
    }),
    {
      name: 'ouroboros.settings.v2',
      storage: createJSONStorage(() => secureStorage),
      version: 2,
      // Migracao conservadora v0/v1 -> v2. Le valores antigos se
      // existirem, mapeia para o novo shape preservando intencao do
      // usuario, preenche defaults v2 para chaves novas. Nunca crasha:
      // se persistedState chegar parcial ou null, retorna DEFAULT_STATE_V2
      // limpo. Lembretes e sync sao descartados (M30 trata lembretes).
      migrate: (persistedState, version) => {
        // Estado nao-objeto, nulo ou ja v2: retorna defaults ou estado
        // como esta (zustand persist hidrata por cima).
        if (
          persistedState === null ||
          persistedState === undefined ||
          typeof persistedState !== 'object'
        ) {
          return DEFAULT_STATE_V2;
        }
        const ps = persistedState as Record<string, unknown>;
        if (version >= 2) {
          // Estado ja v2 ou superior. Mescla defaults para preencher
          // chaves eventualmente ausentes (defesa contra shape parcial).
          return mesclarDefaults(ps);
        }
        // v0 ou v1: mapeia somVibracao antigo (humor/vitoria/trigger/
        // fab/alarme) para o novo (geral/despertar/conquista/botoes).
        const svAntigo = (ps.somVibracao ?? {}) as Record<string, unknown>;
        const despertar = boolDefault(svAntigo.alarme, true);
        const conquista = boolDefault(svAntigo.vitoria, true);
        // botoes herda preferencia mais permissiva entre humor e fab
        // (qualquer um ligado mantem botoes ligado; ambos off => off).
        const humor = boolDefault(svAntigo.humor, true);
        const fab = boolDefault(svAntigo.fab, true);
        const botoes = humor || fab;
        const featureTogglesAntigo = (ps.featureToggles ?? {}) as Record<
          string,
          unknown
        >;
        return {
          ...DEFAULT_STATE_V2,
          somVibracao: {
            geral: true,
            despertar,
            conquista,
            botoes,
          },
          pessoa: {
            ...DEFAULT_STATE_V2.pessoa,
            ...((ps.pessoa as Record<string, unknown>) ?? {}),
          } as SettingsState['pessoa'],
          featureToggles: {
            ...DEFAULT_STATE_V2.featureToggles,
            ...filtrarBooleansConhecidos(
              featureTogglesAntigo,
              DEFAULT_STATE_V2.featureToggles
            ),
          },
          privacidade: {
            ...DEFAULT_STATE_V2.privacidade,
            ...filtrarBooleansConhecidos(
              (ps.privacidade ?? {}) as Record<string, unknown>,
              DEFAULT_STATE_V2.privacidade
            ),
          },
          midia: {
            ...DEFAULT_STATE_V2.midia,
            ...((ps.midia as Record<string, unknown>) ?? {}),
          } as SettingsState['midia'],
        };
      },
    }
  )
);

// Helper: aceita boolean direto, ou cai em fallback se ausente/invalid.
function boolDefault(valor: unknown, fallback: boolean): boolean {
  return typeof valor === 'boolean' ? valor : fallback;
}

// Helper: mescla defaults com estado v2 ja persistido para defender
// contra shape parcial (ex: chave nova adicionada em sprint posterior).
function mesclarDefaults(ps: Record<string, unknown>): SettingsState {
  return {
    ...DEFAULT_STATE_V2,
    ...ps,
    somVibracao: {
      ...DEFAULT_STATE_V2.somVibracao,
      ...((ps.somVibracao as Record<string, unknown>) ?? {}),
    } as SettingsState['somVibracao'],
    pessoa: {
      ...DEFAULT_STATE_V2.pessoa,
      ...((ps.pessoa as Record<string, unknown>) ?? {}),
    } as SettingsState['pessoa'],
    featureToggles: {
      ...DEFAULT_STATE_V2.featureToggles,
      ...((ps.featureToggles as Record<string, unknown>) ?? {}),
    } as SettingsState['featureToggles'],
    privacidade: {
      ...DEFAULT_STATE_V2.privacidade,
      ...((ps.privacidade as Record<string, unknown>) ?? {}),
    } as SettingsState['privacidade'],
    midia: {
      ...DEFAULT_STATE_V2.midia,
      ...((ps.midia as Record<string, unknown>) ?? {}),
    } as SettingsState['midia'],
  } as SettingsState;
}

// Helper: filtra apenas chaves do alvo que estao presentes no antigo
// e cuja valor e boolean. Evita propagar lixo (chaves removidas como
// `widgetMostraNome` legado em outro shape) e mantem tipagem segura.
function filtrarBooleansConhecidos<T extends Record<string, boolean>>(
  antigo: Record<string, unknown>,
  alvo: T
): Partial<T> {
  const out: Record<string, boolean> = {};
  for (const k of Object.keys(alvo)) {
    const v = antigo[k];
    if (typeof v === 'boolean') out[k] = v;
  }
  return out as Partial<T>;
}
