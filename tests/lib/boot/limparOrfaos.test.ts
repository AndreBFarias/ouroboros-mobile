// Cobre o boot hook de limpeza de orfaos *.writing (B1 da sprint
// AUDIT-T1-BUGS). Cenarios:
//  - vault root content:// : no-op (return 0)
//  - vault root vazio: no-op
//  - vault root file:// com 2 orfaos no root e 1 na pasta markdown:
//    deleta os 3 com idempotent flag
//  - readDirectoryAsync falhando: tolera e segue para a proxima pasta
//
// Comentarios sem acento (convencao shell/CI).

const mockReadDirectoryAsync = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  documentDirectory: 'file:///mock/documents/',
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

import { limparArquivosWritingOrfaos } from '@/lib/boot/limparArquivosWritingOrfaos';

describe('limparArquivosWritingOrfaos', () => {
  beforeEach(() => {
    mockReadDirectoryAsync.mockReset();
    mockDeleteAsync.mockReset();
    mockDeleteAsync.mockResolvedValue(undefined);
  });

  it('no-op para vault root vazio', async () => {
    const r = await limparArquivosWritingOrfaos('');
    expect(r).toBe(0);
    expect(mockReadDirectoryAsync).not.toHaveBeenCalled();
  });

  it('no-op para vault content:// (SAF) sem .writing', async () => {
    const r = await limparArquivosWritingOrfaos(
      'content://com.android.externalstorage/document/primary%3AVault'
    );
    expect(r).toBe(0);
    expect(mockReadDirectoryAsync).not.toHaveBeenCalled();
  });

  it('apaga orfaos em vault root e em markdown/', async () => {
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri === 'file:///vault') {
        return Promise.resolve([
          'humor-2026-05-15.md.writing',
          'tarefa-coisas.md.writing',
          '_devices.md',
        ]);
      }
      if (uri === 'file:///vault/markdown') {
        return Promise.resolve([
          'humor-2026-05-15.md',
          'alarme-medicacao.md.writing',
        ]);
      }
      return Promise.reject(new Error('pasta inesperada'));
    });

    const r = await limparArquivosWritingOrfaos('file:///vault');
    expect(r).toBe(3);
    expect(mockDeleteAsync).toHaveBeenCalledTimes(3);
    // Confirma idempotent flag passado a cada delete.
    for (const call of mockDeleteAsync.mock.calls) {
      expect(call[1]).toEqual({ idempotent: true });
    }
  });

  it('tolera readDirectoryAsync falhando em uma pasta', async () => {
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri === 'file:///vault') {
        return Promise.reject(new Error('pasta inacessivel'));
      }
      if (uri === 'file:///vault/markdown') {
        return Promise.resolve(['alarme-x.md.writing']);
      }
      return Promise.resolve([]);
    });

    const r = await limparArquivosWritingOrfaos('file:///vault');
    expect(r).toBe(1);
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
  });

  it('tolera deleteAsync falhando em um arquivo individual', async () => {
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri === 'file:///vault') {
        return Promise.resolve(['a.md.writing', 'b.md.writing']);
      }
      return Promise.resolve([]);
    });
    mockDeleteAsync.mockImplementation((uri: string) => {
      if (uri.includes('a.md.writing')) {
        return Promise.reject(new Error('EACCES'));
      }
      return Promise.resolve(undefined);
    });

    const r = await limparArquivosWritingOrfaos('file:///vault');
    // Falha em 'a' nao impede 'b'; total contabilizado e' 1 (so 'b'
    // sobreviveu ao try/catch).
    expect(r).toBe(1);
  });
});
