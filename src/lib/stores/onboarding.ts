// Store de onboarding. Marca conclusao do fluxo de 3 frames (M23) e
// guarda escolha informativa de tipo de companhia (ainda usado para
// esconder toggle pessoa quando sozinho na Tela 01 e no FAB).
//
// Persiste em SecureStore via secureStorage adapter. Bump de chave
// para v2 em M23: usuarios v1 perdem o flag done (refazem onboarding
// na refundacao da v1.0). syncMethod removido por completo - a
// configuracao de sync vive em useSettings.sync.metodo (M15).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';

export type TipoCompanhia = 'sozinho' | 'casal' | 'amigos';

interface OnboardingStore {
  done: boolean;
  tipoCompanhia: TipoCompanhia;
  setTipoCompanhia: (t: TipoCompanhia) => void;
  marcarConcluido: () => void;
  resetar: () => void;
}

export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      done: false,
      tipoCompanhia: 'sozinho',
      setTipoCompanhia: (tipoCompanhia) => set({ tipoCompanhia }),
      marcarConcluido: () => set({ done: true }),
      resetar: () =>
        set({ done: false, tipoCompanhia: 'sozinho' }),
    }),
    {
      name: 'ouroboros.onboarding.v2',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
