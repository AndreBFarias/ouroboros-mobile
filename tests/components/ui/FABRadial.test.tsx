import { fireEvent, render } from '@testing-library/react-native';
import { FABRadial, type FABRadialKey } from '@/components/ui';

const TODAS_ACOES: FABRadialKey[] = [
  'humor',
  'voz',
  'camera',
  'exercicio',
  'vitoria',
  'trigger',
];

describe('FABRadial', () => {
  it('renderiza FAB principal com label de abrir quando fechado', () => {
    const { getByLabelText } = render(
      <FABRadial onSelect={() => undefined} />
    );
    expect(getByLabelText('abrir acoes')).toBeTruthy();
  });

  it('quando aberto disponibiliza os 6 botoes de acao', () => {
    const { getByLabelText } = render(
      <FABRadial onSelect={() => undefined} open />
    );
    for (const key of TODAS_ACOES) {
      expect(getByLabelText(`botao ${key}`)).toBeTruthy();
    }
    expect(getByLabelText('fechar acoes')).toBeTruthy();
  });

  it('selecionar uma acao dispara onSelect com a key correta', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <FABRadial onSelect={onSelect} open />
    );
    fireEvent.press(getByLabelText('botao humor'));
    expect(onSelect).toHaveBeenCalledWith('humor');
  });

  it('botao fechar menu radial existe no overlay aberto', () => {
    const { getByLabelText } = render(
      <FABRadial onSelect={() => undefined} open />
    );
    expect(getByLabelText('fechar menu radial')).toBeTruthy();
  });
});
