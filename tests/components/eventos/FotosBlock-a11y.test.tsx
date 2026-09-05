// AUDIT-P4-5: guarda de area de toque do botao "remover foto" do
// FotosBlock (WCAG 2.5.5 Target Size, AA).
//
// Arquivo proprio em vez de entrar no FotosBlock-permission.test.tsx
// porque aquele liga fake timers no beforeEach e mocka o
// expo-image-picker para o fluxo de permissao; aqui basta renderizar
// com uma foto ja escolhida.
//
// A guarda nao compara o hitSlop com o literal que a sprint escreveu
// (seria tautologia): compoe hitSlop + geometria do botao + folga real
// ate a borda do thumbnail que recorta. Um hitSlop simetrico de 11,
// que "daria 44" pela conta ingenua, reprova aqui -- o React Native
// descarta o toque que cai fora de um pai com overflow 'hidden'.
//
// Comentarios sem acento (convencao shell/CI).
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { Insets, ViewStyle } from 'react-native';
import {
  ALVO_DP,
  areaEfetiva,
  tileQueRecorta,
  type NoDaArvore,
} from '../../helpers/areaToque';
import { FotosBlock } from '@/components/eventos/FotosBlock';

describe('FotosBlock area de toque do botao remover', () => {
  it('tem 44x44dp efetivos dentro do thumbnail', () => {
    const { getByLabelText } = render(
      <FotosBlock
        fotos={['file:///tmp/a.jpg']}
        onChangeFotos={() => undefined}
      />
    );
    const botao = getByLabelText('remover foto 1');
    const slop = botao.props.hitSlop as Insets | number;
    const estilo = StyleSheet.flatten(botao.props.style) as ViewStyle;
    const thumb = tileQueRecorta(botao as unknown as NoDaArvore);
    expect(thumb).not.toBeNull();

    const medida = areaEfetiva(slop, estilo, thumb as ViewStyle);
    expect(medida.altura).toBeGreaterThanOrEqual(ALVO_DP);
    expect(medida.largura).toBeGreaterThanOrEqual(ALVO_DP);
  });
});
