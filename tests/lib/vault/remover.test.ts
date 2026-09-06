// AUDIT-INFRA-VAULT-MOCK-DELETE: branch NATIVO de deleteVaultFile.
// O preset de teste reporta Platform.OS === 'ios', entao este arquivo
// cobre o galho que delega ao SAF. O galho web/dev fica em
// remover-web-mock.test.ts, que forca Platform.OS === 'web'.
//
// O que precisa ficar provado aqui: a troca de call site dos onze
// modulos nao pode mudar nada em aparelho. deleteVaultFile chama
// StorageAccessFramework.deleteAsync com a mesma uri e propaga o erro
// -- os callers que toleram ausencia ja tem try/catch proprio.
//
// Comentarios sem acento (convencao shell/CI).
const mockDeleteAsync = jest.fn().mockResolvedValue(undefined);
const mockApagarArquivo = jest.fn().mockReturnValue(true);

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

jest.mock('@/lib/dev/vaultMockStore', () => ({
  __esModule: true,
  useVaultMock: {
    getState: () => ({
      apagarArquivo: (...args: unknown[]) => mockApagarArquivo(...args),
    }),
  },
}));

import { deleteVaultFile } from '@/lib/vault/remover';

const URI = 'content://vault/Ouroboros/markdown/rotina-treino-a.md';

beforeEach(() => {
  mockDeleteAsync.mockClear();
  mockDeleteAsync.mockResolvedValue(undefined);
  mockApagarArquivo.mockClear();
});

describe('deleteVaultFile em nativo', () => {
  it('delega ao SAF com a uri recebida, sem tocar no mock store', async () => {
    await deleteVaultFile(URI);
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
    expect(mockDeleteAsync).toHaveBeenCalledWith(URI);
    expect(mockApagarArquivo).not.toHaveBeenCalled();
  });

  it('propaga a falha do SAF em vez de engolir', async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error('sem permissao'));
    await expect(deleteVaultFile(URI)).rejects.toThrow('sem permissao');
  });
});
