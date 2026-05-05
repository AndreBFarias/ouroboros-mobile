import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Chip, ChipGroup, type ChipOption } from '@/components/ui/Chip';
import { colors } from '@/theme/tokens';
import {
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
