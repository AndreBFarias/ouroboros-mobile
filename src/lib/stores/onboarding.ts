// Store de onboarding. Marca conclusao do fluxo de 4 frames e
// guarda escolhas informativas (tipo de companhia, metodo de sync).
// Persiste em SecureStore via secureStorage adapter.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';

export type TipoCompanhia = 'sozinho' | 'casal' | 'amigos';
export type SyncMethod = 'syncthing' | 'obsidian_sync' | 'nenhum';

interface OnboardingStore {
  done: boolean;
  tipoCompanhia: TipoCompanhia;
  syncMethod: SyncMethod;
  setTipoCompanhia: (t: TipoCompanhia) => void;
  setSync: (s: SyncMethod) => void;
  marcarConcluido: () => void;
  resetar: () => void;
}

export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      done: false,
      tipoCompanhia: 'sozinho',
      syncMethod: 'nenhum',
      setTipoCompanhia: (tipoCompanhia) => set({ tipoCompanhia }),
      setSync: (syncMethod) => set({ syncMethod }),
      marcarConcluido: () => set({ done: true }),
      resetar: () =>
        set({ done: false, tipoCompanhia: 'sozinho', syncMethod: 'nenhum' }),
    }),
    {
      name: 'ouroboros.onboarding.v1',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
