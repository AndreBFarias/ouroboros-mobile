// Store auxiliar do Gauntlet (web/dev only) para simular entradas de
// diario emocional in-memory. Aceita ambos os vocabularios (legacy
// e canonico R0) para compatibilidade com fixtures antigas; novas
// fixtures usam o canonico 'gatilho'/'conquista'/'reflexao'.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import type { PessoaAutor, PessoaId } from '@/lib/schemas/pessoa';

export type DiarioMockModo =
  | 'trigger'
  | 'vitoria'
  | 'gatilho'
  | 'conquista'
  | 'reflexao';

export interface DiarioMockEntrada {
  // ISO 8601 com hora (calculado em runtime a partir de offsetHoras).
  data: string;
  autor: PessoaAutor;
  modo: DiarioMockModo;
  intensidade: number;
  emocoes: string[];
  com: PessoaId[];
  contextoSocial: Array<'amigos' | 'sozinho'>;
  texto: string;
  estrategia?: string;
  funcionou?: boolean;
  tags: string[];
  midia: string[];
}

export interface DiarioMockState {
  entradas: DiarioMockEntrada[];
  definir: (entradas: DiarioMockEntrada[]) => void;
  limpar: () => void;
}

export const useDiarioMock = create<DiarioMockState>((set) => ({
  entradas: [],
  definir: (entradas) => set({ entradas: [...entradas] }),
  limpar: () => set({ entradas: [] }),
}));
