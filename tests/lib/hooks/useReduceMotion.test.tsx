// R-AUDIT-A11Y-MOVIMENTO (2026-07-13): testes do hook useReduceMotion.
//
// Cobre a semantica TRAVADA (spec §3.5, OR simples):
//   - sistema on  -> true
//   - toggle on   -> true
//   - ambos off   -> false
//   - listener reduceMotionChanged atualiza o valor em runtime
//   - cleanup remove o listener (sem leak)
//
// Nao ha mock global de AccessibilityInfo no jest.setup.cjs; o jest
// preset (react-native/jest/mocks) ja expoe isReduceMotionEnabled
// (Promise.resolve(false)) e addEventListener ({ remove }). Aqui
// espiamos esses metodos no proprio arquivo para controlar cada caso.
//
// Comentarios sem acento (convencao shell/CI).
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { useSettings } from '@/lib/stores/settings';

describe('useReduceMotion', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sistema on -> true (mesmo com toggle off)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(
      true
    );
    const { result } = renderHook(() => useReduceMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('toggle on -> true (mesmo com sistema off)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(
      false
    );
    act(() => {
      useSettings.getState().setFeatureToggle('reduzirMovimento', true);
    });
    const { result } = renderHook(() => useReduceMotion());
    expect(result.current).toBe(true);
  });

  it('ambos off -> false', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(
      false
    );
    const { result } = renderHook(() => useReduceMotion());
    // Aguarda a resolucao assincrona da leitura de sistema para
    // garantir que nada flipa o valor para true.
    await waitFor(() =>
      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled()
    );
    expect(result.current).toBe(false);
  });

  it('listener reduceMotionChanged atualiza o valor em runtime', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(
      false
    );
    // Guarda SEMPRE o callback do mount mais recente. Sob StrictMode
    // (double-mount em teste), o effect roda mount/cleanup/mount; o
    // primeiro callback fica inerte (ativo=false apos o cleanup) e so o
    // ultimo esta vivo. Capturar o ultimo evita testar um listener morto.
    let callback: ((v: boolean) => void) | undefined;
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((evento, cb) => {
        // Cast via string/unknown: addEventListener e' sobrecarregado e o
        // TS infere o handler de outra sobrecarga; aqui so importa
        // capturar o cb de reduceMotionChanged.
        if ((evento as string) === 'reduceMotionChanged') {
          callback = cb as unknown as (v: boolean) => void;
        }
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof AccessibilityInfo.addEventListener
        >;
      });
    const { result } = renderHook(() => useReduceMotion());

    await waitFor(() =>
      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled()
    );
    expect(result.current).toBe(false);
    expect(callback).toBeDefined();

    // Simula o sistema ligando/desligando a reducao com o app aberto.
    act(() => callback?.(true));
    expect(result.current).toBe(true);

    act(() => callback?.(false));
    expect(result.current).toBe(false);
  });

  it('OR simples: sistema on nao e desfeito pelo toggle off', async () => {
    // A decisao TRAVADA (§3.5): o toggle so ADICIONA reducao. Com o
    // toggle explicitamente false e o sistema true, o resultado e true.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(
      true
    );
    act(() => {
      useSettings.getState().setFeatureToggle('reduzirMovimento', false);
    });
    const { result } = renderHook(() => useReduceMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('remove o listener no cleanup (sem leak)', async () => {
    const remove = jest.fn();
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove } as unknown as ReturnType<
        typeof AccessibilityInfo.addEventListener
      >);
    const { unmount } = renderHook(() => useReduceMotion());
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
