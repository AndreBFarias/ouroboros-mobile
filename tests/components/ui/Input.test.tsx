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
});
