// Store auxiliar do Gauntlet (web/dev only) para simular frases salvas
// via SheetFrase. Em mobile real, esta store nunca recebe entrada (o
// helper salvarFraseMock e no-op fora de GAUNTLET_ATIVO; salvarFrase em
// mobile grava direto no Vault). Em web/dev, e o destino canonico para
// E2E auditar "FAB+ verde > Frase > Salvar > toast verde" sem depender
// de FileSystem nativo.
//
// Saneamento de debito M-AUDIT-MIGUE-FRASE-WEB-MOCK (2026-05-08): antes
// desta sprint o ramo web do salvarFrase era no-op em qualquer ambiente
// e o E2E nao podia exercer o fluxo completo.
//
// V4.0.1 (INFRA-VAULT-MOCK-CONVERGENCIA, 2026-05-08): adicionar
// tambem espelha o companion no useVaultMock no path canonico
// <vaultRoot>/<arquivo>. Sem isto, listarVaultMock() retornava []
// apos salvarFraseMock e Recap web ficava vazio. Stores especificas
// continuam servindo render direto; vault mock serve reader/Recap.
//
// Comentarios sem acento (convencao shell/CI).
import { create } from 'zustand';
import type { Para } from '@/lib/schemas/para';
import { useVault } from '@/lib/stores/vault';
import { useVaultMock } from '@/lib/dev/vaultMockStore';
import { vaultUriJoin } from '@/lib/vault/paths';

export interface FraseMock {
  // Path relativo no vault mock (ex: markdown/frase-2026-05-08-tudo-bem.md).
  arquivo: string;
  // Texto integral salvo. Util para asserts E2E.
  texto: string;
  // Autor canonico (pessoa_a | pessoa_b).
  autor: 'pessoa_a' | 'pessoa_b';
  // Destinatario canonico (mim, casal, outra:pessoa_x).
  para: Para;
  // Conteudo serializado (.md companion completo). Permite asserts
  // sobre frontmatter/body sem reabrir o helper de stringify.
  companion: string;
  // ISO timestamp do save.
  data: string;
}

interface FrasesMockState {
  frases: FraseMock[];
  adicionar: (frase: FraseMock) => void;
  limpar: () => void;
}

export const useFrasesMock = create<FrasesMockState>((set) => ({
  frases: [],
  adicionar: (frase) => {
    set((s) => ({
      frases: [frase, ...s.frases],
    }));
    // V4.0.1: espelhar companion no vault mock no path canonico.
    // Se vaultRoot ainda nao foi setado (caller esqueceu seed), pula
    // silenciosamente. Em web/dev real, gauntlet.seed() seta vaultRoot
    // antes de qualquer save. frase.arquivo e relativo (ex:
    // 'markdown/frase-...md'); concat via vaultUriJoin.
    const vaultRoot = useVault.getState().vaultRoot;
    if (vaultRoot) {
      const uri = vaultUriJoin(vaultRoot, frase.arquivo);
      useVaultMock.getState().setArquivo(uri, frase.companion);
    }
  },
  limpar: () => set({ frases: [] }),
}));
