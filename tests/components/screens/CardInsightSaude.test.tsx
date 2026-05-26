// R-INT-3-HC-INSIGHT-SEMANAL: testes do CardInsightSaude. Componente
// puro: render com insight mostra a frase; null oculta o card.
//
// Comentarios sem acento.
import { render } from '@testing-library/react-native';
import type { InsightSaude } from '@/lib/recap/insights';

import { CardInsightSaude } from '@/components/screens/CardInsightSaude';

const insight: InsightSaude = {
  tipo: 'passos',
  deltaPct: 18,
  texto: 'Você caminhou 18% mais que a semana passada.',
};

describe('CardInsightSaude', () => {
  it('com insight, renderiza o card e a frase', () => {
    const { getByLabelText, getByText } = render(
      <CardInsightSaude insight={insight} />
    );
    expect(getByLabelText('insight saude')).toBeTruthy();
    expect(
      getByText('Você caminhou 18% mais que a semana passada.')
    ).toBeTruthy();
  });

  it('com insight null, o card fica oculto', () => {
    const { queryByLabelText } = render(<CardInsightSaude insight={null} />);
    expect(queryByLabelText('insight saude')).toBeNull();
  });
});
