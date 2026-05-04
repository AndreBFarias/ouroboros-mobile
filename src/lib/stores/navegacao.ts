// Store leve de navegacao runtime (M27). Controla o estado aberto/
// fechado do MenuLateral global. Nao persistido: e estado de UI puro
// e o menu sempre comeca fechado em cada boot.
//
// M34.1.1: agrega flag sheetCapturaAberto para coordenar visibilidade
// do FABMenu roxo quando o MenuCapturaVerde (sheet de captura) abre.
// FABMenu (z=10) e BottomSheet do MenuCapturaVerde (z=100) sao
// renderizados em ancestrais distintos (FABMenu em _layout raiz,
// MenuCapturaVerde dentro do Stack). No nivel do ancestor comum
// stacking contexts comparam direto e o FAB vence — a flag aqui
// permite o FAB se desmontar enquanto o sheet esta aberto.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';

export interface NavegacaoState {
  menuAberto: boolean;
  abrir: () => void;
  fechar: () => void;
  alternar: () => void;
  sheetCapturaAberto: boolean;
  setSheetCapturaAberto: (v: boolean) => void;
}

export const useNavegacao = create<NavegacaoState>((set) => ({
  menuAberto: false,
  abrir: () => set({ menuAberto: true }),
  fechar: () => set({ menuAberto: false }),
  alternar: () => set((s) => ({ menuAberto: !s.menuAberto })),
  sheetCapturaAberto: false,
  setSheetCapturaAberto: (v) => set({ sheetCapturaAberto: v }),
}));
