// Testes do modulo de vault para marcos. Cobre listagem (filtro
// autor, ordenacao), escrita e exclusao soft.
import type { Marco } from '@/lib/schemas/marco';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockReadAsString = jest.fn();
const mockDeleteAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();
const mockWriteAsString = jest.fn();

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
  cacheDirectory: 'cache://test/',
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsString(...args),
  StorageAccessFramework: {
    readAsStringAsync: (...args: unknown[]) => mockReadAsString(...args),
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

import { listarMarcos, escreverMarco, excluirMarco } from '@/lib/vault/marcos';

const VAULT_ROOT = 'content://test/vault';

const marcoBase: Marco = {
  tipo: 'marco',
  data: '2026-04-23T20:15:00-03:00',
  autor: 'pessoa_a',
  descricao: 'Algo importante.',
  tags: [],
  auto: false,
  para: { tipo: 'mim' },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarMarcos', () => {
  it('lista marcos do vault', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/marco-2026-04-23-x.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({ meta: marcoBase, body: '' });
    const lista = await listarMarcos(VAULT_ROOT);
    expect(lista).toHaveLength(1);
    expect(lista[0].descricao).toBe('Algo importante.');
  });

  it('filtra por autor', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/marco-x.md',
      'content://test/vault/markdown/marco-y.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      return {
        meta:
          i === 1 ? marcoBase : { ...marcoBase, autor: 'pessoa_b' as const },
        body: '',
      };
    });
    const lista = await listarMarcos(VAULT_ROOT, { autor: 'pessoa_a' });
    expect(lista).toHaveLength(1);
    expect(lista[0].autor).toBe('pessoa_a');
  });

  it('ordena desc por data', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/marco-a.md',
      'content://test/vault/markdown/marco-b.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      const data =
        i === 1 ? '2026-04-20T10:00:00-03:00' : '2026-04-25T10:00:00-03:00';
      return { meta: { ...marcoBase, data }, body: '' };
    });
    const lista = await listarMarcos(VAULT_ROOT);
    expect(lista[0].data).toBe('2026-04-25T10:00:00-03:00');
  });
});

describe('escreverMarco', () => {
  it('escreve no path canonico', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const out = await escreverMarco(VAULT_ROOT, 'algo', marcoBase);
    expect(out.rel).toBe('markdown/marco-2026-04-23-algo.md');
  });

  it('rejeita descricao vazia', async () => {
    await expect(
      escreverMarco(VAULT_ROOT, 'x', { ...marcoBase, descricao: '' })
    ).rejects.toThrow(/marco invalido/);
  });
});

describe('excluirMarco', () => {
  it('move para lixeira soft', async () => {
    mockReadAsString.mockResolvedValueOnce('---\n---\n');
    const out = await excluirMarco(VAULT_ROOT, 'marcos/2026-04-23-x.md');
    expect(out.lixeiraPath).toContain('lixeira/marcos/');
  });
});
