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
// K1 (M-MENU-LATERAL-LAYOUT): adiciona scrollMenuLateralPosition
// para preservar a posicao de rolagem do drawer entre aberturas
// dentro da mesma sessao. Boot reseta para zero (decisao §7 da spec).
// Setter usa debounce 200ms aplicado no consumidor (MenuLateral).
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import { escreverEstadoCanonico } from '@/lib/vault/escreverEstado';

export interface NavegacaoState {
  menuAberto: boolean;
  abrir: () => void;
  fechar: () => void;
  alternar: () => void;
  sheetCapturaAberto: boolean;
  setSheetCapturaAberto: (v: boolean) => void;
  scrollMenuLateralPosition: number;
  setScrollMenuLateralPosition: (offset: number) => void;
}

export const useNavegacao = create<NavegacaoState>((set) => ({
  menuAberto: false,
  abrir: () => set({ menuAberto: true }),
  fechar: () => set({ menuAberto: false }),
  alternar: () => set((s) => ({ menuAberto: !s.menuAberto })),
  sheetCapturaAberto: false,
  setSheetCapturaAberto: (v) => set({ sheetCapturaAberto: v }),
  scrollMenuLateralPosition: 0,
  setScrollMenuLateralPosition: (offset) =>
    set({ scrollMenuLateralPosition: offset }),
}));

// R-VAULT-CANONICAL-COMPLETE-A (2026-05-16): subscriber nao-mutativo
// que espelha o snapshot transitorio em vault/_estado/navegacao-<deviceId>.md.
// useNavegacao e runtime-only (sem persist); espelhamos pra que sibling
// Python possa diagnosticar estado intermediario. Debounced 500ms.
useNavegacao.subscribe((state) => {
  escreverEstadoCanonico('navegacao', {
    menuAberto: state.menuAberto,
    sheetCapturaAberto: state.sheetCapturaAberto,
    scrollMenuLateralPosition: state.scrollMenuLateralPosition,
  });
});
