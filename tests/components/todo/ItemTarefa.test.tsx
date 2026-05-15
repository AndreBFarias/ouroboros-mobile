// Testes do ItemTarefa (M17). Verifica render do titulo, data,
// checkbox, dispatch de onTap e onLongPress.
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import { ItemTarefa } from '@/components/todo/ItemTarefa';
import type { Tarefa } from '@/lib/schemas/tarefa';

// M31: Tarefa v2 inclui categoria, pessoa_destino e alarme com
// defaults explicitos no fixture (TS exige porque o tipo e nao-optional
// pos-parse). Defaults espelham os do schema (categoria 'outro',
// destino 'mim', sem alarme).
const baseTarefa: Tarefa = {
  tipo: 'tarefa',
  data: '2026-04-29',
  autor: 'pessoa_a',
  titulo: 'Comprar pão',
  feito: false,
  feito_em: null,
  categoria: 'outro',
  pessoa_destino: { tipo: 'mim' },
  alarme: null,
};

describe('ItemTarefa', () => {
  it('renderiza titulo em sentence case com acentuacao', () => {
    const { getByText } = render(
      <ItemTarefa tarefa={baseTarefa} onTap={() => undefined} />
    );
    expect(getByText('Comprar pão')).toBeTruthy();
  });

  it('renderiza data formatada DD/MM', () => {
    const { getByText } = render(
      <ItemTarefa tarefa={baseTarefa} onTap={() => undefined} />
    );
    expect(getByText('29/04')).toBeTruthy();
  });

  it('renderiza accessibilityLabel pendente quando feito=false', () => {
    const { getByLabelText } = render(
      <ItemTarefa tarefa={baseTarefa} onTap={() => undefined} />
    );
    expect(getByLabelText(/Comprar pão pendente/)).toBeTruthy();
  });

  it('renderiza accessibilityLabel feita quando feito=true', () => {
    const t = {
      ...baseTarefa,
      feito: true,
      feito_em: '2026-04-29T15:00:00-03:00',
    };
    const { getByLabelText } = render(
      <ItemTarefa tarefa={t} onTap={() => undefined} />
    );
    expect(getByLabelText(/Comprar pão feita/)).toBeTruthy();
  });

  it('dispara onTap no press', () => {
    const onTap = jest.fn();
    const { getByLabelText } = render(
      <ItemTarefa tarefa={baseTarefa} onTap={onTap} />
    );
    fireEvent.press(getByLabelText(/Comprar pão/));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('dispara onLongPress quando fornecido', () => {
    const onLongPress = jest.fn();
    const { getByLabelText } = render(
      <ItemTarefa
        tarefa={baseTarefa}
        onTap={() => undefined}
        onLongPress={onLongPress}
      />
    );
    fireEvent(getByLabelText(/Comprar pão/), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('nao dispara onTap quando disabled', () => {
    const onTap = jest.fn();
    const { getByLabelText } = render(
      <ItemTarefa tarefa={baseTarefa} onTap={onTap} disabled />
    );
    fireEvent.press(getByLabelText(/Comprar pão/));
    expect(onTap).not.toHaveBeenCalled();
  });

  it('renderiza com estado feito (sem quebrar)', () => {
    const t = {
      ...baseTarefa,
      feito: true,
      feito_em: '2026-04-29T15:00:00-03:00',
    };
    const { getByText } = render(
      <ItemTarefa tarefa={t} onTap={() => undefined} />
    );
    expect(getByText('Comprar pão')).toBeTruthy();
  });
});
