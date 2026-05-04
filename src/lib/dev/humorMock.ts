// Store auxiliar do Gauntlet (web/dev only) para simular registros
// de humor in-memory. Em mobile real, esta store nunca recebe entrada
// (os helpers de seedDeterministico sao guardados por GAUNTLET_ATIVO).
// Em web/dev, useHumorHeatmap mescla as celulas daqui com o cache lido
// do Vault, permitindo o orquestrador validar o heatmap colorido sem
// pipeline backend.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import type { HumorHeatmapCell } from '@/lib/schemas/humor_heatmap_cache';

export interface HumorMockState {
  celulas: HumorHeatmapCell[];
  // Substitui completamente as celulas (idempotente).
  definir: (celulas: HumorHeatmapCell[]) => void;
  // Limpa tudo. Usado por gauntlet.reset().
  limpar: () => void;
}

export const useHumorMock = create<HumorMockState>((set) => ({
  celulas: [],
  definir: (celulas) => set({ celulas: [...celulas] }),
  limpar: () => set({ celulas: [] }),
}));
