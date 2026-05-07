// Testes de listarExercicios, lerExercicio, escreverExercicio e
// excluirExercicio. Mocka readVaultFile, writeVaultFile e
// listVaultFolder de '@/lib/vault' para isolar logica pura.
import type { Exercicio } from '@/lib/schemas/exercicio';

const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockListVaultFolder = jest.fn();

// Mocka os sub-modulos onde vault/exercicios.ts importa diretamente
// (nao o barrel) para evitar ciclo de carregamento.
jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
}));

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

const mockMakeDirectoryAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn();
const mockSafReadAsStringAsync = jest.fn();
const mockSafDeleteAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: 'cache://test/',
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
  StorageAccessFramework: {
    readAsStringAsync: (...args: unknown[]) =>
      mockSafReadAsStringAsync(...args),
    deleteAsync: (...args: unknown[]) => mockSafDeleteAsync(...args),
  },
}));

import {
  listarExercicios,
  lerExercicio,
  escreverExercicio,
  excluirExercicio,
} from '@/lib/vault/exercicios';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const exercicioPernas: Exercicio = {
  tipo: 'exercicio',
  slug: 'agachamento-livre',
  nome: 'Agachamento livre',
  grupo_muscular: ['pernas', 'core'],
  nivel: 'intermediario',
  equipamento: 'barra',
  instrucao: 'desca ate paralela e suba.',
  dicas: [],
  gif: '',
  historico: [],
};

const exercicioPeito: Exercicio = {
  tipo: 'exercicio',
  slug: 'flexao-cruzada',
  nome: 'Flexão cruzada',
  grupo_muscular: ['peito', 'triceps'],
  nivel: 'iniciante',
  equipamento: 'peso corporal',
  instrucao: 'apoie e flexione.',
  dicas: [],
  gif: '',
  historico: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMakeDirectoryAsync.mockResolvedValue(undefined);
  mockWriteAsStringAsync.mockResolvedValue(undefined);
  mockSafReadAsStringAsync.mockResolvedValue('---\nslug: x\n---\n');
  mockSafDeleteAsync.mockResolvedValue(undefined);
});

describe('lerExercicio', () => {
  it('devolve meta quando arquivo existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: exercicioPernas,
      body: '',
    });
    const out = await lerExercicio(VAULT_ROOT, 'agachamento-livre');
    expect(out?.slug).toBe('agachamento-livre');
    expect(mockReadVaultFile).toHaveBeenCalledWith(
      expect.stringContaining('markdown/exercicio-agachamento-livre.md'),
      expect.anything()
    );
  });

  it('devolve null quando arquivo ausente', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const out = await lerExercicio(VAULT_ROOT, 'nao-existe');
    expect(out).toBeNull();
  });
});

describe('listarExercicios', () => {
  it('lista todos os exercicios sem filtros, ordenados por nome', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/exercicio-flexao-cruzada.md`,
      `${VAULT_ROOT}/markdown/exercicio-agachamento-livre.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({ meta: exercicioPeito, body: '' })
      .mockResolvedValueOnce({ meta: exercicioPernas, body: '' });

    const out = await listarExercicios(VAULT_ROOT);
    expect(out).toHaveLength(2);
    // Ordenado por nome (accent-insensitive). Agachamento vem antes
    // de Flexao.
    expect(out[0].slug).toBe('agachamento-livre');
    expect(out[1].slug).toBe('flexao-cruzada');
  });

  it('filtra por grupo muscular', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/exercicio-flexao-cruzada.md`,
      `${VAULT_ROOT}/markdown/exercicio-agachamento-livre.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({ meta: exercicioPeito, body: '' })
      .mockResolvedValueOnce({ meta: exercicioPernas, body: '' });

    const out = await listarExercicios(VAULT_ROOT, { grupo: 'peito' });
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe('flexao-cruzada');
  });

  it('filtra por search case e accent insensitive', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/exercicio-flexao-cruzada.md`,
      `${VAULT_ROOT}/markdown/exercicio-agachamento-livre.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({ meta: exercicioPeito, body: '' })
      .mockResolvedValueOnce({ meta: exercicioPernas, body: '' });

    const out = await listarExercicios(VAULT_ROOT, { search: 'flexao' });
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe('flexao-cruzada');
  });

  it('combina filtros grupo e search', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/exercicio-flexao-cruzada.md`,
      `${VAULT_ROOT}/markdown/exercicio-agachamento-livre.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({ meta: exercicioPeito, body: '' })
      .mockResolvedValueOnce({ meta: exercicioPernas, body: '' });

    const out = await listarExercicios(VAULT_ROOT, {
      grupo: 'pernas',
      search: 'flexao',
    });
    expect(out).toHaveLength(0);
  });

  it('ignora arquivos com schema invalido', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/exercicio-quebrado.md`,
      `${VAULT_ROOT}/markdown/exercicio-agachamento-livre.md`,
    ]);
    mockReadVaultFile
      .mockRejectedValueOnce(new Error('schema invalido'))
      .mockResolvedValueOnce({ meta: exercicioPernas, body: '' });

    const out = await listarExercicios(VAULT_ROOT);
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe('agachamento-livre');
  });

  it('devolve [] quando pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarExercicios(VAULT_ROOT);
    expect(out).toEqual([]);
  });
});

describe('escreverExercicio', () => {
  it('grava no path canonico do slug', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const { uri } = await escreverExercicio(VAULT_ROOT, exercicioPernas, '');
    expect(uri).toContain('markdown/exercicio-agachamento-livre.md');
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('rejeita meta invalido', async () => {
    await expect(
      escreverExercicio(VAULT_ROOT, {
        ...exercicioPernas,
        slug: 'Agachamento Maiusculo',
      })
    ).rejects.toThrow(/exercicio invalido/);
  });
});

describe('excluirExercicio', () => {
  it('move para lixeira em cache directory', async () => {
    const out = await excluirExercicio(VAULT_ROOT, 'agachamento-livre');
    expect(out.lixeiraPath).toContain('lixeira/exercicios/');
    expect(out.lixeiraPath).toContain('agachamento-livre.md');
    expect(mockMakeDirectoryAsync).toHaveBeenCalledTimes(1);
    expect(mockSafReadAsStringAsync).toHaveBeenCalledTimes(1);
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    expect(mockSafDeleteAsync).toHaveBeenCalledTimes(1);
  });

  it('propaga erro com mensagem clara quando SAF falha', async () => {
    mockSafReadAsStringAsync.mockRejectedValueOnce(
      new Error('saf indisponivel')
    );
    await expect(
      excluirExercicio(VAULT_ROOT, 'agachamento-livre')
    ).rejects.toThrow(/falha ao mover para lixeira/);
  });
});
