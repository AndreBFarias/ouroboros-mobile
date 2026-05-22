// Testes dos helpers de Vault para rotinas de treino (Q11.a). Cobre
// listagem (com filter por autor + sort PT-BR), leitura, escrita
// (validacao + path canonico) e exclusao idempotente.
//
// Mocks: reader/writer/SAF para isolar I/O.
//
// Comentarios sem acento (convencao shell/CI).
import type { RotinaMeta } from '@/lib/schemas/rotina';

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
  listarRotinas,
  lerRotina,
  escreverRotina,
  removerRotina,
} from '@/lib/vault/rotina';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<RotinaMeta> = {}): RotinaMeta {
  return {
    tipo: 'rotina_treino',
    slug: 'treino-a',
    nome: 'Treino A',
    descricao: null,
    exercicios: [
      {
        nome: 'Agachamento',
        carga_kg: 40,
        series: 3,
        reps: '10',
        descanso_seg: 90,
        observacao: null,
      },
    ],
    data_criacao: '2026-05-12',
    autor: 'pessoa_a',
    // R-ROT-2: categoria adicionada ao schema. Fixture usa 'outro'
    // (default) para manter semantica de teste legacy.
    categoria: 'outro',
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarRotinas', () => {
  it('retorna [] para pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarRotinas(VAULT_ROOT, 'pessoa_a');
    expect(out).toEqual([]);
  });

  it('filtra apenas rotinas do autor solicitado (privacidade)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/rotina-a.md`,
      `${VAULT_ROOT}/markdown/rotina-b.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('rotina-a.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'a', nome: 'Treino A', autor: 'pessoa_a' }),
          body: '',
        });
      if (uri.endsWith('rotina-b.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'b', nome: 'Treino B', autor: 'pessoa_b' }),
          body: '',
        });
      return Promise.resolve(null);
    });
    const out = await listarRotinas(VAULT_ROOT, 'pessoa_a');
    expect(out).toHaveLength(1);
    expect(out[0].nome).toBe('Treino A');
  });

  it('ordena asc por nome com localeCompare PT-BR', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/rotina-c.md`,
      `${VAULT_ROOT}/markdown/rotina-a.md`,
      `${VAULT_ROOT}/markdown/rotina-b.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('rotina-a.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'a', nome: 'Costas + bíceps' }),
          body: '',
        });
      if (uri.endsWith('rotina-b.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'b', nome: 'Peito + tríceps' }),
          body: '',
        });
      if (uri.endsWith('rotina-c.md'))
        return Promise.resolve({
          meta: fixture({ slug: 'c', nome: 'Adutores' }),
          body: '',
        });
      return Promise.resolve(null);
    });
    const out = await listarRotinas(VAULT_ROOT, 'pessoa_a');
    expect(out.map((r) => r.nome)).toEqual([
      'Adutores',
      'Costas + bíceps',
      'Peito + tríceps',
    ]);
  });

  it('ignora arquivos malformados sem propagar erro', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/rotina-ok.md`,
      `${VAULT_ROOT}/markdown/rotina-quebrada.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('quebrada.md')) {
        return Promise.reject(new Error('schema invalido'));
      }
      return Promise.resolve({ meta: fixture({ slug: 'ok' }), body: '' });
    });
    const out = await listarRotinas(VAULT_ROOT, 'pessoa_a');
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe('ok');
  });

  it('nao mistura outras features que comecam com "rotina" no prefixo errado', async () => {
    // matchesFeaturePrefix garante que so arquivos rotina-<slug>.md
    // entram. Se um dia houver outro tipo com prefixo conflitante,
    // este teste fica como sentinel.
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/rotina-a.md`,
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: fixture({ slug: 'a' }),
      body: '',
    });
    const out = await listarRotinas(VAULT_ROOT, 'pessoa_a');
    expect(out).toHaveLength(1);
  });
});

describe('lerRotina', () => {
  it('chama reader com URI canonico markdown/rotina-<slug>.md', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    await lerRotina(VAULT_ROOT, 'treino-a');
    expect(mockReadVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/rotina-treino-a.md`,
      expect.anything()
    );
  });

  it('retorna meta quando existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce({ meta: fixture(), body: '' });
    const out = await lerRotina(VAULT_ROOT, 'treino-a');
    expect(out).not.toBeNull();
    expect(out?.nome).toBe('Treino A');
  });

  it('retorna null quando nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const out = await lerRotina(VAULT_ROOT, 'inexistente');
    expect(out).toBeNull();
  });
});

describe('escreverRotina', () => {
  it('grava em path canonico (H2 layout-por-tipo)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const meta = fixture();
    const { rel, uri } = await escreverRotina(VAULT_ROOT, meta);
    expect(rel).toBe('markdown/rotina-treino-a.md');
    expect(uri).toBe(`${VAULT_ROOT}/${rel}`);
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/${rel}`,
      expect.objectContaining({ nome: 'Treino A' }),
      ''
    );
  });

  it('rejeita meta invalido (sem exercicios)', async () => {
    const inv = fixture({ exercicios: [] });
    await expect(escreverRotina(VAULT_ROOT, inv)).rejects.toThrow(
      /rotina invalida/
    );
  });

  it('produz path final via vaultUriJoin (limpa trailing %20 do SAF)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const rootSujo = `${VAULT_ROOT}%20`;
    const meta = fixture();
    const { uri } = await escreverRotina(rootSujo, meta);
    expect(uri).toBe(`${VAULT_ROOT}/markdown/rotina-treino-a.md`);
  });
});

describe('removerRotina', () => {
  it('chama SAF.deleteAsync com URI correto', async () => {
    mockDeleteAsync.mockResolvedValueOnce(undefined);
    await removerRotina(VAULT_ROOT, 'treino-a');
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/rotina-treino-a.md`
    );
  });

  it('e idempotente quando arquivo nao existe', async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error('nao existe'));
    await expect(
      removerRotina(VAULT_ROOT, 'treino-a')
    ).resolves.toBeUndefined();
  });
});
