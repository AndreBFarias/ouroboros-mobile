// Tests do HumorHeatmap (M10). Cobre render de 91 celulas, mapa de
// cores por nivel 1..5 e sem registro, modo sobreposto com dois
// layers e tap callback.
import { render, fireEvent } from '@testing-library/react-native';
import {
  HumorHeatmap,
  HumorHeatmapSobreposto,
  HUMOR_COLOR_MAP,
  montarCelulasHumor91Dias,
  type HumorCelulaVisual,
} from '@/components/data/HumorHeatmap';

function vazias(n: number): HumorCelulaVisual[] {
  return Array.from({ length: n }, (_, i) => ({
    data: `2026-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String(
      (i % 30) + 1
    ).padStart(2, '0')}`,
    nivel: 0,
  })) as HumorCelulaVisual[];
}

describe('HumorHeatmap', () => {
  it('renderiza 91 celulas (13 colunas x 7 linhas)', () => {
    const cels = vazias(91);
    const { getAllByLabelText } = render(<HumorHeatmap celulas={cels} />);
    expect(getAllByLabelText(/celula /).length).toBe(91);
  });

  it('preenche celulas faltantes com vazio quando caller passa menos', () => {
    const cels = vazias(40);
    const { getAllByLabelText } = render(<HumorHeatmap celulas={cels} />);
    expect(getAllByLabelText(/celula /).length).toBe(91);
  });

  it('aceita estado vazio (lista de zero celulas)', () => {
    const { getAllByLabelText } = render(<HumorHeatmap celulas={[]} />);
    // Padding interno completa para 91; todas vazias.
    const labels = getAllByLabelText(/celula /);
    expect(labels.length).toBe(91);
  });

  it('dispara onCelulaPress no tap', () => {
    const onPress = jest.fn();
    const cels: HumorCelulaVisual[] = [
      { data: '2026-04-29', nivel: 4 },
      ...vazias(90),
    ];
    const { getByLabelText } = render(
      <HumorHeatmap celulas={cels} onCelulaPress={onPress} />
    );
    fireEvent.press(getByLabelText('celula 2026-04-29 humor 4'));
    expect(onPress).toHaveBeenCalledWith(
      expect.objectContaining({ data: '2026-04-29', nivel: 4 })
    );
  });

  it('expoe niveis 0..5 distintos no mapa de cores', () => {
    // Smoke check do mapa: 6 entradas com strings nao vazias.
    expect(Object.keys(HUMOR_COLOR_MAP).length).toBe(6);
    for (const k of [0, 1, 2, 3, 4, 5] as const) {
      expect(typeof HUMOR_COLOR_MAP[k]).toBe('string');
      expect(HUMOR_COLOR_MAP[k].length).toBeGreaterThan(0);
    }
    // Niveis 1 e 5 usam tons distintos (vermelho vs verde).
    expect(HUMOR_COLOR_MAP[1]).not.toBe(HUMOR_COLOR_MAP[5]);
  });
});

describe('HumorHeatmapSobreposto', () => {
  it('renderiza dois layers (pessoa_a e pessoa_b)', () => {
    const a = vazias(91);
    const b = vazias(91);
    const { getByLabelText } = render(
      <HumorHeatmapSobreposto celulasA={a} celulasB={b} />
    );
    expect(getByLabelText('layer pessoa a')).toBeTruthy();
    expect(getByLabelText('layer pessoa b')).toBeTruthy();
  });

  it('encaminha tap do layer superior com a data', () => {
    const onPress = jest.fn();
    const a = vazias(91);
    const b: HumorCelulaVisual[] = [
      { data: '2026-04-29', nivel: 5 },
      ...vazias(90),
    ];
    const { getAllByLabelText } = render(
      <HumorHeatmapSobreposto
        celulasA={a}
        celulasB={b}
        onCelulaPress={onPress}
      />
    );
    // O layer B (top) tem celula com data 2026-04-29 nivel 5.
    const alvos = getAllByLabelText('celula 2026-04-29 humor 5');
    // B aparece como botao (Pressable). Pega o ultimo (camada B no
    // topo).
    fireEvent.press(alvos[alvos.length - 1]);
    expect(onPress).toHaveBeenCalledWith('2026-04-29');
  });
});

describe('montarCelulasHumor91Dias', () => {
  it('gera 91 celulas em ordem cronologica terminando em hoje', () => {
    const hoje = new Date('2026-04-30T15:00:00.000Z');
    const cels = montarCelulasHumor91Dias([], hoje);
    expect(cels).toHaveLength(91);
    expect(cels[90].data).toBe('2026-04-30');
    expect(cels[90].hoje).toBe(true);
  });

  it('mapeia humor 1..5 fielmente quando ha um unico registro por dia', () => {
    const hoje = new Date('2026-04-30T15:00:00.000Z');
    const registros = [
      { data: '2026-04-30', humor: 5 },
      { data: '2026-04-29', humor: 1 },
    ];
    const cels = montarCelulasHumor91Dias(registros, hoje);
    expect(cels[90].nivel).toBe(5);
    expect(cels[89].nivel).toBe(1);
    expect(cels[88].nivel).toBe(0); // sem registro
  });

  it('agrega multiplos registros do mesmo dia pela media arredondada', () => {
    const hoje = new Date('2026-04-30T15:00:00.000Z');
    const registros = [
      { data: '2026-04-30', humor: 4 },
      { data: '2026-04-30', humor: 2 },
    ];
    const cels = montarCelulasHumor91Dias(registros, hoje);
    expect(cels[90].nivel).toBe(3); // media (4+2)/2 = 3
  });
});
