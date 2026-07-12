import { fireEvent, render } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renderiza com placeholder', () => {
    const { getByPlaceholderText } = render(
      <Input value="" onChangeText={() => undefined} placeholder="anotacao" />
    );
    expect(getByPlaceholderText('anotacao')).toBeTruthy();
  });

  it('dispara onChangeText ao digitar', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input value="" onChangeText={onChangeText} placeholder="nome" />
    );
    fireEvent.changeText(getByPlaceholderText('nome'), 'pessoa_a');
    expect(onChangeText).toHaveBeenCalledWith('pessoa_a');
  });

  it('renderiza label quando fornecido', () => {
    const { getByText } = render(
      <Input
        value=""
        onChangeText={() => undefined}
        label="anotacao"
        placeholder="..."
      />
    );
    expect(getByText('anotacao')).toBeTruthy();
  });

  it('repassa autoCapitalize ao TextInput interno', () => {
    const { getByPlaceholderText } = render(
      <Input
        value=""
        onChangeText={() => undefined}
        placeholder="medicacao"
        autoCapitalize="sentences"
      />
    );
    expect(getByPlaceholderText('medicacao').props.autoCapitalize).toBe(
      'sentences'
    );
  });

  it('repassa keyboardType ao TextInput interno', () => {
    const { getByPlaceholderText } = render(
      <Input
        value=""
        onChangeText={() => undefined}
        placeholder="horas"
        keyboardType="numeric"
      />
    );
    expect(getByPlaceholderText('horas').props.keyboardType).toBe('numeric');
  });

  it('aplica defaults sentences/default quando props omitidas', () => {
    const { getByPlaceholderText } = render(
      <Input value="" onChangeText={() => undefined} placeholder="livre" />
    );
    const input = getByPlaceholderText('livre');
    expect(input.props.autoCapitalize).toBe('sentences');
    expect(input.props.keyboardType).toBe('default');
  });
});
