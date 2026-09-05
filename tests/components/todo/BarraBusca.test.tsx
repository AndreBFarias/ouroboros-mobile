// Testes do BarraBusca (M17). Verifica render, propagacao de
// onChangeText e botao limpar.
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { Insets, ViewStyle } from 'react-native';
import { ALVO_DP, insetsDe, type NoDaArvore } from '../../helpers/areaToque';
import { BarraBusca, normalizarBusca } from '@/components/todo/BarraBusca';

// Sobe a arvore ate a linha que envolve o campo: e' ela que limita a
// area de toque do botao (no React Native "the touch area never extends
// past the parent view bounds").
function linhaDaBusca(el: NoDaArvore): ViewStyle | null {
  let atual = el.parent;
  while (atual) {
    const s = StyleSheet.flatten(atual.props?.style) as ViewStyle | undefined;
    if (s && typeof s.minHeight === 'number') return s;
    atual = atual.parent;
  }
  return null;
}

describe('BarraBusca', () => {
  it('renderiza placeholder default', () => {
    const { getByPlaceholderText } = render(
      <BarraBusca value="" onChangeText={() => undefined} />
    );
    expect(getByPlaceholderText('Buscar tarefas')).toBeTruthy();
  });

  it('propaga onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <BarraBusca value="" onChangeText={onChangeText} />
    );
    const input = getByLabelText('campo de busca de tarefas');
    fireEvent.changeText(input, 'pao');
    expect(onChangeText).toHaveBeenCalledWith('pao');
  });

  it('mostra botao limpar quando ha valor', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <BarraBusca value="pao" onChangeText={onChangeText} />
    );
    expect(getByLabelText('limpar busca')).toBeTruthy();
  });

  it('botao limpar dispara onChangeText("")', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <BarraBusca value="pao" onChangeText={onChangeText} />
    );
    fireEvent.press(getByLabelText('limpar busca'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  // AUDIT-P4-5. A guarda nao compara o hitSlop com o literal que a
  // sprint escreveu (isso seria tautologia): compoe hitSlop + geometria
  // do botao + folga real ate a borda do pai e cobra os 44dp efetivos.
  // Assim ela reprova tanto um hitSlop menor quanto um hitSlop grande
  // demais que o pai recortaria.
  it('botao limpar tem 44x44dp de area de toque efetiva', () => {
    const { getByLabelText } = render(
      <BarraBusca value="pao" onChangeText={() => undefined} />
    );
    const botao = getByLabelText('limpar busca');
    const slop = insetsDe(botao.props.hitSlop as Insets | number);
    const no = botao as unknown as NoDaArvore;

    const icone = StyleSheet.flatten(
      (botao.children[0] as unknown as NoDaArvore).props.style
    ) as ViewStyle;
    const lado = icone.width as number;
    const altura = icone.height as number;

    const linha = linhaDaBusca(no);
    expect(linha).not.toBeNull();
    const minHeight = linha?.minHeight as number;
    const paddingH = linha?.paddingHorizontal as number;
    const borda = linha?.borderWidth as number;
    const gap = linha?.gap as number;

    // Vertical: botao centralizado numa linha de minHeight => folga
    // igual dos dois lados. Horizontal: a direita a folga e o padding
    // mais a borda; a esquerda o slop passa por cima do campo de texto.
    const folgaVertical = (minHeight - altura) / 2;
    const folgaDireita = paddingH + borda;
    const alturaEfetiva =
      Math.min(slop.top, folgaVertical) +
      altura +
      Math.min(slop.bottom, folgaVertical);
    const larguraEfetiva =
      slop.left + lado + Math.min(slop.right, folgaDireita);

    expect(alturaEfetiva).toBeGreaterThanOrEqual(ALVO_DP);
    expect(larguraEfetiva).toBeGreaterThanOrEqual(ALVO_DP);
    // O botao e irmao posterior do campo, entao vence o hit-test na
    // area sobreposta. Tolera 1dp de invasao, nao mais que isso.
    expect(Math.max(0, slop.left - gap)).toBeLessThanOrEqual(1);
  });

  it('botao limpar nao aparece com value vazio', () => {
    const { queryByLabelText } = render(
      <BarraBusca value="" onChangeText={() => undefined} />
    );
    expect(queryByLabelText('limpar busca')).toBeNull();
  });
});

describe('normalizarBusca', () => {
  it('remove acentos', () => {
    expect(normalizarBusca('Pão')).toBe('pao');
  });

  it('lowercase', () => {
    expect(normalizarBusca('LIVROS')).toBe('livros');
  });

  it('combina acento + maiuscula', () => {
    expect(normalizarBusca('Médico')).toBe('medico');
  });

  it('preserva numeros e simbolos basicos', () => {
    expect(normalizarBusca('Item 3-A')).toBe('item 3-a');
  });
});
