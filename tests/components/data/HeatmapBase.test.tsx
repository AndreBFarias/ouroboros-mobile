// Testes do HeatmapBase. Cobre render de 91 celulas, paleta verde
// (treinos), paleta humor, hoje destacado em outline purple, tap
// callback e helper montarCelulasUltimos91Dias.
import { render, fireEvent } from '@testing-library/react-native';
import {
  HeatmapBase,
  PALETA_TREINOS,
  PALETA_HUMOR,
  montarCelulasUltimos91Dias,
  type HeatmapCell,
} from '@/components/data/HeatmapBase';

function geraCelulasVazias(n: number): HeatmapCell[] {
  return Array.from({ length: n }, (_, i) => ({
    data: `2026-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String(
      (i % 30) + 1
    ).padStart(2, '0')}`,
    intensidade: 0,
  })) as HeatmapCell[];
}

describe('HeatmapBase', () => {
  it('renderiza 91 celulas (13x7)', () => {
    const cels = geraCelulasVazias(91);
    const { getAllByLabelText } = render(
      <HeatmapBase celulas={cels} paleta={PALETA_TREINOS} />
    );
    const labels = getAllByLabelText(/celula /);
    expect(labels.length).toBe(91);
  });

  it('preenche com vazio quando caller passa menos celulas', () => {
    const cels = geraCelulasVazias(50);
    const { getAllByLabelText } = render(
      <HeatmapBase celulas={cels} paleta={PALETA_TREINOS} />
    );
    expect(getAllByLabelText(/celula /).length).toBe(91);
  });

  it('aceita paleta diferente (treinos vs humor)', () => {
    const cels: HeatmapCell[] = [
      { data: '2026-04-23', intensidade: 3 },
      ...geraCelulasVazias(90),
    ];
    const { unmount } = render(
      <HeatmapBase celulas={cels} paleta={PALETA_TREINOS} />
    );
    unmount();
    const { getAllByLabelText } = render(
      <HeatmapBase celulas={cels} paleta={PALETA_HUMOR} />
    );
    expect(getAllByLabelText(/celula /).length).toBe(91);
  });

  it('dispara onCelulaPress no tap', () => {
    const onPress = jest.fn();
    const cels: HeatmapCell[] = [
      { data: '2026-04-23', intensidade: 2 },
      ...geraCelulasVazias(90),
    ];
    const { getByLabelText } = render(
      <HeatmapBase
        celulas={cels}
        paleta={PALETA_TREINOS}
        onCelulaPress={onPress}
      />
    );
    fireEvent.press(getByLabelText('celula 2026-04-23 intensidade 2'));
    expect(onPress).toHaveBeenCalledWith(
      expect.objectContaining({ data: '2026-04-23', intensidade: 2 })
    );
  });
});

describe('montarCelulasUltimos91Dias', () => {
  it('gera 91 celulas em ordem cronologica', () => {
    const hoje = new Date('2026-04-30T15:00:00.000Z');
    const cels = montarCelulasUltimos91Dias({}, hoje);
    expect(cels).toHaveLength(91);
    // Ultima celula = hoje.
    expect(cels[90].data).toBe('2026-04-30');
    expect(cels[90].hoje).toBe(true);
  });

  it('mapeia contagens 0/1/2/3+ para intensidade 0/1/2/3', () => {
    const hoje = new Date('2026-04-30T15:00:00.000Z');
    const contagens = {
      '2026-04-30': 5, // 3+
      '2026-04-29': 2,
      '2026-04-28': 1,
      '2026-04-27': 0,
    };
    const cels = montarCelulasUltimos91Dias(contagens, hoje);
    const ult = cels.slice(-4);
    expect(ult[3].intensidade).toBe(3); // hoje (5)
    expect(ult[2].intensidade).toBe(2); // ontem (2)
    expect(ult[1].intensidade).toBe(1); // anteontem (1)
    expect(ult[0].intensidade).toBe(0); // 4 dias atras (0)
  });

  it('marca hoje destacado', () => {
    const hoje = new Date('2026-04-30T15:00:00.000Z');
    const cels = montarCelulasUltimos91Dias({}, hoje);
    const apenasHoje = cels.filter((c) => c.hoje);
    expect(apenasHoje).toHaveLength(1);
    expect(apenasHoje[0].data).toBe('2026-04-30');
  });
});
