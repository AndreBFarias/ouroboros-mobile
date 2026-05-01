// Testes da migracao de drafts da M13 para sessoes formais. Mocka
// listVaultFolder/readVaultFile/writeVaultFile e verifica:
//  - drafts validos viram treino_sessao
//  - draft invalido (schema errado) e ignorado
//  - sem vault root, retorna 0/0
//  - data e exercicios sao preservados
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

describe('migrarDraftsParaTreinoSessao', () => {
  it('retorna 0/0 quando vault nao concedido', async () => {
    useVault.setState({ vaultRoot: null });
    const out = await migrarDraftsParaTreinoSessao();
    expect(out).toEqual({ migrados: 0, ignorados: 0 });
    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });

  it('migra draft valido para treino_sessao formal', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/2026-04-23-rotina-a.md',
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
    expect(out.migrados).toBe(1);
    expect(out.ignorados).toBe(0);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('/treinos/2026-04-23-rotina-a.md');
    expect(typeof meta).toBe('object');
    const m = meta as { tipo: string; rotina: string; exercicios: unknown[] };
    expect(m.tipo).toBe('treino_sessao');
    expect(m.rotina).toBe('Treino livre');
    expect(m.exercicios).toHaveLength(2);
    expect(typeof body).toBe('string');
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
  });

  it('ignora draft com nome de arquivo fora do padrao YYYY-MM-DD', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/qualquer-coisa.md',
    ]);
    const out = await migrarDraftsParaTreinoSessao();
    expect(out.migrados).toBe(0);
    expect(out.ignorados).toBe(1);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('ignora draft com schema invalido', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/2026-04-23-x.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce(null);
    const out = await migrarDraftsParaTreinoSessao();
    expect(out.ignorados).toBe(1);
  });

  it('aceita root explicito como argumento', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    await migrarDraftsParaTreinoSessao('outro://vault');
    expect(mockListVaultFolder).toHaveBeenCalledWith(
      expect.stringContaining('outro://vault'),
      expect.any(String)
    );
  });
});
