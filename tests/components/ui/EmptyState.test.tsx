import { render } from '@testing-library/react-native';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renderiza a frase fornecida', () => {
    const { getByText } = render(
      <EmptyState frase="nada anotado por enquanto." />
    );
    expect(getByText('nada anotado por enquanto.')).toBeTruthy();
  });

  it('expoe accessibilityLabel com prefixo vazio', () => {
    const { getByLabelText } = render(<EmptyState frase="sem itens." />);
    expect(getByLabelText('vazio: sem itens.')).toBeTruthy();
  });
});
