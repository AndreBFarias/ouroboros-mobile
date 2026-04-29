import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';

describe('Screen', () => {
  it('renderiza filhos sem erro', () => {
    const { getByText } = render(
      <Screen>
        <Text>conteudo de teste</Text>
      </Screen>
    );
    expect(getByText('conteudo de teste')).toBeTruthy();
  });

  it('aceita prop padded false', () => {
    const { getByText } = render(
      <Screen padded={false}>
        <Text>full bleed</Text>
      </Screen>
    );
    expect(getByText('full bleed')).toBeTruthy();
  });
});
