import { fireEvent, render } from '@testing-library/react-native';
import { FABRadial, type FABRadialKey } from '@/components/ui';

// Mapa key -> a11y label (espelha src/components/ui/FABRadial.tsx).
// R-FAB-1: entry 'voz' removida; sao 5 acoes agora (humor, camera,
// exercicio, vitoria, trigger).
// R-A11Y-TALKBACK (2026-05-17): prefixo "botao " removido. accessibility
// Role="button" no Pressable ja faz o TalkBack anunciar a role; manter o
// prefixo no label causava leitura duplicada ("botao botao humor").
const A11Y_LABELS: Record<FABRadialKey, string> = {
  humor: 'humor',
  camera: 'camera',
  exercicio: 'exercicios',
  vitoria: 'conquista',
  trigger: 'crise',
};

describe('FABRadial', () => {
  it('renderiza FAB principal com label de abrir quando fechado', () => {
    const { getByLabelText } = render(<FABRadial onSelect={() => undefined} />);
    expect(getByLabelText('abrir acoes')).toBeTruthy();
  });

  it('quando aberto disponibiliza os 5 botoes de acao', () => {
    const { getByLabelText, queryByLabelText } = render(
      <FABRadial onSelect={() => undefined} open />
    );
    for (const key of Object.keys(A11Y_LABELS) as FABRadialKey[]) {
      expect(getByLabelText(A11Y_LABELS[key])).toBeTruthy();
    }
    // R-FAB-1: confirma ausencia explicita do botao "voz" removido.
    expect(queryByLabelText('voz')).toBeNull();
    // R-A11Y-TALKBACK: confirma que o prefixo redundante foi removido.
    expect(queryByLabelText('botao humor')).toBeNull();
    expect(getByLabelText('fechar acoes')).toBeTruthy();
  });

  it('selecionar uma acao dispara onSelect com a key correta', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(<FABRadial onSelect={onSelect} open />);
    fireEvent.press(getByLabelText('humor'));
    expect(onSelect).toHaveBeenCalledWith('humor');
  });

  it('botao fechar menu radial existe no overlay aberto', () => {
    const { getByLabelText } = render(
      <FABRadial onSelect={() => undefined} open />
    );
    expect(getByLabelText('fechar menu radial')).toBeTruthy();
  });
});
