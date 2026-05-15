// V4.0.1 (INFRA-VAULT-MOCK-CONVERGENCIA, 2026-05-08): integracao
// seedDeterministico -> useVaultMock -> listarDiarios. Cobre o caminho
// novo onde seedDiarios popula o vault mock no path canonico
// markdown/diario-...md e o reader (com Platform.OS=web mockado) le
// via useVaultMock retornando entradas validas para o Recap.
//
// Comentarios sem acento (convencao shell/CI).

// Mock do gauntlet: forca GAUNTLET_ATIVO=true para que seedDiarios
// nao seja no-op em ambiente jest (default Platform.OS='ios').
jest.mock('@/lib/dev/gauntlet', () => {
  const actual =
    jest.requireActual<typeof import('@/lib/dev/gauntlet')>(
      '@/lib/dev/gauntlet'
    );
  return {
    __esModule: true,
    ...actual,
    GAUNTLET_ATIVO: true,
  };
});

// Mock de Platform.OS='web' + __DEV__=true para reader.ts/listVaultFolder
// pegarem o branch web/dev que delega ao useVaultMock.
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// Garante __DEV__ true (jest define como true por padrao mas reforcamos
// em escopo global).
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

import { seedDiarios, seedEventos } from '@/lib/dev/seedDeterministico';
import { useVault } from '@/lib/stores/vault';
import { useVaultMock } from '@/lib/dev/vaultMockStore';
import { useDiarioMock } from '@/lib/dev/diarioMock';
import { useEventosMock } from '@/lib/dev/eventosMock';
import { listarDiarios } from '@/lib/vault/diario';
import { listarEventos } from '@/lib/vault/eventos';

describe('seedDeterministico -> vault mock -> reader (V4.0.1)', () => {
  beforeEach(() => {
    useDiarioMock.getState().limpar();
    useEventosMock.getState().limpar();
    useVaultMock.getState().limpar();
    useVault.setState({ vaultRoot: 'web://mock-vault/Ouroboros' });
  });

  it('seedDiarios popula vault mock com .md em markdown/diario-...md', () => {
    seedDiarios(3);
    const uris = useVaultMock.getState().listar();
    // Espera 3 entradas, todas no prefixo markdown/diario-
    expect(uris.length).toBe(3);
    for (const u of uris) {
      expect(u).toContain('markdown/diario-');
      expect(u.endsWith('.md')).toBe(true);
    }
  });

  it('listarDiarios le entradas seedadas via reader web/dev', async () => {
    seedDiarios(3);
    const lidos = await listarDiarios('web://mock-vault/Ouroboros');
    expect(lidos.length).toBe(3);
    // Modos esperados do fixture: trigger, vitoria, reflexao.
    const modos = lidos.map((d) => d.modo).sort();
    expect(modos).toEqual(['reflexao', 'trigger', 'vitoria']);
  });

  it('seedEventos popula vault mock com .md em markdown/evento-...md', () => {
    seedEventos(7);
    const uris = useVaultMock.getState().listar();
    expect(uris.length).toBe(7);
    for (const u of uris) {
      expect(u).toContain('markdown/evento-');
    }
  });

  it('listarEventos le eventos seedados via reader web/dev', async () => {
    seedEventos(7);
    const lidos = await listarEventos('web://mock-vault/Ouroboros');
    expect(lidos.length).toBe(7);
    // Todos do fixture sao 'positivo'.
    expect(lidos.every((e) => e.modo === 'positivo')).toBe(true);
  });

  it('sem vaultRoot, seedDiarios so popula store de dominio (no-op vault)', () => {
    useVault.setState({ vaultRoot: null });
    seedDiarios(3);
    expect(useDiarioMock.getState().entradas.length).toBe(3);
    expect(useVaultMock.getState().listar()).toEqual([]);
  });
});
