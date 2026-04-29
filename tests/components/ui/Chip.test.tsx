import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Chip, ChipGroup, type ChipOption } from '@/components/ui/Chip';

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
