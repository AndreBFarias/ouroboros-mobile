// Tests do CardTopCategorias (M14). Cobre render de 5 itens, lista
// vazia que oculta o card e percentual usado na barra.
import { render } from '@testing-library/react-native';
import { CardTopCategorias } from '@/components/financas/CardTopCategorias';

const CINCO = [
  { nome: 'Mercado', valor: 326.19, percentual: 0.37 },
  { nome: 'Delivery', valor: 158.79, percentual: 0.18 },
  { nome: 'Farmacia', valor: 104.0, percentual: 0.12 },
  { nome: 'Transporte', valor: 89.6, percentual: 0.1 },
  { nome: 'Pets', valor: 75.0, percentual: 0.09 },
];

describe('CardTopCategorias', () => {
  it('renderiza 5 itens quando passa lista cheia', () => {
    const { getAllByLabelText } = render(
      <CardTopCategorias categorias={CINCO} />
    );
    const itens = getAllByLabelText(/categoria /);
    expect(itens.length).toBe(5);
  });

  it('oculta o card (retorna null) quando lista esta vazia', () => {
    const { toJSON } = render(<CardTopCategorias categorias={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('expoe percentual em accessibilityLabel da barra', () => {
    const { getByLabelText } = render(
      <CardTopCategorias categorias={[CINCO[0]]} />
    );
    // Mercado 0.37 -> arredonda para 37
    expect(getByLabelText('percentual 37')).toBeTruthy();
  });

  it('limita a 5 itens mesmo quando recebe mais', () => {
    const seis = [
      ...CINCO,
      { nome: 'Outros', valor: 10, percentual: 0.01 },
    ];
    const { getAllByLabelText } = render(
      <CardTopCategorias categorias={seis} />
    );
    expect(getAllByLabelText(/categoria /).length).toBe(5);
  });
});
