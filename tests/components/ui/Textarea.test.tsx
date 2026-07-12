import { fireEvent, render } from '@testing-library/react-native';
import { Textarea } from '@/components/ui/Textarea';

describe('Textarea', () => {
  it('renderiza placeholder', () => {
    const { getByPlaceholderText } = render(
      <Textarea value="" onChangeText={() => undefined} placeholder="diario" />
    );
    expect(getByPlaceholderText('diario')).toBeTruthy();
  });

  it('dispara onChangeText em texto longo', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Textarea value="" onChangeText={onChangeText} placeholder="diario" />
    );
    fireEvent.changeText(
      getByPlaceholderText('diario'),
      'duas linhas\ndo dia.'
    );
    expect(onChangeText).toHaveBeenCalledWith('duas linhas\ndo dia.');
  });
});
