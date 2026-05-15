import { fireEvent, render } from '@testing-library/react-native';
import { FAB } from '@/components/ui';

describe('FAB', () => {
  it('renderiza com label default e dispara onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<FAB onPress={onPress} />);
    fireEvent.press(getByLabelText('acao rapida'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('aceita accessibilityLabel custom', () => {
    const { getByLabelText } = render(
      <FAB onPress={() => undefined} accessibilityLabel="adicionar item" />
    );
    expect(getByLabelText('adicionar item')).toBeTruthy();
  });

  it('disabled bloqueia onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<FAB onPress={onPress} disabled />);
    fireEvent.press(getByLabelText('acao rapida'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
