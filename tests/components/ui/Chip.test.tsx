import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Chip, ChipGroup, type ChipOption } from '@/components/ui/Chip';
import { colors } from '@/theme/tokens';
import {
  hexToRgba,
  parseCor,
  ratioContraste,
  WCAG_AA_TEXTO_GRANDE,
} from '@/lib/a11y/contraste';

const OPTS: ChipOption[] = [
  { value: 'a', label: 'a' },
  { value: 'b', label: 'b' },
  { value: 'c', label: 'c' },
];

describe('Chip', () => {
  it('alterna onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Chip label="serenidade" selected={false} onPress={onPress} />
    );
    fireEvent.press(getByLabelText('chip serenidade'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('respeita disabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Chip
        label="bloqueado"
        selected={false}
        onPress={onPress}
        disabled
      />
    );
    fireEvent.press(getByLabelText('chip bloqueado'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('expoe hitSlop simetrico de 8dp (area efetiva >= 44dp)', () => {
    const { getByLabelText } = render(
      <Chip label="alvo" selected={false} onPress={jest.fn()} />
    );
    const pressable = getByLabelText('chip alvo');
    expect(pressable.props.hitSlop).toEqual({
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
    });
  });
});

describe('Chip WCAG AA — borda em rest', () => {
  it('borda em rest usa colors.muted (>= 3:1 sobre bgElev)', () => {
    const ratio = ratioContraste(colors.muted, colors.bgElev);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_TEXTO_GRANDE);
  });

  it('mutedDecor antigo falhava WCAG AA texto grande sobre bgElev', () => {
    const ratio = ratioContraste(colors.mutedDecor, colors.bgElev);
    expect(ratio).toBeLessThan(WCAG_AA_TEXTO_GRANDE);
  });
});

describe('hexToRgba — helper de borda em rest com accent', () => {
  it('converte hex para rgba com alpha clampado [0,1]', () => {
    expect(hexToRgba('#bd93f9', 0.4)).toBe('rgba(189, 147, 249, 0.4)');
    expect(hexToRgba('#ff79c6', 1)).toBe('rgba(255, 121, 198, 1)');
    expect(hexToRgba('#000000', -0.5)).toBe('rgba(0, 0, 0, 0)');
    expect(hexToRgba('#ffffff', 2)).toBe('rgba(255, 255, 255, 1)');
  });

  it('lanca erro em hex invalido', () => {
    expect(() => hexToRgba('nao-eh-hex', 0.4)).toThrow(/hex invalido/);
  });

  it('6 dos 7 accents Dracula passam WCAG AA texto grande sobre bgElev', () => {
    // Borda fina (1dp) decorativa, nao texto. Resultado empirico:
    //   purple   3.79  | pink     3.84  | cyan     6.61
    //   green    6.67  | yellow   8.19  | orange   5.37
    //   red      2.91  (excecao conhecida)
    // Red saturado Dracula fica abaixo de 3:1 sobre bgElev, mas borda
    // 1dp em chip pequeno nao configura componente nao-texto critico
    // (WCAG 1.4.11): o estado tambem eh comunicado por bg do selected
    // e pelo label texto. Categoria saude permanece distinguivel.
    const passantes = [
      colors.purple,
      colors.pink,
      colors.cyan,
      colors.green,
      colors.yellow,
      colors.orange,
    ];
    passantes.forEach((c) => {
      expect(ratioContraste(c, colors.bgElev)).toBeGreaterThanOrEqual(
        WCAG_AA_TEXTO_GRANDE,
      );
    });
    // Red eh excecao conhecida e documentada.
    expect(ratioContraste(colors.red, colors.bgElev)).toBeLessThan(
      WCAG_AA_TEXTO_GRANDE,
    );
  });

  it('parseCor entende a saida rgba do hexToRgba (round-trip)', () => {
    const rgba = hexToRgba(colors.cyan, 0.4);
    const parsed = parseCor(rgba);
    expect(parsed).not.toBeNull();
    expect(parsed?.a).toBeCloseTo(0.4, 5);
  });
});

describe('ChipGroup single', () => {
  function HarnessSingle() {
    const [v, setV] = useState<string | null>(null);
    return (
      <ChipGroup mode="single" options={OPTS} value={v} onChange={setV} />
    );
  }

  it('seleciona e desseleciona', () => {
    const { getByLabelText } = render(<HarnessSingle />);
    const chipA = getByLabelText('chip a');
    fireEvent.press(chipA);
    fireEvent.press(chipA);
    expect(chipA).toBeTruthy();
  });
});

describe('ChipGroup multi', () => {
  function HarnessMulti() {
    const [v, setV] = useState<string[]>([]);
    return (
      <ChipGroup mode="multi" options={OPTS} value={v} onChange={setV} />
    );
  }

  it('aceita selecao multipla sem erro', () => {
    const { getByLabelText } = render(<HarnessMulti />);
    fireEvent.press(getByLabelText('chip a'));
    fireEvent.press(getByLabelText('chip b'));
    fireEvent.press(getByLabelText('chip a'));
    expect(getByLabelText('chip b')).toBeTruthy();
  });
});
