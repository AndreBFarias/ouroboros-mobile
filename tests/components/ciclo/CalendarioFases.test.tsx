// Testes do CalendarioFases (M14.5). Cobre:
//  - Render de 28 celulas (4x7) por default.
//  - Adapta para 35 celulas (5x7) quando duracao > 28.
//  - Pinta celulas com registro real (vs inferidas).
//  - Tap em celula chama onSelectDay com data correta.
//  - Quando dataInicioUltimoCiclo e null renderiza placeholder.
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import { CalendarioFases } from '@/components/ciclo/CalendarioFases';
import type { CicloMenstrualMeta } from '@/lib/schemas/ciclo_menstrual';

function fixture(over: Partial<CicloMenstrualMeta> = {}): CicloMenstrualMeta {
  return {
    tipo: 'ciclo_menstrual',
    data: '2026-04-12',
    autor: 'pessoa_a',
    data_inicio: '2026-04-12',
    fase: 'menstrual',
    sintomas: [],
    intensidade: null,
    humor_associado: null,
    texto: null,
    ...over,
  };
}

describe('CalendarioFases', () => {
  it('renderiza 28 celulas (4x7) por default', () => {
    const { getAllByLabelText } = render(
      <CalendarioFases
        registros={[]}
        dataInicioUltimoCiclo="2026-04-01"
        duracao={28}
        onSelectDay={() => undefined}
      />
    );
    const cells = getAllByLabelText(/dia \d+ fase/);
    expect(cells.length).toBe(28);
  });

  it('adapta para 35 celulas quando duracao > 28', () => {
    const { getAllByLabelText } = render(
      <CalendarioFases
        registros={[]}
        dataInicioUltimoCiclo="2026-04-01"
        duracao={32}
        onSelectDay={() => undefined}
      />
    );
    expect(getAllByLabelText(/dia \d+ fase/).length).toBe(35);
  });

  it('pinta fase real do registro quando data bate', () => {
    const registros: CicloMenstrualMeta[] = [
      fixture({ data: '2026-04-15', fase: 'ovulatoria' }),
    ];
    const { getByLabelText } = render(
      <CalendarioFases
        registros={registros}
        dataInicioUltimoCiclo="2026-04-01"
        duracao={28}
        onSelectDay={() => undefined}
      />
    );
    // Dia 15 (index 14) deve ter accessibilityLabel ovulatoria.
    expect(getByLabelText('dia 15 fase ovulatoria')).toBeTruthy();
  });

  it('infere fase quando nao ha registro daquele dia', () => {
    const { getByLabelText } = render(
      <CalendarioFases
        registros={[]}
        dataInicioUltimoCiclo="2026-04-01"
        duracao={28}
        onSelectDay={() => undefined}
      />
    );
    // Dia 1 e menstrual por convencao do inferirFase.
    expect(getByLabelText('dia 1 fase menstrual')).toBeTruthy();
    // Dia 14 e ovulatoria (faixa 14-16).
    expect(getByLabelText('dia 14 fase ovulatoria')).toBeTruthy();
  });

  it('tap em celula chama onSelectDay com data correta', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <CalendarioFases
        registros={[]}
        dataInicioUltimoCiclo="2026-04-01"
        duracao={28}
        onSelectDay={onSelect}
      />
    );
    // Dia 5 -> 2026-04-05.
    fireEvent.press(getByLabelText('dia 5 fase menstrual'));
    expect(onSelect).toHaveBeenCalledWith('2026-04-05');
  });

  it('renderiza placeholders quando dataInicio e null sem quebrar', () => {
    const { getAllByLabelText } = render(
      <CalendarioFases
        registros={[]}
        dataInicioUltimoCiclo={null}
        duracao={28}
        onSelectDay={() => undefined}
      />
    );
    // Mesmo sem inicio conhecido, gera 28 celulas inertes.
    expect(getAllByLabelText(/dia \d+ fase/).length).toBe(28);
  });

  it('tap em placeholder (sem data) nao chama onSelectDay', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <CalendarioFases
        registros={[]}
        dataInicioUltimoCiclo={null}
        duracao={28}
        onSelectDay={onSelect}
      />
    );
    fireEvent.press(getByLabelText('dia 1 fase menstrual'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
