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
import { escreverEstadoCanonico } from '@/lib/vault/escreverEstado';

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
    // M-BACKUP-AUTOMATICO (Bloco C5): toggle opt-in para backup
    // periodico semanal local. Default false (privacy-first). Quando
    // ligado, o helper agendarBackup avalia a cada boot se passou >=7d
    // desde ultimaExecucaoMs e dispara executarBackup() (chama
    // exportarVaultZip + escreve em Documents/Ouroboros-Backups/auto/
    // com rotacao em 4 arquivos).
    backupAutomaticoSemanal: boolean;
    // Q17 (Onda Q, 2026-05-13): opt-in para escrever no Health Connect
    // do Android quando o usuario salva treino/medida/ciclo no Vault.
    // Default false (privacy-first; apenas saves locais ate o usuario
    // conectar explicitamente via /settings/integracoes).
    healthConnectSync: boolean;
    // Q24.b (2026-05-13): trilha sonora ambient durante o modo
    // Memorias do Recap. Default false (ADR-0005 zero trilha
    // sonora artificial). Quando on, slideshow toca trilha cc0
    // baixinha em loop durante toda a sessao.
    recapAmbientAudio: boolean;
    // R-MEDIA-2 (2026-05-16): autoplay de audio anexado a Conquistas/
    // Crises/Reflexoes durante o slideshow Memorias. Default true:
    // quando o slide tem um audio anexado, o autoplay e' parte da
    // experiencia natural ("o que voce gravou volta ao seu ouvido").
    // Toggle off silencia tanto o anexado quanto o ambient.
    recapAudioAnexadoAutoplay: boolean;
  };
  privacidade: {
    biometriaAbrir: boolean;
    ocultarTranscricoes: boolean;
  };
  midia: {
    capPorRegistro: number;
    permitirAudio: boolean;
  };
  // R-RECAP-4 (2026-05-16): configuracoes do modo Memorias do Recap.
  // slideshowIntervaloS controla o auto-avance entre slides (default 4s,
  // range 2-10s). Sem boolean isolado para "pausar permanentemente" —
  // o botao pausar dentro do slideshow ja faz toggle por sessao.
  recap: {
    slideshowIntervaloS: number;
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
  setRecap: <K extends keyof SettingsState['recap']>(
    chave: K,
    valor: SettingsState['recap'][K]
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
  | 'setRecap'
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
    // R-BACKUP-AUTO (D6=SIM, 2026-05-15): dono autorizou default ON.
    // Backup automatico semanal em Documents/Ouroboros-Backups/auto/
    // sem rede externa (local-only, ADR-0007), rotacao em 4. Pode ser
    // desligado a qualquer momento em Settings > Backup automatico.
    // Migracao v3 garante que instalacoes pre-R-BACKUP-AUTO continuam
    // respeitando a escolha previa do usuario.
    backupAutomaticoSemanal: true,
    // Q17 (Onda Q): default OFF. Usuario opt-in via
    // /settings/integracoes apos aceitar permissions do Health Connect.
    healthConnectSync: false,
    // Q24.b: default OFF (zero trilha sonora artificial, ADR-0005).
    // Toggle em Configuracoes habilita ambient audio nos slides.
    recapAmbientAudio: false,
    // R-MEDIA-2: default ON. Audio anexado a um registro e' parte do
    // registro -- silencia-lo no Recap por default escaparia a
    // intencao. Usuario que prefere silencio total desliga este
    // toggle (e tambem o ambient acima).
    recapAudioAnexadoAutoplay: true,
  },
  privacidade: {
    biometriaAbrir: false,
    ocultarTranscricoes: false,
  },
  midia: {
    capPorRegistro: 4,
    permitirAudio: true,
  },
  // R-RECAP-4: default 4s (sweet spot ux). User pode customizar de 2 a
  // 10s via slider em Configuracoes > Modo Memorias.
  recap: {
    slideshowIntervaloS: 4,
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
      setRecap: (chave, valor) =>
        set((s) => ({
          recap: { ...s.recap, [chave]: valor },
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
    recap: {
      ...DEFAULT_STATE_V2.recap,
      ...((ps.recap as Record<string, unknown>) ?? {}),
    } as SettingsState['recap'],
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

// R-VAULT-CANONICAL-COMPLETE-A (2026-05-16): subscriber nao-mutativo
// que espelha o estado em vault/_estado/settings-<deviceId>.md. Debounced
// 500ms por key dentro de escreverEstadoCanonico. Side-effect do module
// (registra uma unica vez por bundle). Em web/dev o write cai no
// useVaultMock (writer trata branch); em mobile real escreve via
// SAF/file:// atomic.
useSettings.subscribe((state) => {
  escreverEstadoCanonico('settings', {
    somVibracao: { ...state.somVibracao },
    pessoa: { ...state.pessoa },
    featureToggles: { ...state.featureToggles },
    privacidade: { ...state.privacidade },
    midia: { ...state.midia },
    recap: { ...state.recap },
  });
});
