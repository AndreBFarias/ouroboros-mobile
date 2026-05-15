import { fireEvent, render } from '@testing-library/react-native';
import { FABRadial, type FABRadialKey } from '@/components/ui';

// Mapa key -> a11y label (espelha src/components/ui/FABRadial.tsx).
const A11Y_LABELS: Record<FABRadialKey, string> = {
  humor: 'botao humor',
  voz: 'botao voz',
  camera: 'botao camera',
  exercicio: 'botao exercicios',
  vitoria: 'botao conquista',
  trigger: 'botao crise',
};

describe('FABRadial', () => {
  it('renderiza FAB principal com label de abrir quando fechado', () => {
    const { getByLabelText } = render(<FABRadial onSelect={() => undefined} />);
    expect(getByLabelText('abrir acoes')).toBeTruthy();
  });

  it('quando aberto disponibiliza os 6 botoes de acao', () => {
    const { getByLabelText } = render(
      <FABRadial onSelect={() => undefined} open />
    );
    for (const key of Object.keys(A11Y_LABELS) as FABRadialKey[]) {
      expect(getByLabelText(A11Y_LABELS[key])).toBeTruthy();
    }
    expect(getByLabelText('fechar acoes')).toBeTruthy();
  });

  it('selecionar uma acao dispara onSelect com a key correta', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(<FABRadial onSelect={onSelect} open />);
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
