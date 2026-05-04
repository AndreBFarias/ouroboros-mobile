import { fireEvent, render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
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

  it('deriva accessibilityLabel do label quando label e string', () => {
    const { getByLabelText } = render(
      <Button label="Salvar" onPress={() => undefined} />
    );
    expect(getByLabelText('Salvar')).toBeTruthy();
  });

  it('usa accessibilityLabel explicito sobre o label string (override)', () => {
    const { getByLabelText, queryByLabelText } = render(
      <Button
        label="Salvar"
        accessibilityLabel="botao salvar"
        onPress={() => undefined}
      />
    );
    expect(getByLabelText('botao salvar')).toBeTruthy();
    expect(queryByLabelText('Salvar')).toBeNull();
  });

  it('aceita label ReactNode com accessibilityLabel desacoplado', () => {
    const onPress = jest.fn();
    const { getByLabelText, getByText } = render(
      <Button
        label={
          <View>
            <Text>Foo</Text>
          </View>
        }
        accessibilityLabel="botao foo"
        onPress={onPress}
      />
    );
    expect(getByText('Foo')).toBeTruthy();
    fireEvent.press(getByLabelText('botao foo'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
