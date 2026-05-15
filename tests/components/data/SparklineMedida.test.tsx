// Testes do SparklineMedida. Cobre empty state (<2 pontos), render
// com pontos e label de acessibilidade.
import { render } from '@testing-library/react-native';
import { SparklineMedida } from '@/components/data/SparklineMedida';
import type { SparklineMedidaPoint } from '@/components/data/SparklineMedida';

const pontosBase: SparklineMedidaPoint[] = [
  { data: '2026-04-01', valor: 78.4 },
  { data: '2026-04-08', valor: 78.0 },
  { data: '2026-04-15', valor: 77.8 },
  { data: '2026-04-22', valor: 77.5 },
  { data: '2026-04-29', valor: 77.2 },
];

describe('SparklineMedida', () => {
  it('mostra "Aguardando mais registros." quando lista vazia', () => {
    const { getByText } = render(<SparklineMedida pontos={[]} largura={200} />);
    expect(getByText('Aguardando mais registros.')).toBeTruthy();
  });

  it('mostra "Aguardando" com apenas 1 ponto', () => {
    const { getByText } = render(
      <SparklineMedida
        pontos={[{ data: '2026-04-29', valor: 77 }]}
        largura={200}
      />
    );
    expect(getByText('Aguardando mais registros.')).toBeTruthy();
  });

  it('renderiza grafico com label de acessibilidade quando ha 2+ pontos', () => {
    const { getByLabelText } = render(
      <SparklineMedida pontos={pontosBase} largura={200} />
    );
    expect(getByLabelText('grafico medida 5 pontos')).toBeTruthy();
  });

  it('limita exibicao a maxPontos', () => {
    const longo: SparklineMedidaPoint[] = Array.from({ length: 20 }).map(
      (_, i) => ({
        data: `2026-04-${String(i + 1).padStart(2, '0')}`,
        valor: 70 + i,
      })
    );
    const { getByLabelText } = render(
      <SparklineMedida pontos={longo} largura={200} maxPontos={12} />
    );
    expect(getByLabelText('grafico medida 12 pontos')).toBeTruthy();
  });

  it('aceita valores iguais sem dividir por zero', () => {
    const constante: SparklineMedidaPoint[] = [
      { data: '2026-04-01', valor: 70 },
      { data: '2026-04-08', valor: 70 },
      { data: '2026-04-15', valor: 70 },
    ];
    const { getByLabelText } = render(
      <SparklineMedida pontos={constante} largura={200} />
    );
    expect(getByLabelText('grafico medida 3 pontos')).toBeTruthy();
  });
});
