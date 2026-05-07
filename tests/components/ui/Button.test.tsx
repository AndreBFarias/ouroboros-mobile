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

  // K5 (M-BOTOES-LARGURA, 2026-05-07): prop fullWidth aplica
  // width 100% tanto no Pressable externo quanto no estilo do
  // MotiView interno. Sem a prop, o botao mantem largura
  // intrinseca do conteudo (default false).
  it('fullWidth=true aplica width 100% no estilo', () => {
    const { getByLabelText } = render(
      <Button label="Salvar" onPress={() => undefined} fullWidth />
    );
    const node = getByLabelText('Salvar');
    const style = node.props.style;
    if (Array.isArray(style)) {
      const merged = Object.assign({}, ...style);
      expect(merged.width).toBe('100%');
    } else {
      expect(style?.width).toBe('100%');
    }
  });

  it('fullWidth default (omitido) nao define width', () => {
    const { getByLabelText } = render(
      <Button label="Salvar" onPress={() => undefined} />
    );
    const node = getByLabelText('Salvar');
    const style = node.props.style;
    if (Array.isArray(style)) {
      const merged = Object.assign({}, ...style);
      expect(merged.width).toBeUndefined();
    } else {
      expect(style?.width).toBeUndefined();
    }
  });
});
