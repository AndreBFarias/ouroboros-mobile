import { fireEvent, render } from '@testing-library/react-native';
import { Toggle } from '@/components/ui/Toggle';

describe('Toggle', () => {
  it('alterna ao pressionar', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <Toggle
        value={false}
        onChange={onChange}
        accessibilityLabel="modo silencioso"
      />
    );
    fireEvent.press(getByLabelText('modo silencioso'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('nao alterna quando disabled', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <Toggle
        value={false}
        onChange={onChange}
        disabled
        accessibilityLabel="bloqueado"
      />
    );
    fireEvent.press(getByLabelText('bloqueado'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
