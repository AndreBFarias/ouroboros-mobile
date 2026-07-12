// Testes da MiniFinanceiroScreen apos M35 (aba "Em desenvolvimento").
// Cobre:
//   - render do header "Financas" com acentuacao PT-BR.
//   - render do EmptyState com a frase canonica.
//   - accessibilityLabel canonico (sem acento) na regiao do EmptyState.
//   - icone Wallet presente (via aria do EmptyState).
//
// O hook useFinancasCache e os cards M14 nao sao mais consumidos pela
// UI (ver JSDoc @deprecated no hook). Os testes confirmam que a tela
// renderiza apenas o EmptyState honesto.
//
// Comentarios sem acento (convencao shell/CI).
import { render } from '@testing-library/react-native';
import { MiniFinanceiroScreen } from '@/components/screens/MiniFinanceiroScreen';

describe('MiniFinanceiroScreen (M35)', () => {
  it('renderiza o header "Finanças" com acentuacao PT-BR', () => {
    const { getByText } = render(<MiniFinanceiroScreen />);
    expect(getByText('Finanças')).toBeTruthy();
  });

  it('renderiza a frase canonica de empty state honesto', () => {
    const { getByText } = render(<MiniFinanceiroScreen />);
    expect(
      getByText('Em desenvolvimento. Disponível em versão futura.')
    ).toBeTruthy();
  });

  it('expoe accessibility label sem acento na regiao do empty state', () => {
    const { getByLabelText } = render(<MiniFinanceiroScreen />);
    expect(getByLabelText('financas em desenvolvimento')).toBeTruthy();
  });

  it('expoe label canonico do EmptyState com a frase entre prefixo "vazio:"', () => {
    const { getByLabelText } = render(<MiniFinanceiroScreen />);
    expect(
      getByLabelText('vazio: Em desenvolvimento. Disponível em versão futura.')
    ).toBeTruthy();
  });

  it('nao renderiza textos legados de cache backend', () => {
    const { queryByText } = render(<MiniFinanceiroScreen />);
    expect(
      queryByText('Rode o pipeline no desktop pra carregar dados.')
    ).toBeNull();
    expect(
      queryByText('Cache em formato desconhecido. Rode o pipeline atualizado.')
    ).toBeNull();
    expect(queryByText('Carregando…')).toBeNull();
  });
});
