// R-BRAND-2-ANIMACOES (2026-07-13): testes do OuroborosFechamento (C1).
// Verifica o CONTRATO de timing e o de reduce-motion:
//   - sem reduce-motion: arma 1 withTiming (fechamento one-shot) e
//     chama onConcluir apos ~duracaoMs (fake timers);
//   - com reduce-motion: NAO arma withTiming e chama onConcluir IMEDIATO
//     (sem atrasar o dismiss), estado final estatico;
//   - unmount antes do timer nao dispara onConcluir (cleanup limpa o
//     setTimeout).
//
// Mock reanimated: withTiming retorna toValue, useSharedValue objeto
// plano, useAnimatedProps/Style invocam callback uma vez, cancelAnimation
// NOOP. Comentarios sem acento.
import { render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { OuroborosFechamento } from '@/components/brand/OuroborosFechamento';

const mockUseReduceMotion = jest.fn();
jest.mock('@/lib/hooks/useReduceMotion', () => ({
  useReduceMotion: () => mockUseReduceMotion(),
}));

describe('OuroborosFechamento', () => {
  beforeEach(() => {
    mockUseReduceMotion.mockReset();
    mockUseReduceMotion.mockReturnValue(false);
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renderiza com o rotulo padrao e role image', () => {
    const tree = render(<OuroborosFechamento onConcluir={() => {}} />);
    const root = tree.getByLabelText('concluindo');
    expect(root).toBeTruthy();
    expect(root.props.accessibilityRole).toBe('image');
  });

  // Contrato de timing: sem reduce, onConcluir dispara apos duracaoMs.
  it('sem reduce-motion chama onConcluir apos duracaoMs', () => {
    jest.useFakeTimers();
    const onConcluir = jest.fn();
    render(<OuroborosFechamento onConcluir={onConcluir} duracaoMs={350} />);
    expect(onConcluir).not.toHaveBeenCalled();
    jest.advanceTimersByTime(349);
    expect(onConcluir).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onConcluir).toHaveBeenCalledTimes(1);
  });

  // Contrato de timing: sem reduce arma exatamente 1 withTiming.
  it('sem reduce-motion arma 1 withTiming (fechamento one-shot)', () => {
    const timingSpy = jest.spyOn(Reanimated, 'withTiming');
    render(<OuroborosFechamento onConcluir={() => {}} />);
    expect(timingSpy).toHaveBeenCalledTimes(1);
    timingSpy.mockRestore();
  });

  // Contrato reduce-motion (nucleo): NAO anima e navega IMEDIATO.
  it('com reduce-motion chama onConcluir imediato e NAO arma withTiming', () => {
    mockUseReduceMotion.mockReturnValue(true);
    const timingSpy = jest.spyOn(Reanimated, 'withTiming');
    const onConcluir = jest.fn();
    render(<OuroborosFechamento onConcluir={onConcluir} />);
    // Sem avancar timer nenhum: o effect ja chamou onConcluir.
    expect(onConcluir).toHaveBeenCalledTimes(1);
    expect(timingSpy).not.toHaveBeenCalled();
    timingSpy.mockRestore();
  });

  // Cleanup: desmontar antes do timer nao dispara a navegacao (evita
  // router.back() fantasma se a tela sair por outro caminho).
  it('unmount antes do timer nao chama onConcluir', () => {
    jest.useFakeTimers();
    const onConcluir = jest.fn();
    const tree = render(
      <OuroborosFechamento onConcluir={onConcluir} duracaoMs={350} />
    );
    tree.unmount();
    jest.advanceTimersByTime(1000);
    expect(onConcluir).not.toHaveBeenCalled();
  });

  it('respeita duracaoMs custom', () => {
    jest.useFakeTimers();
    const onConcluir = jest.fn();
    render(<OuroborosFechamento onConcluir={onConcluir} duracaoMs={120} />);
    jest.advanceTimersByTime(120);
    expect(onConcluir).toHaveBeenCalledTimes(1);
  });
});
