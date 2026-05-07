// K4 (M-FAB-MENU-SAFE-BOTTOM, 2026-05-07): hook compartilhado para
// calcular margem inferior canonica de FABs absolute-positioned.
// Garante minimo absoluto (spacing.xl = 24dp), 10% da altura da tela
// como piso proporcional, e soma o safe-area-inset.bottom para que o
// FAB nunca colida com a nav bar Android (3-button) nem com a barra
// de gestos.
//
// Uso:
//   const insets = useSafeAreaInsets();
//   const bottom = useSafeBottomMargin(insets.bottom);
//
// Cobre os FABs em FABMenu.tsx e MenuCapturaVerde.tsx; demais FABs
// posicionados via "position: absolute, bottom" devem consumir o
// helper. Comentarios sem acento (convencao shell/CI).
import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { spacing } from '@/theme/tokens';

const PCT_MIN_BOTTOM = 0.1;

export function useSafeBottomMargin(safeAreaInsetBottom: number): number {
  // Dimensions.get e' sincrono e estavel por orientacao; useMemo evita
  // recalculo a cada render. Trocas de orientacao re-montam a tela em
  // expo-router, entao o valor persiste pelo ciclo de vida do FAB.
  return useMemo(() => {
    const { height } = Dimensions.get('window');
    return Math.max(spacing.xl, height * PCT_MIN_BOTTOM) + safeAreaInsetBottom;
  }, [safeAreaInsetBottom]);
}
