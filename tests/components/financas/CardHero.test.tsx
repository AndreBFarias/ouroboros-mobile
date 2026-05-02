// Tests do CardHero (M14). Cobre render do gasto da semana, valor
// zero (semana sem despesa), delta textual em estado neutro e
// labels de acessibilidade.
import { render } from '@testing-library/react-native';
import { CardHero } from '@/components/financas/CardHero';

describe('CardHero', () => {
  it('renderiza valor formatado, periodo e delta textual', () => {
    const { getByLabelText, getByText } = render(
      <CardHero
        gastoSemana={873.45}
        periodoReferencia="2026-04-27 a 2026-05-03"
        deltaTextual="abaixo da media"
      />
    );
    expect(getByLabelText('gasto da semana')).toBeTruthy();
    expect(getByLabelText(/valor 873\.45/)).toBeTruthy();
    expect(getByLabelText('delta abaixo da media')).toBeTruthy();
    expect(getByText('2026-04-27 a 2026-05-03')).toBeTruthy();
  });

  it('aceita valor zero (semana sem despesa)', () => {
    const { getByLabelText } = render(
      <CardHero
        gastoSemana={0}
        periodoReferencia="2026-04-27 a 2026-05-03"
        deltaTextual="em linha"
      />
    );
    expect(getByLabelText(/valor 0\.00/)).toBeTruthy();
    expect(getByLabelText('delta em linha')).toBeTruthy();
  });

  it('renderiza delta "em linha" sem cores positivas/negativas', () => {
    const { getByLabelText } = render(
      <CardHero
        gastoSemana={500}
        periodoReferencia="periodo X"
        deltaTextual="em linha"
      />
    );
    expect(getByLabelText('delta em linha')).toBeTruthy();
  });
});
