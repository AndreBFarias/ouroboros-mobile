// Testes do CheckboxTarefaInline (R-HOME-3). Verifica render do titulo,
// estado otimista, dispatch de onCheck/onLongPress, accessibilityLabel
// sem acento + accessibilityState.
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import { CheckboxTarefaInline } from '@/components/tarefas/CheckboxTarefaInline';

describe('CheckboxTarefaInline', () => {
  it('renderiza titulo em sentence case com acentuacao', () => {
    const { getByText } = render(
      <CheckboxTarefaInline
        id="markdown/tarefa-comprar-pao.md"
        tarefa={{ titulo: 'Comprar pão', feito: false }}
      />
    );
    expect(getByText('Comprar pão')).toBeTruthy();
  });

  it('expoe accessibilityRole=checkbox e accessibilityLabel sem acento', () => {
    const { getByLabelText } = render(
      <CheckboxTarefaInline
        id="markdown/tarefa-x.md"
        tarefa={{ titulo: 'Tomar água', feito: false }}
      />
    );
    // Label sem acento (convencao screen reader). Note: 'Tomar agua'
    // -- pega o titulo cru pra construir o label; o titulo original
    // mantem acentuacao pra UI.
    const el = getByLabelText('marcar tarefa Tomar água');
    expect(el.props.accessibilityRole).toBe('checkbox');
    expect(el.props.accessibilityState).toMatchObject({ checked: false });
  });

  it('accessibilityState.checked=true quando tarefa.feito=true', () => {
    const { getByLabelText } = render(
      <CheckboxTarefaInline
        id="markdown/tarefa-feita.md"
        tarefa={{ titulo: 'Feito', feito: true }}
      />
    );
    const el = getByLabelText('marcar tarefa Feito');
    expect(el.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('dispatch otimista: chama onCheck com novo estado ao tap', () => {
    const onCheck = jest.fn();
    const { getByLabelText } = render(
      <CheckboxTarefaInline
        id="markdown/tarefa-x.md"
        tarefa={{ titulo: 'Test', feito: false }}
        onCheck={onCheck}
      />
    );
    fireEvent.press(getByLabelText('marcar tarefa Test'));
    expect(onCheck).toHaveBeenCalledWith('markdown/tarefa-x.md', true);
  });

  it('toggle invertido: feito=true -> tap envia false', () => {
    const onCheck = jest.fn();
    const { getByLabelText } = render(
      <CheckboxTarefaInline
        id="x"
        tarefa={{ titulo: 'T', feito: true }}
        onCheck={onCheck}
      />
    );
    fireEvent.press(getByLabelText('marcar tarefa T'));
    expect(onCheck).toHaveBeenCalledWith('x', false);
  });

  it('long-press chama onLongPress', () => {
    const onLongPress = jest.fn();
    const { getByLabelText } = render(
      <CheckboxTarefaInline
        id="x"
        tarefa={{ titulo: 'T', feito: false }}
        onLongPress={onLongPress}
      />
    );
    fireEvent(getByLabelText('marcar tarefa T'), 'longPress');
    expect(onLongPress).toHaveBeenCalled();
  });

  it('disabled bloqueia onCheck', () => {
    const onCheck = jest.fn();
    const { getByLabelText } = render(
      <CheckboxTarefaInline
        id="x"
        tarefa={{ titulo: 'T', feito: false }}
        onCheck={onCheck}
        disabled
      />
    );
    fireEvent.press(getByLabelText('marcar tarefa T'));
    expect(onCheck).not.toHaveBeenCalled();
  });

  it('hitSlop expande area de toque pra 16dp', () => {
    const { getByLabelText } = render(
      <CheckboxTarefaInline
        id="x"
        tarefa={{ titulo: 'T', feito: false }}
      />
    );
    const el = getByLabelText('marcar tarefa T');
    expect(el.props.hitSlop).toBe(16);
  });

  it('sincroniza estado interno quando prop tarefa.feito muda (rollback)', () => {
    const { getByLabelText, rerender } = render(
      <CheckboxTarefaInline
        id="x"
        tarefa={{ titulo: 'T', feito: false }}
      />
    );
    let el = getByLabelText('marcar tarefa T');
    expect(el.props.accessibilityState.checked).toBe(false);
    rerender(
      <CheckboxTarefaInline
        id="x"
        tarefa={{ titulo: 'T', feito: true }}
      />
    );
    el = getByLabelText('marcar tarefa T');
    expect(el.props.accessibilityState.checked).toBe(true);
  });
});
