// Store unica do toast "Desfazer" da Tela Hoje (R-HOME-5). Antes (R-HOME-3)
// o estado vivia em cada instancia de useToastUndo, o que montava um
// UndoOverlay DENTRO de cada card (SecaoTodoHoje, SecaoAindaDeOntem) --
// dentro do ScrollView, sem zIndex, portanto atras dos cards seguintes
// (bug B4: o balao aparecia atras do feed e rolava junto).
//
// Centralizar o estado aqui permite um unico host (UndoOverlayHost) no
// root da Tela Hoje, FORA do ScrollView, com zIndex + elevation, e
// elimina o toast duplicado (havia duas instancias). Preserva a
// invariante R-HOME-4a: as secoes chamam mostrarUndo sem receber props
// (leem a store direto), continuam self-contained.
//
// UI puro, nao persistido: o toast sempre comeca ausente a cada boot.
// O timer vive no escopo do modulo (store singleton) para o timeout
// sobreviver a conclusao da ULTIMA tarefa (a lista esvazia mas o undo
// precisa dos 5s) e ser cancelado por chamadas consecutivas.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';

const DEFAULT_TIMEOUT_MS = 5000;

export interface ToastUndoAtual {
  id: number;
  mensagem: string;
  onUndo: () => void;
}

export interface ToastUndoState {
  // Toast ativo, ou null quando idle.
  atual: ToastUndoAtual | null;
  // Mostra o toast de undo. Substitui qualquer toast anterior (sem fila).
  mostrarUndo: (
    mensagem: string,
    onUndo: () => void,
    timeoutMs?: number
  ) => void;
  // Executa o callback do toast atual e oculta (tap em "Desfazer").
  executarUndo: () => void;
  // Forca dismiss imediato sem chamar o callback (timeout / desmontar).
  dismiss: () => void;
}

// Timer no escopo do modulo: uma unica instancia da store, um unico
// timeout ativo por vez. Chamadas consecutivas cancelam o anterior.
let timer: ReturnType<typeof setTimeout> | null = null;

function limparTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

export const useToastUndoStore = create<ToastUndoState>((set, get) => ({
  atual: null,
  mostrarUndo: (mensagem, onUndo, timeoutMs = DEFAULT_TIMEOUT_MS) => {
    limparTimer();
    const id = Date.now() + Math.random();
    set({ atual: { id, mensagem, onUndo } });
    timer = setTimeout(() => {
      // So limpa se ainda for o mesmo toast (evita corrida com
      // substituicao consecutiva que ja trocou o atual).
      set((s) => (s.atual && s.atual.id === id ? { atual: null } : s));
      timer = null;
    }, timeoutMs);
  },
  executarUndo: () => {
    const cur = get().atual;
    limparTimer();
    set({ atual: null });
    cur?.onUndo();
  },
  dismiss: () => {
    limparTimer();
    set({ atual: null });
  },
}));
