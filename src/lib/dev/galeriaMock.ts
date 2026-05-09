// Store auxiliar do Gauntlet (web/dev only) para simular fotos
// adicionadas manualmente. Em mobile real, esta store nunca recebe
// entrada (o helper adicionarFotoMock e no-op fora de
// GAUNTLET_ATIVO). Em web/dev, useFotosAgregadas mescla as entradas
// daqui ao resultado lido do Vault, permitindo o orquestrador
// validar a regra "FAB + > foto aparece na grid" sem depender de
// expo-image-picker (que nao funciona em RN-Web).
//
// V4.0.1 (INFRA-VAULT-MOCK-CONVERGENCIA, 2026-05-08): adicionar
// aceita companion opcional e, quando presente, espelha no
// useVaultMock no path canonico markdown/foto-...md. Sem isto,
// reader.ts/Recap web nao enxergavam fotos seedadas.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import { useVault } from '@/lib/stores/vault';
import { useVaultMock } from '@/lib/dev/vaultMockStore';
import { vaultUriJoin } from '@/lib/vault/paths';

export interface FotoMock {
  uri: string;
  data: string; // ISO YYYY-MM-DD
  origemPath: string;
  origemSlug: string;
  // V4.0.1: companion .md serializado (frontmatter completo). Quando
  // presente junto com companionRel, e replicado no useVaultMock no
  // path <vaultRoot>/<companionRel>. Opcional para retro-compat com
  // callsites antigos que so usam galeriaMock para render direto.
  companionRel?: string;
  companion?: string;
}

interface GaleriaMockState {
  fotos: FotoMock[];
  adicionar: (foto: FotoMock) => void;
  limpar: () => void;
}

export const useGaleriaMock = create<GaleriaMockState>((set) => ({
  fotos: [],
  adicionar: (foto) => {
    set((s) => ({
      fotos: [foto, ...s.fotos],
    }));
    // V4.0.1: espelhar companion no vault mock se fornecido.
    if (foto.companionRel && foto.companion) {
      const vaultRoot = useVault.getState().vaultRoot;
      if (vaultRoot) {
        const uri = vaultUriJoin(vaultRoot, foto.companionRel);
        useVaultMock.getState().setArquivo(uri, foto.companion);
      }
    }
  },
  limpar: () => set({ fotos: [] }),
}));
