// Testes do EmptyStateMidia (R-SF-2). Placeholder reutilizavel para
// midia de execucao indisponivel. Cobre:
//   - Render default tamanho lg com label textual
//   - Render tamanho sm sem label textual (so icone)
//   - accessibilityLabel custom propagado
//
// Comentarios sem acento (convencao shell/CI).

import { render } from '@testing-library/react-native';
import { EmptyStateMidia } from '@/components/exercicios/EmptyStateMidia';

describe('EmptyStateMidia render', () => {
  it('renderiza com tamanho lg por default e mostra label textual', () => {
    const { getByLabelText, getByText } = render(<EmptyStateMidia />);
    expect(getByLabelText('midia indisponivel')).toBeTruthy();
    expect(getByText('Mídia indisponível')).toBeTruthy();
  });

  it('renderiza tamanho sm sem label textual (so icone)', () => {
    const { getByLabelText, queryByText } = render(
      <EmptyStateMidia size="sm" />
    );
    expect(getByLabelText('midia indisponivel')).toBeTruthy();
    expect(queryByText('Mídia indisponível')).toBeNull();
  });

  it('propaga accessibilityLabel custom', () => {
    const { getByLabelText } = render(
      <EmptyStateMidia accessibilityLabel="midia do agachamento ausente" />
    );
    expect(getByLabelText('midia do agachamento ausente')).toBeTruthy();
  });
});
