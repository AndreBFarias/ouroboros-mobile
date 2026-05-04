// Store auxiliar do Gauntlet (web/dev only) para simular eventos
// in-memory. Mantem-se desacoplada do schema zod estrito (EventoSchema)
// para permitir mock simplificado sem refine de midia obrigatoria.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import type { PessoaAutor, PessoaId } from '@/lib/schemas/pessoa';

export type EventoMockModo = 'positivo' | 'negativo';

export interface EventoMockEntrada {
  // ISO YYYY-MM-DD (date only) calculada em runtime.
  data: string;
  autor: PessoaAutor;
  modo: EventoMockModo;
  lugar: string;
  categoria: string;
  com: PessoaId[];
  intensidade: number;
  descricao: string;
  fotos: string[];
  midia: string[];
  slug: string;
}

export interface EventosMockState {
  eventos: EventoMockEntrada[];
  definir: (eventos: EventoMockEntrada[]) => void;
  limpar: () => void;
}

export const useEventosMock = create<EventosMockState>((set) => ({
  eventos: [],
  definir: (eventos) => set({ eventos: [...eventos] }),
  limpar: () => set({ eventos: [] }),
}));
