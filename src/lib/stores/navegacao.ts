// Store leve de navegacao runtime (M27). Controla o estado aberto/
// fechado do MenuLateral global. Nao persistido: e estado de UI puro
// e o menu sempre comeca fechado em cada boot.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';

export interface NavegacaoState {
  menuAberto: boolean;
  abrir: () => void;
  fechar: () => void;
  alternar: () => void;
}

export const useNavegacao = create<NavegacaoState>((set) => ({
  menuAberto: false,
  abrir: () => set({ menuAberto: true }),
  fechar: () => set({ menuAberto: false }),
  alternar: () => set((s) => ({ menuAberto: !s.menuAberto })),
}));
