// Testes do OuroborosLoader (componente animado). O mock oficial de
// react-native-reanimated (jest.setup.cjs) deixa useSharedValue como
// objeto plano, withTiming retorna toValue, withRepeat e identidade,
// cancelAnimation e NOOP. useAnimatedProps invoca o callback uma vez
// e retorna o resultado direto. createAnimatedComponent e identidade.
//
// Por isso podemos validar:
//   - render basico (modo cheio e modo compacto)
//   - valor final das 4 shared values apos mount (withTiming(toValue)
//     retorna toValue: gs1=360, gs2=-360, gs3=360, flow=490)
//   - cleanup chama cancelAnimation 4 vezes (1 por shared value)
//
// Trick: para inspecionar shared values internas, usamos um spy em
// cancelAnimation que captura os shared values passados no unmount.
// Sao os mesmos objetos que receberam withTiming na mount.
import { render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { OuroborosLoader } from '@/components/brand/OuroborosLoader';

describe('OuroborosLoader', () => {
  it('renderiza com label de progressbar em modo cheio', () => {
    const tree = render(<OuroborosLoader />);
    const root = tree.getByLabelText('loader ouroboros');
    expect(root).toBeTruthy();
    expect(root.props.style).toMatchObject({ width: 320, height: 320 });
  });

  it('em modo compacto fica 96px e omite wordmark', () => {
    const tree = render(<OuroborosLoader compacto />);
    const root = tree.getByLabelText('loader ouroboros');
    expect(root.props.style).toMatchObject({ width: 96, height: 96 });
    expect(tree.queryByText('OUROBOROS')).toBeNull();
    expect(tree.queryByText('PROTOCOLO')).toBeNull();
  });

  it('aplica rotacao 360 a gs1 (snake principal) apos mount', () => {
    // Spy captura os shared values passados a cancelAnimation no
    // unmount. Sao os mesmos objetos que receberam o withTiming na
    // mount, entao .value reflete o estado final do mock.
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoader />);
    tree.unmount();
    expect(cancelSpy).toHaveBeenCalledTimes(4);
    // Ordem do cleanup no codigo: g1, g2, g3, flow.
    const sv1 = cancelSpy.mock.calls[0][0] as { value: number };
    expect(sv1.value).toBe(360);
    cancelSpy.mockRestore();
  });

  it('aplica rotacao -360 a gs2 (orbit dotted reverso)', () => {
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoader />);
    tree.unmount();
    const sv2 = cancelSpy.mock.calls[1][0] as { value: number };
    expect(sv2.value).toBe(-360);
    cancelSpy.mockRestore();
  });

  it('aplica rotacao 360 a gs3 (inner flow ring)', () => {
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoader />);
    tree.unmount();
    const sv3 = cancelSpy.mock.calls[2][0] as { value: number };
    expect(sv3.value).toBe(360);
    cancelSpy.mockRestore();
  });

  it('aplica offset 490 (perimetro) a gs-flow (stroke-dashoffset)', () => {
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoader />);
    tree.unmount();
    const svFlow = cancelSpy.mock.calls[3][0] as { value: number };
    expect(svFlow.value).toBe(490);
    cancelSpy.mockRestore();
  });

  // M25.1 + A27 (2026-05-06): em web emite transform string ("rotate
  // (angle cx cy)") para sobreviver ao parser do rn-svg-web. Em
  // native (default do Jest), emite rotation numerica para evitar
  // crash "java.lang.String cannot be cast to ReadableArray" na New
  // Arch (Fabric espera array em transform de SVG, ou rotation prop
  // do react-native-svg). Pivot vem de originX/originY estaticos no
  // <AnimatedG>.
  it('emite rotation numerica para os 3 grupos em native (Jest default)', () => {
    const propsSpy = jest.spyOn(Reanimated, 'useAnimatedProps');
    render(<OuroborosLoader />);
    const cb1 = propsSpy.mock.calls[0][0] as () => { rotation: number };
    const cb2 = propsSpy.mock.calls[1][0] as () => { rotation: number };
    const cb3 = propsSpy.mock.calls[2][0] as () => { rotation: number };
    expect(cb1().rotation).toBe(360);
    expect(cb2().rotation).toBe(-360);
    expect(cb3().rotation).toBe(360);
    propsSpy.mockRestore();
  });

  // Caminho web (transform string para rn-svg-web) coberto por
  // E2E em tests/e2e/playwright/m25-1-* via Gauntlet — Jest aqui
  // nao consegue exercitar requestAnimationFrame + document
  // querySelector do useEffect web sem jsdom completo, e a logica
  // de ramificacao isWeb e simples o suficiente para auditoria
  // visual cobrir.
});
