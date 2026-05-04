// Store auxiliar do Gauntlet (web/dev only) para simular fotos
// adicionadas manualmente. Em mobile real, esta store nunca recebe
// entrada (o helper adicionarFotoMock e no-op fora de
// GAUNTLET_ATIVO). Em web/dev, useFotosAgregadas mescla as entradas
// daqui ao resultado lido do Vault, permitindo o orquestrador
// validar a regra "FAB + > foto aparece na grid" sem depender de
// expo-image-picker (que nao funciona em RN-Web).
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';

export interface FotoMock {
  uri: string;
  data: string; // ISO YYYY-MM-DD
  origemPath: string;
  origemSlug: string;
}

interface GaleriaMockState {
  fotos: FotoMock[];
  adicionar: (foto: FotoMock) => void;
  limpar: () => void;
}

export const useGaleriaMock = create<GaleriaMockState>((set) => ({
  fotos: [],
  adicionar: (foto) =>
    set((s) => ({
      fotos: [foto, ...s.fotos],
    })),
  limpar: () => set({ fotos: [] }),
}));
