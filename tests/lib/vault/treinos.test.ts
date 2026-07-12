// Testes do modulo de vault para sessoes de treino. Cobre listagem
// (filtro autor, ordenacao desc, exclusao de drafts), escrita e
// exclusao soft.
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

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

import {
  listarTreinos,
  escreverTreino,
  excluirTreino,
} from '@/lib/vault/treinos';

const VAULT_ROOT = 'content://test/vault';

const sessaoBase: TreinoSessao = {
  tipo: 'treino_sessao',
  data: '2026-04-23T18:00:00-03:00',
  autor: 'pessoa_a',
  rotina: 'Rotina A',
  duracao_min: 30,
  exercicios: [{ nome: 'x', series: 1, reps: 1 }],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarTreinos', () => {
  it('exclui drafts da listagem', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/2026-04-23-rotina-a.md',
      'content://test/vault/treinos/draft/2026-04-23-x.md',
    ]);
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      if (uri.includes('/draft/')) return null; // nunca chega aqui pois e filtrado antes
      return { meta: sessaoBase, body: '' };
    });
    const lista = await listarTreinos(VAULT_ROOT);
    expect(lista).toHaveLength(1);
    expect(mockReadVaultFile).toHaveBeenCalledTimes(1);
  });

  it('filtra por autor quando filtro presente', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/2026-04-23-a.md',
      'content://test/vault/treinos/2026-04-22-b.md',
    ]);
    let count = 0;
    mockReadVaultFile.mockImplementation(async () => {
      count++;
      if (count === 1) return { meta: sessaoBase, body: '' };
      return {
        meta: { ...sessaoBase, autor: 'pessoa_b' as const },
        body: '',
      };
    });
    const lista = await listarTreinos(VAULT_ROOT, { autor: 'pessoa_a' });
    expect(lista).toHaveLength(1);
    expect(lista[0].autor).toBe('pessoa_a');
  });

  it('ordena desc por data', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/x.md',
      'content://test/vault/treinos/y.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      const data =
        i === 1 ? '2026-04-20T10:00:00-03:00' : '2026-04-25T10:00:00-03:00';
      return { meta: { ...sessaoBase, data }, body: '' };
    });
    const lista = await listarTreinos(VAULT_ROOT);
    expect(lista[0].data).toBe('2026-04-25T10:00:00-03:00');
    expect(lista[1].data).toBe('2026-04-20T10:00:00-03:00');
  });

  it('retorna [] quando pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const lista = await listarTreinos(VAULT_ROOT);
    expect(lista).toEqual([]);
  });

  // R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG: filtro canonico por rotina.
  it('filtra por rotina_slug e descarta legado sem o campo', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/2026-04-23-a.md',
      'content://test/vault/treinos/2026-04-22-b.md',
      'content://test/vault/treinos/2026-04-21-c.md',
    ]);
    let count = 0;
    mockReadVaultFile.mockImplementation(async () => {
      count++;
      if (count === 1)
        return {
          meta: { ...sessaoBase, rotina_slug: 'rotina-a' as const },
          body: '',
        };
      if (count === 2)
        return {
          meta: { ...sessaoBase, rotina_slug: 'rotina-b' as const },
          body: '',
        };
      // Terceira: sessao legada sem o campo (backward-compat). Filtro
      // por slug deve excluir.
      return { meta: sessaoBase, body: '' };
    });
    const lista = await listarTreinos(VAULT_ROOT, { rotina_slug: 'rotina-a' });
    expect(lista).toHaveLength(1);
    expect(lista[0].rotina_slug).toBe('rotina-a');
  });

  it('combina filtro autor e rotina_slug', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/2026-04-23-a.md',
      'content://test/vault/treinos/2026-04-22-b.md',
    ]);
    let count = 0;
    mockReadVaultFile.mockImplementation(async () => {
      count++;
      if (count === 1)
        return {
          meta: {
            ...sessaoBase,
            autor: 'pessoa_a' as const,
            rotina_slug: 'rotina-a' as const,
          },
          body: '',
        };
      return {
        meta: {
          ...sessaoBase,
          autor: 'pessoa_b' as const,
          rotina_slug: 'rotina-a' as const,
        },
        body: '',
      };
    });
    const lista = await listarTreinos(VAULT_ROOT, {
      autor: 'pessoa_a',
      rotina_slug: 'rotina-a',
    });
    expect(lista).toHaveLength(1);
    expect(lista[0].autor).toBe('pessoa_a');
    expect(lista[0].rotina_slug).toBe('rotina-a');
  });
});

describe('escreverTreino', () => {
  it('escreve no path canonico baseado em data + slug', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const out = await escreverTreino(VAULT_ROOT, 'rotina-a', sessaoBase);
    expect(out.rel).toBe('treinos/2026-04-23-rotina-a.md');
    expect(mockWriteVaultFile).toHaveBeenCalled();
  });

  it('rejeita meta invalido sem tocar I/O', async () => {
    await expect(
      escreverTreino(VAULT_ROOT, 'x', {
        ...sessaoBase,
        duracao_min: 999,
      })
    ).rejects.toThrow(/treino invalido/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });
});

describe('excluirTreino', () => {
  it('move arquivo para lixeira soft', async () => {
    mockReadAsString.mockResolvedValueOnce('---\ntipo: treino\n---\n');
    const out = await excluirTreino(VAULT_ROOT, 'treinos/2026-04-23-x.md');
    expect(out.lixeiraPath).toContain('lixeira/treinos/');
    expect(mockWriteAsString).toHaveBeenCalled();
    expect(mockDeleteAsync).toHaveBeenCalled();
  });
});
