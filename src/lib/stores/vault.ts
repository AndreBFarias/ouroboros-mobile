// Store global do Vault. Mantem o URI raiz da pasta SAF concedida
// pelo usuario. Persistido via SecureStore (mesmo middleware que
// pessoa.ts). O URI e uma string opaca emitida pelo Android (formato
// 'content://com.android.externalstorage.documents/tree/...').
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';

interface VaultStore {
  vaultRoot: string | null;
  setVaultRoot: (uri: string) => void;
  clearVaultRoot: () => void;
}

export const useVault = create<VaultStore>()(
  persist(
    (set) => ({
      vaultRoot: null,
      setVaultRoot: (vaultRoot) => set({ vaultRoot }),
      clearVaultRoot: () => set({ vaultRoot: null }),
    }),
    {
      name: 'ouroboros.vault.v1',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
