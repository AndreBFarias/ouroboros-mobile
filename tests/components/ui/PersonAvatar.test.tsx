import { fireEvent, render } from '@testing-library/react-native';
import { PersonAvatar } from '@/components/ui/PersonAvatar';

describe('PersonAvatar', () => {
  it('renderiza inicial e cor para pessoa_a', () => {
    const { getByLabelText, getByText } = render(
      <PersonAvatar pessoa="pessoa_a" />
    );
    expect(getByLabelText('avatar pessoa pessoa_a')).toBeTruthy();
    expect(getByText('A')).toBeTruthy();
  });

  it('renderiza inicial AB para ambos', () => {
    const { getByText } = render(<PersonAvatar pessoa="ambos" size="lg" />);
    expect(getByText('AB')).toBeTruthy();
  });

  it('dispara onPress quando interativo', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <PersonAvatar pessoa="pessoa_b" onPress={onPress} />
    );
    fireEvent.press(getByLabelText('avatar pessoa pessoa_b'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
