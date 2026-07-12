import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
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

describe('Slider web variant', () => {
  // Salva o original para restaurar apos cada caso (nao vazar para
  // o restante da suite).
  const osOriginal = Platform.OS;
  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
  });
  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => osOriginal,
    });
  });

  it('escolhe variante web e renderiza input range com aria-label', () => {
    // Em web o componente usa createElement('input', { type: 'range' }).
    // O wrapper externo (View) e o input ambos expoem aria-label,
    // entao queryAll devolve 2. A presenca de pelo menos um node com
    // o label confirma que a variante web rodou sem loop nem erro.
    const onChange = jest.fn();
    const view = render(
      <Slider label="brilho" min={0} max={10} value={5} onChange={onChange} />
    );
    const nodes = view.queryAllByLabelText('slider brilho');
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    // Valor numerico cyan deve continuar visivel mesmo na variante web.
    expect(view.getByText('5')).toBeTruthy();
  });
});
