import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renderiza filhos em variante default', () => {
    const { getByText } = render(
      <Card>
        <Text>conteudo</Text>
      </Card>
    );
    expect(getByText('conteudo')).toBeTruthy();
  });

  it('vira pressionavel quando onPress fornecido', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <Card onPress={onPress} accessibilityLabel="cartao do dia">
        <Text>tap me</Text>
      </Card>
    );
    fireEvent.press(getByLabelText('cartao do dia'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('aceita variant active sem quebrar', () => {
    const { getByText } = render(
      <Card variant="active">
        <Text>ativo</Text>
      </Card>
    );
    expect(getByText('ativo')).toBeTruthy();
  });
});
