// Testes da HistoricoSparkline. Verifica empty state, render com
// pontos, tooltip ao tap.
import { render, fireEvent } from '@testing-library/react-native';
import { HistoricoSparkline } from '@/components/exercicios/HistoricoSparkline';
import type { HistoricoExecucao } from '@/lib/schemas/exercicio';

const historicoBase: HistoricoExecucao[] = [
  { data: '2026-04-15T10:00:00-03:00', carga: 40, series: 3, reps: 10 },
  { data: '2026-04-22T10:00:00-03:00', carga: 42.5, series: 3, reps: 10 },
  { data: '2026-04-29T10:00:00-03:00', carga: 45, series: 3, reps: 10 },
];

describe('HistoricoSparkline', () => {
  it('mostra "Sem histórico" quando lista vazia', () => {
    const { getByText } = render(
      <HistoricoSparkline historico={[]} largura={300} />
    );
    expect(getByText('Sem histórico')).toBeTruthy();
  });

  it('renderiza grafico com label de acessibilidade', () => {
    const { getByLabelText } = render(
      <HistoricoSparkline historico={historicoBase} largura={300} />
    );
    expect(getByLabelText('grafico historico 3 pontos')).toBeTruthy();
  });

  it('expoe pontos toucaveis para tooltip', () => {
    const { getAllByLabelText } = render(
      <HistoricoSparkline historico={historicoBase} largura={300} />
    );
    const pontos = getAllByLabelText(/^ponto \d+$/);
    expect(pontos).toHaveLength(3);
  });

  it('dispara tooltip ao pressionar ponto', () => {
    const { getByLabelText, getByText } = render(
      <HistoricoSparkline historico={historicoBase} largura={300} />
    );
    fireEvent.press(getByLabelText('ponto 2'));
    // Tooltip mostra DD/MM e dados.
    expect(getByText('22/04: 42.5 kg, 3x10')).toBeTruthy();
  });

  it('limita exibicao a maxPontos', () => {
    const longo: HistoricoExecucao[] = Array.from({ length: 20 }).map(
      (_, i) => ({
        data: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00-03:00`,
        carga: 30 + i,
        series: 3,
        reps: 10,
      })
    );
    const { getAllByLabelText } = render(
      <HistoricoSparkline historico={longo} largura={300} maxPontos={12} />
    );
    expect(getAllByLabelText(/^ponto \d+$/)).toHaveLength(12);
  });
});
