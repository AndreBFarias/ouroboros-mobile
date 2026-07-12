// K4 (M-FAB-MENU-SAFE-BOTTOM, 2026-05-07): hook compartilhado para
// calcular margem inferior canonica de FABs absolute-positioned.
// Garante minimo absoluto (spacing.xl = 24dp), 5% da altura da tela
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

// R-HOME-4g (2026-07-11): reduzido de 0.10 para 0.05. Com 0.10 a base
// proporcional (~87dp em tela de ~872dp) subia o topo do FAB a ~151dp da
// base, cobrindo a ultima linha do card "Relembrando" no topo da home
// (termina a ~122dp). Com 0.05 a base cai para ~44dp e o topo do FAB para
// ~107dp, abaixo do fim do card. O piso spacing.xl (24dp) protege telas
// baixas e o + safeAreaInsetBottom preserva a folga da nav bar (K4).
const PCT_MIN_BOTTOM = 0.05;

// R-HOME-4f: fonte unica da altura da zona ocupada pelos FABs globais
// (FABMenu roxo esq. e MenuCapturaVerde verde dir. compartilham 64dp,
// decisao Q4). Telas scrollaveis com FAB visivel derivam o
// paddingBottom desta constante para nao divergir do tamanho real do
// FAB. Se o FAB mudar de tamanho, muda aqui e a reserva de conteudo
// acompanha automaticamente.
export const FAB_ZONA_ALTURA = 64;

export function useSafeBottomMargin(safeAreaInsetBottom: number): number {
  // Dimensions.get e' sincrono e estavel por orientacao; useMemo evita
  // recalculo a cada render. Trocas de orientacao re-montam a tela em
  // expo-router, entao o valor persiste pelo ciclo de vida do FAB.
  return useMemo(() => {
    const { height } = Dimensions.get('window');
    return Math.max(spacing.xl, height * PCT_MIN_BOTTOM) + safeAreaInsetBottom;
  }, [safeAreaInsetBottom]);
}

// R-HOME-4f: paddingBottom canonico para o conteudo scrollavel de telas
// que hospedam o FABMenu global. Reserva a MESMA base do FAB
// (useSafeBottomMargin) + a altura do FAB (FAB_ZONA_ALTURA) + um respiro
// (spacing.lg), garantindo que o ultimo card/secao nunca fique atras do
// FAB. Substitui o antigo paddingBottom: 120 hardcoded, que reservava
// menos que a base+altura do FAB em telas comuns (~89dp+ de base) e por
// isso deixava o FAB cobrir os ultimos ~33dp do conteudo.
export function useSafeBottomContentPadding(
  safeAreaInsetBottom: number,
): number {
  const margin = useSafeBottomMargin(safeAreaInsetBottom);
  return margin + FAB_ZONA_ALTURA + spacing.lg;
}
