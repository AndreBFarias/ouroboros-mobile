// Testes do useToastUndo (R-HOME-3). Cobre:
//   - render do UndoOverlay quando mostrarUndo e disparado,
//   - tap em "Desfazer" chama o callback + oculta o toast,
//   - timeout default 5000ms oculta sem chamar onUndo,
//   - dismiss programatico.
//
// Padrao: usa botao "trigger" pra disparar mostrarUndo via fireEvent
// dentro de act, evitando race entre microtask e setState.
//
// Comentarios sem acento (convencao shell/CI).
import { act, fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { useToastUndo } from '@/lib/hooks/useToastUndo';

interface HostProps {
  onUndo: () => void;
  mensagem: string;
  timeoutMs?: number;
}

function Host({ onUndo, mensagem, timeoutMs }: HostProps) {
  const { mostrarUndo, dismiss, UndoOverlay } = useToastUndo();
  return (
    <>
      <Pressable
        accessibilityLabel="disparar"
        onPress={() => mostrarUndo(mensagem, onUndo, timeoutMs)}
      >
        <Text>disparar</Text>
      </Pressable>
      <Pressable accessibilityLabel="dismiss-programatico" onPress={dismiss}>
        <Text>dismiss</Text>
      </Pressable>
      <UndoOverlay />
    </>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('useToastUndo', () => {
  it('UndoOverlay nao renderiza nada quando idle', () => {
    const { queryByLabelText } = render(
      <Host onUndo={() => undefined} mensagem="Tarefa concluida" />
    );
    expect(queryByLabelText('desfazer')).toBeNull();
  });

  it('mostra toast com mensagem + botao Desfazer apos mostrarUndo', () => {
    const { getByLabelText, getByText } = render(
      <Host onUndo={() => undefined} mensagem="Tarefa concluida" />
    );
    fireEvent.press(getByLabelText('disparar'));
    expect(getByText('Tarefa concluida')).toBeTruthy();
    expect(getByLabelText('desfazer')).toBeTruthy();
  });

  it('tap em Desfazer chama callback + remove toast', () => {
    const onUndo = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <Host onUndo={onUndo} mensagem="Tarefa concluida" />
    );
    fireEvent.press(getByLabelText('disparar'));
    expect(queryByLabelText('desfazer')).toBeTruthy();
    fireEvent.press(getByLabelText('desfazer'));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(queryByLabelText('desfazer')).toBeNull();
  });

  it('timeout default 5000ms oculta toast sem chamar onUndo', () => {
    const onUndo = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <Host onUndo={onUndo} mensagem="Tarefa concluida" />
    );
    fireEvent.press(getByLabelText('disparar'));
    expect(queryByLabelText('desfazer')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(queryByLabelText('desfazer')).toBeNull();
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('respeita timeoutMs customizado', () => {
    const onUndo = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <Host onUndo={onUndo} mensagem="X" timeoutMs={1500} />
    );
    fireEvent.press(getByLabelText('disparar'));
    expect(queryByLabelText('desfazer')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(queryByLabelText('desfazer')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(queryByLabelText('desfazer')).toBeNull();
  });

  it('mostrarUndo consecutivo substitui o toast anterior (sem fila)', () => {
    const onUndoA = jest.fn();
    const onUndoB = jest.fn();
    function HostDuplo() {
      const { mostrarUndo, UndoOverlay } = useToastUndo();
      return (
        <>
          <Pressable
            accessibilityLabel="dispA"
            onPress={() => mostrarUndo('Mensagem A primeira', onUndoA)}
          >
            <Text>botaoA</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="dispB"
            onPress={() => mostrarUndo('Mensagem B segunda', onUndoB)}
          >
            <Text>botaoB</Text>
          </Pressable>
          <UndoOverlay />
        </>
      );
    }
    const { getByLabelText, getByText, queryByText } = render(<HostDuplo />);
    fireEvent.press(getByLabelText('dispA'));
    expect(getByText('Mensagem A primeira')).toBeTruthy();
    fireEvent.press(getByLabelText('dispB'));
    // A foi substituida; so B visivel agora.
    expect(queryByText('Mensagem A primeira')).toBeNull();
    expect(getByText('Mensagem B segunda')).toBeTruthy();
    // Tap em desfazer chama onUndoB (o atual).
    fireEvent.press(getByLabelText('desfazer'));
    expect(onUndoB).toHaveBeenCalledTimes(1);
    expect(onUndoA).not.toHaveBeenCalled();
  });

  it('dismiss programatico oculta sem chamar callback', () => {
    const onUndo = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <Host onUndo={onUndo} mensagem="X" />
    );
    fireEvent.press(getByLabelText('disparar'));
    expect(queryByLabelText('desfazer')).toBeTruthy();
    fireEvent.press(getByLabelText('dismiss-programatico'));
    expect(queryByLabelText('desfazer')).toBeNull();
    expect(onUndo).not.toHaveBeenCalled();
  });
});
