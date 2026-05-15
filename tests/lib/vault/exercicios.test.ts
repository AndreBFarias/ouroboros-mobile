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

  // I-EXERCICIO: vaultUriJoin canonico (paths.ts:27) faz, em ordem:
  //  1. trim() externo,
  //  2. replace(/\s+$/, '') trailing whitespace,
  //  3. replace(/%20+$/, '') trailing %20 percent-encoded,
  //  4. replace(/\/+$/, '') trailing slashes.
  //
  // Para um root tipico SAF contaminado com trailing %20 (sintoma A29
  // em OEMs MIUI/OneUI/HyperOS), o path final do .md fica limpo.
  // Cobertura aqui garante que escreverExercicio realmente roteia pelo
  // helper canonico, e nao mais pelo joinUri local que existia antes
  // desta sprint.
  it('produz path final via vaultUriJoin (limpa trailing %20 do SAF)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const rootSujo = `${VAULT_ROOT}%20`;
    const { uri } = await escreverExercicio(rootSujo, exercicioPernas, '');
    expect(uri).toBe(`${VAULT_ROOT}/markdown/exercicio-agachamento-livre.md`);
    // Sem barras duplas no path final (so a do scheme content://).
    expect(uri.split('//').length).toBe(2);
  });

  it('produz path final via vaultUriJoin (limpa trailing slashes)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const rootSujo = `${VAULT_ROOT}//`;
    const { uri } = await escreverExercicio(rootSujo, exercicioPernas, '');
    expect(uri).toBe(`${VAULT_ROOT}/markdown/exercicio-agachamento-livre.md`);
  });

  // I-EXERCICIO: vaultUriJoin lanca erro claro quando root vazio
  // (sentinel de bug em estado anterior do app, ADR-0023).
  it('lanca erro quando vaultRoot vazio', async () => {
    await expect(escreverExercicio('', exercicioPernas, '')).rejects.toThrow(
      /vaultUriJoin: root vazio/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  // I-EXERCICIO: schema permite multiplas dicas em array. Garantir que
  // o writer preserva a lista intacta no payload entregue ao
  // writeVaultFile (sintoma do screenshot empirico: dica 'Costinha
  // Lisa' precisa chegar ao .md).
  it('preserva lista de dicas no meta gravado', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const dicas = [
      'Costinha lisa.',
      'Cotovelo proximo ao corpo.',
      'Inspire na descida.',
    ];
    const meta = {
      ...exercicioPernas,
      slug: 'triceps-rosca',
      nome: 'Tríceps rosca',
      grupo_muscular: ['triceps'],
      equipamento: 'tríceps rosca',
      dicas,
    };
    await escreverExercicio(VAULT_ROOT, meta, '');
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/exercicio-triceps-rosca.md`,
      expect.objectContaining({ dicas }),
      ''
    );
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
