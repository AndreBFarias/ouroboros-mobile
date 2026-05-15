import { limparCache } from '@/lib/services/limparCache';

// Mock do expo-file-system/legacy: simula cacheDirectory com arquivos.
// Cada teste define o conteudo do diretorio.
jest.mock('expo-file-system/legacy', () => {
  const memoria = {
    cacheDirectory: 'file:///tmp/ouroboros-cache/',
    files: ['ouroboros-export-1.zip', 'ouroboros-export-2.zip', 'outro.txt'],
    deleted: new Set<string>(),
  };
  return {
    __esModule: true,
    cacheDirectory: memoria.cacheDirectory,
    readDirectoryAsync: jest.fn(() =>
      Promise.resolve(memoria.files.filter((f) => !memoria.deleted.has(f)))
    ),
    deleteAsync: jest.fn((path: string) => {
      const nome = path.replace(memoria.cacheDirectory, '');
      memoria.deleted.add(nome);
      return Promise.resolve();
    }),
    EncodingType: { UTF8: 'utf8', Base64: 'base64' },
    __memoria: memoria,
  };
});

import * as FS from 'expo-file-system/legacy';

const memoria = (
  FS as unknown as {
    __memoria: { files: string[]; deleted: Set<string> };
  }
).__memoria;

describe('limparCache', () => {
  beforeEach(() => {
    memoria.files = [
      'ouroboros-export-1.zip',
      'ouroboros-export-2.zip',
      'outro.txt',
      'ouroboros-export-3.zip',
    ];
    memoria.deleted.clear();
    jest.clearAllMocks();
  });

  it('remove apenas ouroboros-export-*.zip', async () => {
    const r = await limparCache();
    expect(r.arquivosRemovidos).toBe(3);
    expect(memoria.deleted.has('ouroboros-export-1.zip')).toBe(true);
    expect(memoria.deleted.has('ouroboros-export-2.zip')).toBe(true);
    expect(memoria.deleted.has('ouroboros-export-3.zip')).toBe(true);
    expect(memoria.deleted.has('outro.txt')).toBe(false);
  });

  it('idempotente: chamar 2x retorna 0 na segunda', async () => {
    await limparCache();
    const r = await limparCache();
    expect(r.arquivosRemovidos).toBe(0);
  });

  it('lida com cache vazio sem erro', async () => {
    memoria.files = [];
    const r = await limparCache();
    expect(r.arquivosRemovidos).toBe(0);
  });
});
