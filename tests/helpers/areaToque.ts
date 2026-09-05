// Medicao de area de toque efetiva para as guardas de WCAG 2.5.5
// (AUDIT-P4-5). Nao e' um arquivo de teste: testMatch so pega
// *.test.ts/*.test.tsx, entao este modulo e' apenas importado.
//
// Por que a conta obvia (visual + hitSlop * 2) esta errada: no React
// Native "the touch area never extends past the parent view bounds"
// (node_modules/react-native/Libraries/Components/View/ViewPropTypes.d.ts)
// e o hit-test do Android devolve null antes de descer para os filhos
// quando o ponto cai fora de um pai com overflow 'hidden'
// (TouchTargetHelper.kt, findTouchTargetView). Um botao absolute a 4dp
// da borda de um tile recortado ganha 4dp daquele lado, por maior que
// seja o hitSlop declarado -- por isso a conta abaixo satura cada lado
// na folga que existe de fato.
//
// Comentarios sem acento (convencao shell/CI).
import { StyleSheet } from 'react-native';
import type { Insets, ViewStyle } from 'react-native';

// Alvo minimo de toque (WCAG 2.5.5 Target Size, nivel AA).
export const ALVO_DP = 44;

// Forma minima de um no da arvore de teste; so o que estas funcoes usam.
export interface NoDaArvore {
  props: { style?: unknown };
  parent: NoDaArvore | null;
}

// Sobe a arvore ate o primeiro ancestral que recorta o conteudo. E' ele
// que limita a area de toque do botao.
export function tileQueRecorta(el: NoDaArvore): ViewStyle | null {
  let atual = el.parent;
  while (atual) {
    const s = StyleSheet.flatten(atual.props?.style) as ViewStyle | undefined;
    if (
      s &&
      s.overflow === 'hidden' &&
      typeof s.width === 'number' &&
      typeof s.height === 'number'
    ) {
      return s;
    }
    atual = atual.parent;
  }
  return null;
}

// hitSlop aceita numero (mesmo valor nos 4 lados) ou Insets. Normaliza
// para Insets com os 4 lados preenchidos.
export function insetsDe(
  slop: Insets | number | null | undefined
): Required<Insets> {
  if (typeof slop === 'number') {
    return { top: slop, bottom: slop, left: slop, right: slop };
  }
  return {
    top: slop?.top ?? 0,
    bottom: slop?.bottom ?? 0,
    left: slop?.left ?? 0,
    right: slop?.right ?? 0,
  };
}

// Area de toque de um botao absolute ancorado em top/right dentro de um
// pai que recorta. Cada lado cresce apenas ate a folga daquele lado.
export function areaEfetiva(
  slopBruto: Insets | number | null | undefined,
  botao: ViewStyle,
  pai: ViewStyle
): { largura: number; altura: number } {
  const slop = insetsDe(slopBruto);
  const top = botao.top as number;
  const right = botao.right as number;
  const largura = botao.width as number;
  const altura = botao.height as number;
  const folgaBaixo = (pai.height as number) - top - altura;
  const folgaEsquerda = (pai.width as number) - right - largura;

  return {
    altura:
      Math.min(slop.top, top) + altura + Math.min(slop.bottom, folgaBaixo),
    largura:
      Math.min(slop.right, right) +
      largura +
      Math.min(slop.left, folgaEsquerda),
  };
}
