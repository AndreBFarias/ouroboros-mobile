// EXE-1 (2026-09-08) AC-4: a listagem devolve o path relativo REAL de
// cada sessao, e esse path localiza o arquivo na exclusao.
//
// Por que este arquivo existe: ate a EXE-1 a UI remontava o path a
// partir do conteudo -- (data, slugifyTreino(rotina)). Funcionava
// enquanto o nome fosse derivavel do conteudo; assim que o usuario
// renomeava a rotina, a exclusao apontava para um arquivo que nao
// existia. O teste fecha o circuito: escreve, lista, e usa o `rel` que
// a listagem devolveu para excluir de fato.
//
// Cobre tambem arquivo em formato legado (sem hora) AINDA NAO migrado,
// que e' o estado de qualquer instalacao no primeiro boot desta versao.
//
// Comentarios sem acento (convencao shell/CI).
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
  listarTreinosComRel,
  escreverTreino,
  excluirTreino,
} from '@/lib/vault/treinos';

const VAULT_ROOT = 'content://test/vault';

const sessaoBase: TreinoSessao = {
  tipo: 'treino_sessao',
  data: '2026-04-23T07:12:00-03:00',
  autor: 'pessoa_a',
  rotina: 'Rotina A',
  duracao_min: 30,
  exercicios: [{ nome: 'supino', series: 3, reps: 8 }],
};

// Vault em memoria: uri -> meta.
let disco: Map<string, TreinoSessao>;

beforeEach(() => {
  jest.clearAllMocks();
  disco = new Map();
  mockWriteVaultFile.mockImplementation(
    async (uri: string, meta: TreinoSessao) => {
      disco.set(uri, meta);
    }
  );
  mockListVaultFolder.mockImplementation(async () => [...disco.keys()]);
  mockReadVaultFile.mockImplementation(async (uri: string) => {
    const meta = disco.get(uri);
    return meta ? { meta, body: '' } : null;
  });
  // moverArquivoParaLixeira: le a origem, grava na lixeira, apaga a
  // origem. Le do mesmo "disco" para que URI errada falhe como falharia
  // no SAF real.
  mockReadAsString.mockImplementation(async (uri: string) => {
    if (!disco.has(uri)) throw new Error(`arquivo ausente: ${uri}`);
    return '---\ntipo: treino_sessao\n---\n';
  });
  mockDeleteAsync.mockImplementation(async (uri: string) => {
    disco.delete(uri);
  });
});

describe('listarTreinosComRel', () => {
  it('devolve rel comecando em treinos/ para formato novo e legado', async () => {
    await escreverTreino(VAULT_ROOT, 'rotina-a', sessaoBase);
    disco.set('content://test/vault/treinos/2026-04-20-rotina-a.md', {
      ...sessaoBase,
      data: '2026-04-20T18:00:00-03:00',
    });

    const lista = await listarTreinosComRel(VAULT_ROOT);
    expect(lista).toHaveLength(2);
    for (const item of lista) {
      expect(item.rel.startsWith('treinos/')).toBe(true);
    }
    expect(lista.map((t) => t.rel).sort()).toEqual([
      'treinos/2026-04-20-rotina-a.md',
      'treinos/2026-04-23-0712-rotina-a.md',
    ]);
  });

  it('o rel do formato novo localiza o arquivo em excluirTreino', async () => {
    const escrito = await escreverTreino(VAULT_ROOT, 'rotina-a', sessaoBase);
    const [item] = await listarTreinosComRel(VAULT_ROOT);

    await excluirTreino(VAULT_ROOT, item.rel);

    expect(mockDeleteAsync).toHaveBeenCalledWith(escrito.uri);
    expect(disco.has(escrito.uri)).toBe(false);
    expect(await listarTreinosComRel(VAULT_ROOT)).toHaveLength(0);
  });

  it('o rel do formato legado localiza o arquivo em excluirTreino', async () => {
    const uriLegado = 'content://test/vault/treinos/2026-04-20-rotina-a.md';
    disco.set(uriLegado, { ...sessaoBase, data: '2026-04-20T18:00:00-03:00' });

    const [item] = await listarTreinosComRel(VAULT_ROOT);
    expect(item.rel).toBe('treinos/2026-04-20-rotina-a.md');

    await excluirTreino(VAULT_ROOT, item.rel);

    expect(mockDeleteAsync).toHaveBeenCalledWith(uriLegado);
    expect(disco.has(uriLegado)).toBe(false);
  });

  // A regressao que a EXE-1 corrige: o path remontado a partir do
  // conteudo desalinha assim que o usuario renomeia a rotina. O `rel`
  // da listagem nao desalinha.
  it('o rel sobrevive a rotina renomeada no conteudo', async () => {
    const escrito = await escreverTreino(VAULT_ROOT, 'rotina-a', sessaoBase);
    // Usuario renomeia a rotina editando o arquivo; o nome nao muda.
    disco.set(escrito.uri, { ...sessaoBase, rotina: 'Rotina renomeada' });

    const [item] = await listarTreinosComRel(VAULT_ROOT);
    expect(item.meta.rotina).toBe('Rotina renomeada');
    expect(item.rel).toBe('treinos/2026-04-23-0712-rotina-a.md');

    await excluirTreino(VAULT_ROOT, item.rel);
    expect(disco.has(escrito.uri)).toBe(false);
  });
});
