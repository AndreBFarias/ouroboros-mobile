// Testes de readVaultFiles e lerListagemMarkdown (R-AUDIT-VAULT-PERF).
// Cobre: ordem de entrada preservada, chunks paralelos, descarte
// silencioso de null (I/O ausente) e de arquivo que lanca (malformado),
// e listagem unica de markdown/.
//
// Mocka '@/lib/vault/reader' com { listVaultFolder, readVaultFile }: as
// primitivas de leituraLote.ts reusam readVaultFile por dentro, entao o
// mock preserva o branch web/dev e o tratamento de erro atual.
import { z } from 'zod';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

import { readVaultFiles, lerListagemMarkdown } from '@/lib/vault/leituraLote';

const Schema = z.object({ n: z.number() });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('readVaultFiles', () => {
  it('preserva a ordem de entrada (nao a ordem de resolucao)', async () => {
    // Resolve fora de ordem de proposito (uri terminando em 1 demora
    // mais); readVaultFiles deve devolver na ordem de ENTRADA.
    mockReadVaultFile.mockImplementation((uri: string) => {
      const n = Number(uri.slice(1));
      const atraso = n === 1 ? 20 : 0;
      return new Promise((resolve) =>
        setTimeout(() => resolve({ meta: { n }, body: '' }), atraso)
      );
    });
    const out = await readVaultFiles(['u3', 'u1', 'u2'], Schema);
    expect(out.map((r) => r.uri)).toEqual(['u3', 'u1', 'u2']);
    expect(out.map((r) => r.parsed.meta.n)).toEqual([3, 1, 2]);
  });

  it('descarta null (I/O ausente) em silencio, mantendo ordem', async () => {
    mockReadVaultFile
      .mockResolvedValueOnce({ meta: { n: 1 }, body: '' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ meta: { n: 3 }, body: '' });
    const out = await readVaultFiles(['u1', 'u2', 'u3'], Schema);
    expect(out.map((r) => r.uri)).toEqual(['u1', 'u3']);
    expect(out.map((r) => r.parsed.meta.n)).toEqual([1, 3]);
  });

  it('descarta arquivo que lanca (malformado) sem rejeitar o lote', async () => {
    mockReadVaultFile
      .mockResolvedValueOnce({ meta: { n: 1 }, body: '' })
      .mockRejectedValueOnce(new Error('yaml quebrado'))
      .mockResolvedValueOnce({ meta: { n: 3 }, body: '' });
    const out = await readVaultFiles(['u1', 'u2', 'u3'], Schema);
    expect(out.map((r) => r.parsed.meta.n)).toEqual([1, 3]);
  });

  it('le em chunks paralelos preservando a ordem global', async () => {
    mockReadVaultFile.mockImplementation((uri: string) =>
      Promise.resolve({ meta: { n: Number(uri) }, body: '' })
    );
    const out = await readVaultFiles(['1', '2', '3', '4', '5'], Schema, {
      chunk: 2,
    });
    expect(out.map((r) => r.parsed.meta.n)).toEqual([1, 2, 3, 4, 5]);
    expect(mockReadVaultFile).toHaveBeenCalledTimes(5);
  });

  it('lista vazia => [] sem chamar readVaultFile', async () => {
    const out = await readVaultFiles([], Schema);
    expect(out).toEqual([]);
    expect(mockReadVaultFile).not.toHaveBeenCalled();
  });
});

describe('lerListagemMarkdown', () => {
  it('root vazio => [] sem chamar listVaultFolder', async () => {
    expect(await lerListagemMarkdown('')).toEqual([]);
    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });

  it('lista markdown/ UMA vez e devolve as URIs cruas', async () => {
    const uris = [
      'content://v/markdown/humor-2026-05-01.md',
      'content://v/markdown/tarefa-x.md',
    ];
    mockListVaultFolder.mockResolvedValueOnce(uris);
    const out = await lerListagemMarkdown('content://v');
    expect(out).toEqual(uris);
    expect(mockListVaultFolder).toHaveBeenCalledTimes(1);
    expect(mockListVaultFolder).toHaveBeenCalledWith(
      'content://v/markdown',
      '.md'
    );
  });
});
