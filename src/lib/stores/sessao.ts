// Store de sessao runtime (M24). Auto-save de rascunhos de formulario
// e restore da ultima rota visitada para evitar perda de digitacao.
//
// Persiste em SecureStore via secureStorage adapter, chave
// `ouroboros.sessao.v1`. Sete rascunhos ficam serializados num unico
// blob; a soma deve respeitar o teto pratico de ~2KB do
// EncryptedSharedPreferences Android (BRIEF A20). Mitigacoes:
//   - cap por textarea livre em RASCUNHO_TEXTO_CAP caracteres,
//     truncado silenciosamente ao gravar (UI nao impede digitar mais);
//   - canario logando warning quando o snapshot serializado passa de
//     CANARY_SOFT_LIMIT bytes.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';
import type { CicloMenstrualMeta } from '@/lib/schemas/ciclo_menstrual';
import type { Alarme } from '@/lib/schemas/alarme';
import type { Contador } from '@/lib/schemas/contador';
import type { Tarefa } from '@/lib/schemas/tarefa';

// Cap de caracteres por textarea livre ao gravar rascunho. Evita
// estourar o blob unico de SecureStore. UI nao impede digitar mais
// (UX livre); apenas o snapshot do rascunho e truncado.
export const RASCUNHO_TEXTO_CAP = 2000;

// Limite "soft" do canario. Se o JSON serializado do estado passar
// disso, logamos warning em __DEV__ pra alertar antecipadamente
// (margem ate o teto pratico de ~2KB).
export const CANARY_SOFT_LIMIT = 1500;

// Tipos parciais: rascunhos sao snapshots em construcao, sem
// requisitos do schema final. Cada chave referencia o Meta original
// como Partial e elimina props impossiveis no estado intermediario.
export type HumorParcial = Partial<HumorMeta>;
export type DiarioParcial = Partial<DiarioEmocionalMeta>;
// Evento Meta nao carrega o texto livre (vai no body do .md). O
// rascunho extende com 'texto' opcional para preservar a digitacao
// entre sessoes - caso o usuario fechasse o app sem salvar.
export type EventoParcial = Partial<EventoMeta> & { texto?: string };
export type CicloParcial = Partial<CicloMenstrualMeta>;
export type AlarmeParcial = Partial<Alarme>;
export type ContadorParcial = Partial<Contador>;
export type TarefaParcial = Partial<Tarefa>;

export interface RascunhosState {
  humorRapido: HumorParcial | null;
  diarioEmocional: DiarioParcial | null;
  eventos: EventoParcial | null;
  cicloRegistrar: CicloParcial | null;
  alarmesNovo: AlarmeParcial | null;
  contadoresNovo: ContadorParcial | null;
  tarefasNova: TarefaParcial | null;
}

export type RascunhoKey = keyof RascunhosState;

// Mapa tipado: dada uma chave K, devolve o tipo do rascunho. Usado
// nas assinaturas de salvarRascunho/limparRascunho para nao perder
// inferencia.
export type RascunhoTipo<K extends RascunhoKey> = NonNullable<
  RascunhosState[K]
>;

export interface PermissoesPedidasState {
  storage: boolean;
  notif: boolean;
  camera: boolean;
  mic: boolean;
}

export type PermissaoKey = keyof PermissoesPedidasState;

// M30: flags one-shot de boot. Marcam acoes idempotentes que devem
// rodar uma unica vez por instalacao (apos primeiro sucesso, ficam
// true para sempre).
//   - canalV1Deletado: indica se a rotina de boot ja apagou o canal
//     Android legado 'default' (gerado em v1.0-rc1 sem vibrationPattern,
//     vide A30 e §4 do M30-spec).
//   - cacheAgendaMigrado (M37.1.2): indica se a rotina ja migrou o
//     cache de agenda do JSON unico (M37.1) para .md individual em
//     agenda/<pessoa>/ (M37.1.2, ADR-0019).
export interface FlagsBootState {
  canalV1Deletado: boolean;
  cacheAgendaMigrado: boolean;
}

export type FlagBootKey = keyof FlagsBootState;

export interface SessaoState {
  ultimaRota: string | null;
  rascunhos: RascunhosState;
  permissoesPedidas: PermissoesPedidasState;
  flags: FlagsBootState;
  atualizadoEm: string;
  setUltimaRota: (rota: string) => void;
  salvarRascunho: <K extends RascunhoKey>(
    chave: K,
    parcial: RascunhoTipo<K>
  ) => void;
  limparRascunho: (chave: RascunhoKey) => void;
  marcarPermissaoPedida: (chave: PermissaoKey) => void;
  marcarFlagBoot: (chave: FlagBootKey) => void;
  resetar: () => void;
}

const RASCUNHOS_VAZIOS: RascunhosState = {
  humorRapido: null,
  diarioEmocional: null,
  eventos: null,
  cicloRegistrar: null,
  alarmesNovo: null,
  contadoresNovo: null,
  tarefasNova: null,
};

const PERMISSOES_VAZIAS: PermissoesPedidasState = {
  storage: false,
  notif: false,
  camera: false,
  mic: false,
};

const FLAGS_VAZIAS: FlagsBootState = {
  canalV1Deletado: false,
  cacheAgendaMigrado: false,
};

