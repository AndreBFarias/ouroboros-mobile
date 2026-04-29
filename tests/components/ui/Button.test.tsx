import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renderiza label e dispara onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Button label="salvar" onPress={onPress} />
    );
    fireEvent.press(getByLabelText('salvar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('nao dispara onPress quando disabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Button label="salvar" onPress={onPress} disabled />
    );
    fireEvent.press(getByLabelText('salvar'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('aceita variantes sem quebrar render', () => {
    for (const variant of ['primary', 'success', 'ghost', 'destructive'] as const) {
      const { getByLabelText, unmount } = render(
        <Button label={`v ${variant}`} onPress={() => undefined} variant={variant} />
      );
      expect(getByLabelText(`v ${variant}`)).toBeTruthy();
      unmount();
    }
  });
});
