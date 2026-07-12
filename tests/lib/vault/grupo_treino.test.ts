// Testes dos helpers de Vault para Grupos de Treino (Q19.b). Espelha
// padrao de rotina.test.ts: filter por autor, sort PT-BR, path
// canonico H2 markdown/grupo-<slug>.md, exclusao idempotente.
//
// Comentarios sem acento (convencao shell/CI).
import type { GrupoTreino } from '@/lib/schemas/grupo_treino';

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
  cacheDirectory: 'cache://test/',
  StorageAccessFramework: {
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

import {
  listarGrupos,
  lerGrupo,
  escreverGrupo,
  removerGrupo,
} from '@/lib/vault/grupo_treino';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<GrupoTreino> = {}): GrupoTreino {
  return {
    tipo: 'grupo_treino',
    slug: 'treino-do-quaresma',
    nome: 'Treino do Quaresma',
    descricao: null,
    rotina_slugs: ['treino-a', 'treino-b'],
    data_criacao: '2026-05-13',
    autor: 'pessoa_a',
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarGrupos', () => {
  it('retorna [] para pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarGrupos(VAULT_ROOT, 'pessoa_a');
    expect(out).toEqual([]);
  });

  it('filtra apenas grupos do autor solicitado', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/grupo-a.md`,
      `${VAULT_ROOT}/markdown/grupo-b.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('grupo-a.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'a', nome: 'Cutting', autor: 'pessoa_a' }),
          body: '',
        });
      if (uri.endsWith('grupo-b.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'b', nome: 'Bulking', autor: 'pessoa_b' }),
          body: '',
        });
      return Promise.resolve(null);
    });
    const out = await listarGrupos(VAULT_ROOT, 'pessoa_a');
    expect(out).toHaveLength(1);
    expect(out[0].nome).toBe('Cutting');
  });

  it('ordena asc por nome com localeCompare PT-BR', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/grupo-c.md`,
      `${VAULT_ROOT}/markdown/grupo-a.md`,
      `${VAULT_ROOT}/markdown/grupo-b.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('grupo-a.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'a', nome: 'Ômega' }),
          body: '',
        });
      if (uri.endsWith('grupo-b.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'b', nome: 'Alfa' }),
          body: '',
        });
      if (uri.endsWith('grupo-c.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'c', nome: 'Beta' }),
          body: '',
        });
      return Promise.resolve(null);
    });
    const out = await listarGrupos(VAULT_ROOT, 'pessoa_a');
    expect(out.map((g) => g.nome)).toEqual(['Alfa', 'Beta', 'Ômega']);
  });

  it('ignora arquivos malformados sem propagar erro', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/grupo-ok.md`,
      `${VAULT_ROOT}/markdown/grupo-quebrado.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('quebrado.md')) {
        return Promise.reject(new Error('schema invalido'));
      }
      return Promise.resolve({ meta: fixture({ slug: 'ok' }), body: '' });
    });
    const out = await listarGrupos(VAULT_ROOT, 'pessoa_a');
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe('ok');
  });
});

describe('lerGrupo', () => {
  it('chama reader com URI canonico markdown/grupo-<slug>.md', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await lerGrupo(VAULT_ROOT, 'treino-do-quaresma');
    expect(mockReadVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/grupo-treino-do-quaresma.md`,
      expect.anything()
    );
  });

  it('retorna meta quando arquivo existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce({ meta: fixture(), body: '' });
    const out = await lerGrupo(VAULT_ROOT, 'treino-do-quaresma');
    expect(out).not.toBeNull();
    expect(out?.nome).toBe('Treino do Quaresma');
  });

  it('retorna null quando arquivo nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const out = await lerGrupo(VAULT_ROOT, 'inexistente');
    expect(out).toBeNull();
  });
});

describe('escreverGrupo', () => {
  it('valida schema antes de escrever (rejeita 0 rotinas)', async () => {
    const invalido = fixture({ rotina_slugs: [] });
    await expect(escreverGrupo(VAULT_ROOT, invalido)).rejects.toThrow(
      /grupo invalido/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('escreve com URI canonico e body opcional', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const out = await escreverGrupo(VAULT_ROOT, fixture(), 'corpo');
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/grupo-treino-do-quaresma.md`,
      expect.objectContaining({ slug: 'treino-do-quaresma' }),
      'corpo'
    );
    expect(out.rel).toBe('markdown/grupo-treino-do-quaresma.md');
  });
});

describe('removerGrupo', () => {
  it('chama SAF deleteAsync com URI canonico', async () => {
    mockDeleteAsync.mockResolvedValueOnce(undefined);
    await removerGrupo(VAULT_ROOT, 'treino-do-quaresma');
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/grupo-treino-do-quaresma.md`
    );
  });

  it('engole erro quando arquivo nao existe (idempotente)', async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error('not found'));
    await expect(
      removerGrupo(VAULT_ROOT, 'inexistente')
    ).resolves.toBeUndefined();
  });
});