const DEFAULT_STATE: Omit<
  SessaoState,
  | 'setUltimaRota'
  | 'salvarRascunho'
  | 'limparRascunho'
  | 'marcarPermissaoPedida'
  | 'marcarFlagBoot'
  | 'resetar'
> = {
  ultimaRota: null,
  rascunhos: RASCUNHOS_VAZIOS,
  permissoesPedidas: PERMISSOES_VAZIAS,
  flags: FLAGS_VAZIAS,
  atualizadoEm: new Date(0).toISOString(),
};

// Trunca campos de texto livre conhecidos no payload do rascunho. So
// percorre props com nomes de texto canonicos (texto, frase,
// estrategia, lugar, titulo, medicacao). Outros campos passam intactos.
const CAMPOS_TEXTO_LIVRE: ReadonlySet<string> = new Set([
  'texto',
  'frase',
  'estrategia',
  'lugar',
  'titulo',
  'medicacao',
]);

function truncarCampoLongo(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  if (valor.length <= RASCUNHO_TEXTO_CAP) return valor;
  return valor.slice(0, RASCUNHO_TEXTO_CAP);
}

function aplicarCapTextos<T extends Record<string, unknown>>(
  parcial: T
): T {
  const saida: Record<string, unknown> = { ...parcial };
  for (const chave of Object.keys(saida)) {
    if (CAMPOS_TEXTO_LIVRE.has(chave)) {
      saida[chave] = truncarCampoLongo(saida[chave]);
    }
  }
  return saida as T;
}

// Canario A20: warning em __DEV__ quando o snapshot serializado passa
// do limite soft. Em producao silencia para nao poluir log do usuario.
function checarCanario(state: SessaoState): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
  try {
    const persistivel = {
      ultimaRota: state.ultimaRota,
      rascunhos: state.rascunhos,
      permissoesPedidas: state.permissoesPedidas,
      flags: state.flags,
      atualizadoEm: state.atualizadoEm,
    };
    const tamanho = JSON.stringify(persistivel).length;
    if (tamanho > CANARY_SOFT_LIMIT) {
      // Mensagem instrumentada para captura em telemetria local. Plano-B
      // documentado no spec: split em multiplas chaves SecureStore.
      // eslint-disable-next-line no-console
      console.warn(
        `[sessao] snapshot ${tamanho}B excede ${CANARY_SOFT_LIMIT}B. ` +
          'Considere limpar rascunhos antigos ou planejar split de chaves.'
      );
    }
  } catch {
    // JSON.stringify pode falhar em refs ciclicas; silenciamos para
    // nao quebrar o set principal.
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useSessao = create<SessaoState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setUltimaRota: (rota) => {
        set({ ultimaRota: rota, atualizadoEm: nowIso() });
        checarCanario(get());
      },
      salvarRascunho: (chave, parcial) => {
        const aplicado = aplicarCapTextos(
          parcial as unknown as Record<string, unknown>
        ) as RascunhoTipo<typeof chave>;
        set((s) => ({
          rascunhos: { ...s.rascunhos, [chave]: aplicado },
          atualizadoEm: nowIso(),
        }));
        checarCanario(get());
      },
      limparRascunho: (chave) => {
        set((s) => ({
          rascunhos: { ...s.rascunhos, [chave]: null },
          atualizadoEm: nowIso(),
        }));
        checarCanario(get());
      },
      marcarPermissaoPedida: (chave) => {
        set((s) => ({
          permissoesPedidas: { ...s.permissoesPedidas, [chave]: true },
          atualizadoEm: nowIso(),
        }));
        checarCanario(get());
      },
      marcarFlagBoot: (chave) => {
        set((s) => ({
          flags: { ...s.flags, [chave]: true },
          atualizadoEm: nowIso(),
        }));
        checarCanario(get());
      },
      resetar: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: 'ouroboros.sessao.v1',
      storage: createJSONStorage(() => secureStorage),
      // Persistimos apenas o estado puro; mutators sao re-injetados
      // pelo create. Evita warning de "function" no JSON.
      partialize: (state) => ({
        ultimaRota: state.ultimaRota,
        rascunhos: state.rascunhos,
        permissoesPedidas: state.permissoesPedidas,
        flags: state.flags,
        atualizadoEm: state.atualizadoEm,
      }),
      // M27: rotas migraram de /(tabs)/* para raiz. Usuarios pre-M27
      // tem ultimaRota no SecureStore com prefixo /(tabs)/...; sem
      // migrate, qualquer boot tenta router.replace para rota
      // inexistente e quebra. Normalizamos no carregamento do
      // persist removendo o prefixo (e.g. /(tabs)/memoria -> /memoria;
      // /(tabs) -> /).
      version: 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (state: any, version: number) => {
        if (version < 2 && state && typeof state.ultimaRota === 'string') {
          if (state.ultimaRota.startsWith('/(tabs)/')) {
            state.ultimaRota = state.ultimaRota.replace('/(tabs)', '') || '/';
          } else if (state.ultimaRota === '/(tabs)') {
            state.ultimaRota = '/';
          }
        }
        // M30: garante flags ausentes em estados pre-M30 (v2 sem flags).
        if (state && typeof state === 'object' && !state.flags) {
          state.flags = { ...FLAGS_VAZIAS };
        }
        return state;
      },
    }
  )
);
