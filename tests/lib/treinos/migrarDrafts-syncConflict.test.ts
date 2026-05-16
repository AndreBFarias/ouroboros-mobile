// Teste de regressao do filtro sync-conflict em
// migrarDraftsParaTreinoSessao (sprint AUDIT-T1B7-DRAFT-EXPORT-FIX,
// 2026-05-15).
//
// Cenario critico: usuario com Syncthing pareado teve um conflito em
// um draft de treino livre (treinos/draft/<data>-<slug>.sync-conflict-
// <YYYYMMDD>-<HHMMSS>-<dispid>.md). Sem o filtro, o boot hook M11
// migraria essa copia para uma TreinoSessao espelho em treinos/, alem
// de potencialmente duplicar a sessao original.
//
// Filtro defensivo: a copia .sync-conflict-* nao e lida nem migrada.
// O arquivo permanece em treinos/draft/ para reconciliacao manual via
// Obsidian/Syncthing; o app nao toca.
//
// Comentarios sem acento (convencao shell/CI).
const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

import { migrarDraftsParaTreinoSessao } from '@/lib/treinos/migrarDraftsParaTreinoSessao';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockListVaultFolder.mockResolvedValue([]);
  mockWriteVaultFile.mockResolvedValue(undefined);
  mockDeleteAsync.mockResolvedValue(undefined);
  useVault.setState({ vaultRoot: VAULT_ROOT });
});

describe('migrarDraftsParaTreinoSessao — filtro sync-conflict (T1B7)', () => {
  it('nao le nem migra copia .sync-conflict-... de draft em treinos/draft/', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/2026-04-23-rotina-a.md',
      'content://test/vault/treinos/draft/2026-04-23-rotina-a.sync-conflict-20260506-093412-OURO1.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: {
        tipo: 'treino_draft',
        data: '2026-04-23',
        autor: 'pessoa_a',
        exercicios: ['supino', 'remada'],
      },
      body: 'rascunho.',
    });

    const out = await migrarDraftsParaTreinoSessao();

    // O draft legitimo migrou.
    expect(out.migrados).toBe(1);
    expect(out.ignorados).toBe(0);

    // Apenas o draft legitimo foi lido. A copia sync-conflict
    // nao recebeu tentativa de leitura.
    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos).toContain(
      'content://test/vault/treinos/draft/2026-04-23-rotina-a.md'
    );
    expect(urisLidos.some((u) => u.includes('sync-conflict'))).toBe(false);

    // writeVaultFile foi chamado uma unica vez (apenas o legitimo).
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const writeUris = mockWriteVaultFile.mock.calls.map((c) => c[0] as string);
    expect(writeUris.some((u) => u.includes('sync-conflict'))).toBe(false);

    // deleteAsync nao foi chamado em arquivo sync-conflict.
    const deleteUris = mockDeleteAsync.mock.calls.map((c) => c[0] as string);
    expect(deleteUris.some((u) => u.includes('sync-conflict'))).toBe(false);
  });

  it('case-insensitive: descarta variantes .SYNC-CONFLICT- e .Sync-Conflict-', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/2026-04-23-rotina-a.SYNC-CONFLICT-20260506-093412-OURO1.md',
      'content://test/vault/treinos/draft/2026-04-23-rotina-b.Sync-Conflict-20260506-093412-OURO2.md',
    ]);

    const out = await migrarDraftsParaTreinoSessao();

    // Nenhum draft legitimo, nada para migrar.
    expect(out.migrados).toBe(0);
    expect(out.ignorados).toBe(0);

    // Nenhuma tentativa de leitura nas copias sync-conflict.
    expect(mockReadVaultFile).not.toHaveBeenCalled();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('draft legitimo sozinho continua sendo migrado normalmente', async () => {
    // Garante que o filtro nao afeta o caminho feliz.
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/2026-04-23-rotina-a.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: {
        tipo: 'treino_draft',
        data: '2026-04-23',
        autor: 'pessoa_a',
        exercicios: ['agachamento'],
      },
      body: 'rascunho.',
    });

    const out = await migrarDraftsParaTreinoSessao();
    expect(out.migrados).toBe(1);
    expect(out.ignorados).toBe(0);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });
});
