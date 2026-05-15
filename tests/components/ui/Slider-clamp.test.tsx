// Cobre o clamp defensivo no handler interno do Slider (B4 da sprint
// AUDIT-T1-BUGS). Cenarios:
//  - valor abaixo do min e' clampeado para min
//  - valor acima do max e' clampeado para max
//  - valor dentro de [min, max] passa intacto (apos arredondamento por step)
//
// Strategy: invocar o callback onValueChange interno do RNSlider nativo
// via fireEvent valueChange no thumb. Em ambiente Jest+RN, o
// @react-native-community/slider e' renderizado como host element com
// prop `onValueChange`; chamamos diretamente.
//
// Comentarios sem acento (convencao shell/CI).
import { render } from '@testing-library/react-native';
import { Slider } from '@/components/ui/Slider';

describe('Slider clamp defensivo', () => {
  it('clamp valor abaixo do min para o min', () => {
    const onChange = jest.fn();
    const { UNSAFE_getByType } = render(
      <Slider
        accessibilityLabel="teste"
        min={1}
        max={5}
        step={1}
        value={3}
        onChange={onChange}
      />
    );
    const RNSlider =
      require('@react-native-community/slider').default ??
      require('@react-native-community/slider');
    const inner = UNSAFE_getByType(RNSlider);
    inner.props.onValueChange(-10);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('clamp valor acima do max para o max', () => {
    const onChange = jest.fn();
    const { UNSAFE_getByType } = render(
      <Slider
        accessibilityLabel="teste"
        min={1}
        max={5}
        step={1}
        value={3}
        onChange={onChange}
      />
    );
    const RNSlider =
      require('@react-native-community/slider').default ??
      require('@react-native-community/slider');
    const inner = UNSAFE_getByType(RNSlider);
    inner.props.onValueChange(999);
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('valor dentro do range passa intacto (com snap por step)', () => {
    const onChange = jest.fn();
    const { UNSAFE_getByType } = render(
      <Slider
        accessibilityLabel="teste"
        min={0}
        max={10}
        step={1}
        value={5}
        onChange={onChange}
      />
    );
    const RNSlider =
      require('@react-native-community/slider').default ??
      require('@react-native-community/slider');
    const inner = UNSAFE_getByType(RNSlider);
    inner.props.onValueChange(7.4);
    // step=1, Math.round(7.4) = 7
    expect(onChange).toHaveBeenLastCalledWith(7);
  });
});
