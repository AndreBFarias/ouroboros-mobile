import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { FAB } from '@/components/ui';

describe('FAB', () => {
  it('renderiza com label default e dispara onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<FAB onPress={onPress} />);
    fireEvent.press(getByLabelText('acao rapida'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Pressable container tem zIndex + elevation (R-AGENDA-FAB-HITBOX)', () => {
    // O alvo de toque (o proprio Pressable), nao um filho, precisa da
    // elevation: no Android (Fabric) a ordem de hit-test entre irmaos
    // segue o elevation do container. Sem isto o ultimo card da lista
    // cobria o centro do FAB e roubava o toque (bug reproduzido no device).
    const { getByLabelText } = render(
      <FAB onPress={() => undefined} accessibilityLabel="novo evento" />
    );
    const estilo = StyleSheet.flatten(
      getByLabelText('novo evento').props.style
    ) as Record<string, unknown>;
    expect(estilo.elevation).toBe(10);
    expect(estilo.zIndex).toBe(10);
    expect(estilo.position).toBe('absolute');
  });

  it('aceita accessibilityLabel custom', () => {
    const { getByLabelText } = render(
      <FAB onPress={() => undefined} accessibilityLabel="adicionar item" />
    );
    expect(getByLabelText('adicionar item')).toBeTruthy();
  });

  it('disabled bloqueia onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<FAB onPress={onPress} disabled />);
    fireEvent.press(getByLabelText('acao rapida'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
