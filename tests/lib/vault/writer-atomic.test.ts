// Cobre o atomic write em file:// do writer (B1 da sprint
// AUDIT-T1-BUGS). Sequencia esperada:
//   writeAsStringAsync(uri + '.writing', raw)
//   moveAsync({ from: uri + '.writing', to: uri })
//
// Branch content:// mantem write direto sem .writing. Cobre tambem o
// caso de moveAsync lancar (esperamos delete do tmp e re-throw).
//
// Comentarios sem acento (convencao shell/CI).

const mockWriteAsStringAsync = jest.fn().mockResolvedValue(undefined);
const mockMoveAsync = jest.fn().mockResolvedValue(undefined);
const mockDeleteAsync = jest.fn().mockResolvedValue(undefined);
const mockMakeDirectoryAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  moveAsync: (...args: unknown[]) => mockMoveAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  StorageAccessFramework: {
    writeAsStringAsync: (...args: unknown[]) =>
      mockWriteAsStringAsync(...args),
  },
}));

// Stub minimo do stringifyFrontmatter para evitar dependencia do YAML
// real (que precisa do meta com shape valido). Aqui so importa testar
// a sequencia tmp -> move.
jest.mock('@/lib/vault/frontmatter', () => ({
  __esModule: true,
  stringifyFrontmatter: jest.fn((_meta: unknown, body: string) =>
    `---\nstub: 1\n---\n${body}`
  ),
}));

jest.mock('@/lib/dev/vaultMockStore', () => ({
  __esModule: true,
  useVaultMock: { getState: () => ({ setArquivo: jest.fn() }) },
}));

import { writeVaultFile, WRITING_SUFFIX } from '@/lib/vault/writer';

describe('writeVaultFile atomic file://', () => {
  beforeEach(() => {
    mockWriteAsStringAsync.mockClear();
    mockMoveAsync.mockClear();
    mockDeleteAsync.mockClear();
    mockMakeDirectoryAsync.mockClear();
  });

  it('escreve em <uri>.writing e renomeia para <uri> em file://', async () => {
    const finalUri = 'file:///vault/markdown/humor-2026-05-15.md';
    await writeVaultFile(finalUri, { x: 1 }, 'corpo');
    const tmpUri = `${finalUri}${WRITING_SUFFIX}`;

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      tmpUri,
      expect.stringContaining('corpo')
    );
    expect(mockMoveAsync).toHaveBeenCalledTimes(1);
    expect(mockMoveAsync).toHaveBeenCalledWith({ from: tmpUri, to: finalUri });
  });

  it('content:// mantem write direto (sem .writing nem move)', async () => {
    const finalUri =
      'content://com.android.externalstorage/document/primary%3AVault%2Fmarkdown%2Fhumor.md';
    await writeVaultFile(finalUri, { x: 1 }, 'corpo');

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      finalUri,
      expect.any(String)
    );
    expect(mockMoveAsync).not.toHaveBeenCalled();
  });

  it('se moveAsync lanca, deleta o tmp e re-lanca', async () => {
    const finalUri = 'file:///vault/markdown/humor-2026-05-15.md';
    const tmpUri = `${finalUri}${WRITING_SUFFIX}`;
    mockMoveAsync.mockRejectedValueOnce(new Error('rename rejeitado'));

    await expect(writeVaultFile(finalUri, { x: 1 }, 'corpo')).rejects.toThrow(
      'rename rejeitado'
    );
    expect(mockDeleteAsync).toHaveBeenCalledWith(tmpUri, { idempotent: true });
  });
});
