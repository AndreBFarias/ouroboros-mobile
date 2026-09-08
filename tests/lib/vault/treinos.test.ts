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
  listarTreinosComRel,
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
  it('escreve no path canonico baseado em data + hora + slug', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const out = await escreverTreino(VAULT_ROOT, 'rotina-a', sessaoBase);
    expect(out.rel).toBe('treinos/2026-04-23-1800-rotina-a.md');
    expect(mockWriteVaultFile).toHaveBeenCalled();
  });

  // EXE-1 AC-2: a identidade da sessao passa a incluir a hora. Antes
  // desta sprint as duas escritas abaixo resolviam para o mesmo arquivo
  // e a segunda truncava a primeira, sem erro nenhum.
  it('duas sessoes da mesma rotina no mesmo dia produzem rel distintos', async () => {
    mockWriteVaultFile.mockResolvedValue(undefined);
    const manha = await escreverTreino(VAULT_ROOT, 'rotina-a', {
      ...sessaoBase,
      data: '2026-04-23T07:12:00-03:00',
    });
    const noite = await escreverTreino(VAULT_ROOT, 'rotina-a', {
      ...sessaoBase,
      data: '2026-04-23T19:40:00-03:00',
    });
    expect(manha.rel).toBe('treinos/2026-04-23-0712-rotina-a.md');
    expect(noite.rel).toBe('treinos/2026-04-23-1940-rotina-a.md');
    expect(manha.rel).not.toBe(noite.rel);
    expect(manha.uri).not.toBe(noite.uri);
  });

  // EXE-1: relOverride escreve exatamente onde o arquivo esta, sem
  // derivar nada do conteudo. E' o caminho da edicao.
  it('relOverride manda no path, inclusive em formato legado', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const out = await escreverTreino(
      VAULT_ROOT,
      'rotina-a',
      { ...sessaoBase, rotina: 'Rotina renomeada' },
      '',
      { relOverride: 'treinos/2026-04-23-rotina-a.md' }
    );
    expect(out.rel).toBe('treinos/2026-04-23-rotina-a.md');
    expect(out.uri).toBe(
      'content://test/vault/treinos/2026-04-23-rotina-a.md'
    );
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

// ---------------------------------------------------------------------
// EXE-1 (AC-2, AC-3, AC-7): circuito fechado escrita -> listagem.
// Os testes acima mockam a listagem com URIs literais; estes montam um
// vault em memoria alimentado pelo PROPRIO escreverTreino, para que a
// contagem de listarTreinos seja consequencia do que foi escrito, e nao
// de uma lista escrita a mao no teste.
// ---------------------------------------------------------------------
describe('escrita -> listagem (vault em memoria)', () => {
  // uri -> meta gravado.
  let disco: Map<string, TreinoSessao>;

  beforeEach(() => {
    disco = new Map();
    mockWriteVaultFile.mockImplementation(
      async (uri: string, meta: TreinoSessao) => {
        // Semantica do writer real: sobrescreve sem avisar.
        disco.set(uri, meta);
      }
    );
    mockListVaultFolder.mockImplementation(async () => [...disco.keys()]);
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      const meta = disco.get(uri);
      return meta ? { meta, body: '' } : null;
    });
  });

  it('AC-2: duas sessoes da mesma rotina no mesmo dia contam 2', async () => {
    await escreverTreino(VAULT_ROOT, 'rotina-a', {
      ...sessaoBase,
      data: '2026-04-23T07:12:00-03:00',
    });
    await escreverTreino(VAULT_ROOT, 'rotina-a', {
      ...sessaoBase,
      data: '2026-04-23T19:40:00-03:00',
    });
    expect(disco.size).toBe(2);
    const lista = await listarTreinos(VAULT_ROOT);
    expect(lista).toHaveLength(2);
    // Ordenacao desc por data continua valendo dentro do mesmo dia.
    expect(lista[0].data).toBe('2026-04-23T19:40:00-03:00');
  });

  it('AC-3: tres sessoes sem rotina no mesmo dia contam 3', async () => {
    const horas = ['08:00', '12:30', '21:15'];
    for (const hhmm of horas) {
      await escreverTreino(VAULT_ROOT, 'treino', {
        ...sessaoBase,
        rotina: undefined,
        data: `2026-04-23T${hhmm}:00-03:00`,
      });
    }
    expect(disco.size).toBe(3);
    const lista = await listarTreinos(VAULT_ROOT);
    expect(lista).toHaveLength(3);
  });

  // AC-7: regressao de leitura. A listagem e' por pasta, nunca por
  // padrao de nome -- se alguem "otimizar" isso com um filtro por regex
  // de formato novo, o historico do usuario some da tela sem erro
  // nenhum (mesmo sintoma que migrarVaultLayoutPorTipo.ts:59 pagou).
  it('AC-7: arquivo em formato legado, sem migracao, continua listado', async () => {
    // Escrito no formato antigo, direto no "disco".
    disco.set('content://test/vault/treinos/2026-04-20-rotina-a.md', {
      ...sessaoBase,
      data: '2026-04-20T18:00:00-03:00',
    });
    await escreverTreino(VAULT_ROOT, 'rotina-a', {
      ...sessaoBase,
      data: '2026-04-23T07:12:00-03:00',
    });

    const lista = await listarTreinos(VAULT_ROOT);
    expect(lista).toHaveLength(2);
    expect(lista.map((s) => s.data)).toContain('2026-04-20T18:00:00-03:00');

    const comRel = await listarTreinosComRel(VAULT_ROOT);
    const rels = comRel.map((t) => t.rel).sort();
    expect(rels).toEqual([
      'treinos/2026-04-20-rotina-a.md',
      'treinos/2026-04-23-0712-rotina-a.md',
    ]);
  });
});
