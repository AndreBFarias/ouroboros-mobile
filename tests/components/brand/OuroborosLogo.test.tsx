// Testes do OuroborosLogo (componente estatico). Cobre: snapshot do
// SVG completo, prop mostrarTexto controlando wordmark, prop tamanho
// custom influenciando View raiz. Mock de react-native-svg vem do
// jest.setup.cjs (RadialGradient e Ellipse adicionados em M25).
import { render } from '@testing-library/react-native';
import { OuroborosLogo } from '@/components/brand/OuroborosLogo';

describe('OuroborosLogo', () => {
  it('renderiza com label de acessibilidade e wordmark por default', () => {
    const tree = render(<OuroborosLogo />);
    // O label "logo ouroboros" vem da View raiz.
    expect(tree.getByLabelText('logo ouroboros')).toBeTruthy();
    // Snapshot serve de canon visual: qualquer mexida no SVG quebra
    // este teste e exige revisao explicita do render tree.
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('omite wordmark quando mostrarTexto=false', () => {
    const tree = render(<OuroborosLogo mostrarTexto={false} />);
    expect(tree.queryByText('OUROBOROS')).toBeNull();
    expect(tree.queryByText('PROTOCOLO')).toBeNull();
  });

  it('respeita prop tamanho na View raiz', () => {
    const tree = render(<OuroborosLogo tamanho={128} mostrarTexto={false} />);
    const root = tree.getByLabelText('logo ouroboros');
    // Style inline aplicado na View raiz; encontramos via flatten.
    expect(root.props.style).toMatchObject({ width: 128, height: 128 });
  });
});
