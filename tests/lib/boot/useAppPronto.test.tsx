// M27.3: testes do hook agregador useAppPronto e do store leve
// useBootStatus. Cobre:
//   1. Default false ate todos hidratarem.
//   2. Latch true uma vez todas condicoes baterem.
//   3. Idempotencia de marcarPronto.
//   4. Latch nao volta a false mesmo que fontesProntas oscile.
//
// Comentarios sem acento.
import { act, renderHook } from '@testing-library/react-native';
import { useAppPronto } from '@/lib/boot/useAppPronto';
import { useBootStatus } from '@/lib/boot/useBootStatus';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';
import { useSessao } from '@/lib/stores/sessao';

// Helper: forca persist a marcar hidratado para o store dado.
// Em ambiente de teste o storage e in-memory (sem AsyncStorage real),
// o middleware persist hidrata sincronamente quando rehydrate e
// chamado, mas algumas suites podem comecar antes. Garantimos via
// setOptions(rehydrated=true) ou chamando rehydrate() direto.
function forcaHidratado(useStore: {
  persist: { rehydrate: () => Promise<void> | void; hasHydrated: () => boolean };
}): Promise<void> | void {
  if (useStore.persist.hasHydrated()) return;
  return useStore.persist.rehydrate();
}

describe('useBootStatus', () => {
  beforeEach(() => {
    useBootStatus.getState().__resetParaTeste();
  });

  it('comeca com pronto=false', () => {
    expect(useBootStatus.getState().pronto).toBe(false);
  });

  it('marcarPronto vira pronto=true', () => {
    act(() => {
      useBootStatus.getState().marcarPronto();
    });
    expect(useBootStatus.getState().pronto).toBe(true);
  });

  it('marcarPronto e idempotente -- chamadas extras nao mudam estado', () => {
    act(() => {
      useBootStatus.getState().marcarPronto();
    });
    expect(useBootStatus.getState().pronto).toBe(true);
    // Segunda chamada nao deve alterar nada nem lancar.
    act(() => {
      useBootStatus.getState().marcarPronto();
    });
    expect(useBootStatus.getState().pronto).toBe(true);
  });
});

describe('useAppPronto', () => {
  beforeEach(async () => {
    useBootStatus.getState().__resetParaTeste();
    // Garante que as 3 stores criticas estao hidratadas no comeco
    // de cada teste -- jest carrega o modulo uma vez e o middleware
    // persist hidrata no mount; explicitamos para nao depender de
    // ordem de import.
    await Promise.resolve(forcaHidratado(useOnboarding));
    await Promise.resolve(forcaHidratado(useVault));
    await Promise.resolve(forcaHidratado(useSessao));
  });

  it('com fontes nao prontas, retorna false mesmo com stores hidratadas', () => {
    const { result } = renderHook(() =>
      useAppPronto({ fontesProntas: false })
    );
    expect(result.current).toBe(false);
  });

  it('com fontes prontas e stores hidratadas, retorna true', async () => {
    const { result, rerender } = renderHook(
      ({ fontes }: { fontes: boolean }) =>
        useAppPronto({ fontesProntas: fontes }),
      { initialProps: { fontes: false } }
    );

    expect(result.current).toBe(false);

    // Simula useFonts resolvendo. Re-render com fontes=true dispara
    // o useEffect que chama marcarPronto.
    await act(async () => {
      rerender({ fontes: true });
    });

    expect(result.current).toBe(true);
  });

  it('latch nao volta para false se fontes oscilarem', async () => {
    const { result, rerender } = renderHook(
      ({ fontes }: { fontes: boolean }) =>
        useAppPronto({ fontesProntas: fontes }),
      { initialProps: { fontes: false } }
    );

    // Sobe para true.
    await act(async () => {
      rerender({ fontes: true });
    });
    expect(result.current).toBe(true);

    // Simula useFonts SDK 54 web oscilando de volta para false.
    // Latch global garante que useAppPronto continua true.
    await act(async () => {
      rerender({ fontes: false });
    });
    expect(result.current).toBe(true);

    // E volta a true depois -- continua true.
    await act(async () => {
      rerender({ fontes: true });
    });
    expect(result.current).toBe(true);
  });

  it('marca o store global para que outros consumidores leiam true', async () => {
    const { rerender } = renderHook(
      ({ fontes }: { fontes: boolean }) =>
        useAppPronto({ fontesProntas: fontes }),
      { initialProps: { fontes: false } }
    );
    expect(useBootStatus.getState().pronto).toBe(false);
    await act(async () => {
      rerender({ fontes: true });
    });
    expect(useBootStatus.getState().pronto).toBe(true);
  });
});
