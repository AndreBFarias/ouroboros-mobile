import { render } from '@testing-library/react-native';
import { Slider } from '@/components/ui/Slider';

describe('Slider', () => {
  it('renderiza com value default e expoe accessibilityValue', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <Slider
        label="intensidade"
        min={1}
        max={5}
        step={1}
        value={3}
        onChange={onChange}
      />
    );
    const node = getByLabelText('slider intensidade');
    expect(node).toBeTruthy();
    expect(node.props.accessibilityValue).toEqual({ min: 1, max: 5, now: 3 });
  });

  it('aceita label custom via accessibilityLabel', () => {
    const { getByLabelText } = render(
      <Slider
        min={0}
        max={10}
        value={5}
        onChange={() => undefined}
        accessibilityLabel="volume"
      />
    );
    expect(getByLabelText('volume')).toBeTruthy();
  });

  it('renderiza valor numerico em texto', () => {
    const { getByText } = render(
      <Slider
        label="nivel"
        min={1}
        max={5}
        value={4}
        onChange={() => undefined}
      />
    );
    expect(getByText('4')).toBeTruthy();
  });
});
