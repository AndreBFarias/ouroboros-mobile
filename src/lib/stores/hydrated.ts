// Hook utilitario para reagir a hidratacao do zustand-persist. O
// middleware persist e assincrono (le SecureStore); decisões de
// gate baseadas no estado precisam esperar a hidratacao para evitar
// flicker entre default e estado real.
//
// Uso:
//   const hidratado = useHasHydrated(useOnboarding);
//   if (!hidratado) return <Splash />;
import { useEffect, useState } from 'react';

interface PersistApi {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
}

interface StoreWithPersist {
  persist: PersistApi;
}

export function useHasHydrated<T extends StoreWithPersist>(
  useStore: T
): boolean {
  const [hydrated, setHydrated] = useState<boolean>(
    useStore.persist.hasHydrated()
  );

  useEffect(() => {
    // Em caso de race: confere status ao montar e se inscreve no callback.
    const ja = useStore.persist.hasHydrated();
    if (ja) {
      setHydrated(true);
      return;
    }
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [useStore]);

  return hydrated;
}
