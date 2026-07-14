// R-BRAND-2-ANIMACOES (2026-07-13): testes do OuroborosLoading (C2 sync
// + E2 inline). O mock oficial de react-native-reanimated (jest.setup.
// cjs) deixa useSharedValue como objeto plano, withTiming retorna
// toValue, withRepeat e' identidade, cancelAnimation e' NOOP e
// useAnimatedProps invoca o callback uma vez. Em Jest Platform.OS e'
// native (ios), entao o effect web faz early-return e o effect native
// arma (ou nao) o withRepeat conforme reduce-motion.
//
// Contrato central da sprint (reduce-motion): com useReduceMotion()=true
// NENHUM loop e' armado (withRepeat nao e' chamado) — o anel fica
// parado (fallback B1). Comentarios sem acento.
import { render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { OuroborosLoading } from '@/components/brand/OuroborosLoading';
import { colors } from '@/theme/tokens';

// Mock local do hook para controlar reduce-motion por teste. Default
// false (anima) — os testes de reduce ligam explicitamente.
const mockUseReduceMotion = jest.fn();
jest.mock('@/lib/hooks/useReduceMotion', () => ({
  useReduceMotion: () => mockUseReduceMotion(),
}));

describe('OuroborosLoading', () => {
  beforeEach(() => {
    mockUseReduceMotion.mockReset();
    mockUseReduceMotion.mockReturnValue(false);
  });

  it('renderiza a variante sync com tamanho default 44 e role progressbar', () => {
    const tree = render(<OuroborosLoading variant="sync" />);
    const root = tree.getByLabelText('carregando');
    expect(root).toBeTruthy();
    expect(root.props.accessibilityRole).toBe('progressbar');
    expect(root.props.style).toMatchObject({ width: 44, height: 44 });
  });

  it('variante inline usa tamanho default 18 (anel diminuto)', () => {
    const tree = render(<OuroborosLoading variant="inline" />);
    const root = tree.getByLabelText('carregando');
    expect(root.props.style).toMatchObject({ width: 18, height: 18 });
  });

  it('respeita a prop tamanho custom', () => {
    const tree = render(<OuroborosLoading variant="sync" tamanho={80} />);
    const root = tree.getByLabelText('carregando');
    expect(root.props.style).toMatchObject({ width: 80, height: 80 });
  });

  it('aceita accessibilityLabel custom', () => {
    const tree = render(
      <OuroborosLoading variant="inline" accessibilityLabel="carregando lista" />
    );
    expect(tree.getByLabelText('carregando lista')).toBeTruthy();
  });

  it('default do variant e sync', () => {
    const tree = render(<OuroborosLoading />);
    const root = tree.getByLabelText('carregando');
    expect(root.props.style).toMatchObject({ width: 44, height: 44 });
  });

  // Contrato reduce-motion: SEM reduce arma exatamente 1 loop de rotacao.
  it('sem reduce-motion arma 1 withRepeat (anel girando)', () => {
    mockUseReduceMotion.mockReturnValue(false);
    const repeatSpy = jest.spyOn(Reanimated, 'withRepeat');
    const tree = render(<OuroborosLoading variant="sync" />);
    expect(repeatSpy).toHaveBeenCalledTimes(1);
    tree.unmount();
    repeatSpy.mockRestore();
  });

  // Contrato reduce-motion (nucleo da sprint): COM reduce nenhum loop.
  it('com reduce-motion NAO arma withRepeat (loop cortado, anel parado)', () => {
    mockUseReduceMotion.mockReturnValue(true);
    const repeatSpy = jest.spyOn(Reanimated, 'withRepeat');
    const tree = render(<OuroborosLoading variant="sync" />);
    expect(repeatSpy).not.toHaveBeenCalled();
    tree.unmount();
    repeatSpy.mockRestore();
  });

  it('variante inline tambem corta o loop com reduce-motion', () => {
    mockUseReduceMotion.mockReturnValue(true);
    const repeatSpy = jest.spyOn(Reanimated, 'withRepeat');
    const tree = render(<OuroborosLoading variant="inline" />);
    expect(repeatSpy).not.toHaveBeenCalled();
    tree.unmount();
    repeatSpy.mockRestore();
  });

  // Cleanup: cancelAnimation no unmount (sem reduce, o loop foi armado).
  it('cancela a animacao no unmount (sem leak de worklet)', () => {
    mockUseReduceMotion.mockReturnValue(false);
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoading variant="sync" />);
    tree.unmount();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    cancelSpy.mockRestore();
  });

  // Em native (Jest default) emite rotation numerica; sem reduce a
  // shared value chega a 360 (mock: withRepeat(withTiming(360))=360).
  it('emite rotation numerica em native e chega a 360 sem reduce', () => {
    mockUseReduceMotion.mockReturnValue(false);
    const propsSpy = jest.spyOn(Reanimated, 'useAnimatedProps');
    render(<OuroborosLoading variant="sync" />);
    const cb = propsSpy.mock.calls[0][0] as () => { rotation: number };
    expect(cb().rotation).toBe(360);
    propsSpy.mockRestore();
  });

  // Com reduce a shared value fica em 0 (loop nao armado) -> rotacao 0.
  it('com reduce-motion a rotacao emitida e 0 (estatico)', () => {
    mockUseReduceMotion.mockReturnValue(true);
    const propsSpy = jest.spyOn(Reanimated, 'useAnimatedProps');
    render(<OuroborosLoading variant="sync" />);
    const cb = propsSpy.mock.calls[0][0] as () => { rotation: number };
    expect(cb().rotation).toBe(0);
    propsSpy.mockRestore();
  });

  // A cor custom da inline chega ao stroke do Circle (contexto red/green
  // das abas de midia). Procuramos o no com a prop stroke = cor passada.
  it('inline aplica a cor custom ao stroke do anel', () => {
    type No = { props: Record<string, unknown> };
    const tree = render(<OuroborosLoading variant="inline" cor={colors.red} />);
    const comStroke = tree.root.findAll(
      (n: No) => !!n.props && n.props.stroke === colors.red
    );
    expect(comStroke.length).toBeGreaterThan(0);
  });
});
