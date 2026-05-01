// Testes do boot hook limparLixeiraExpirada (M17). Cobre janela
// 24h, varredura por prefixo de data, retencao de 30 dias, ausencia
// de pasta de lixeira e cacheDirectory ausente em web.
//
// Comentarios sem acento (convencao shell/CI).
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockReadDir = jest.fn();
const mockDelete = jest.fn();

jest.mock('expo-secure-store', () => ({
  __esModule: true,
  getItemAsync: (k: string) => mockGetItem(k),
  setItemAsync: (k: string, v: string) => mockSetItem(k, v),
  deleteItemAsync: jest.fn(),
}));

const mockFsState = {
  cacheDirectory: 'cache://test/' as string | null,
};

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  get cacheDirectory() {
    return mockFsState.cacheDirectory;
  },
  readDirectoryAsync: (...args: unknown[]) => mockReadDir(...args),
  deleteAsync: (...args: unknown[]) => mockDelete(...args),
}));

import {
  KEY_ULTIMA_LIMPEZA,
  RETENCAO_DIAS,
  limparLixeiraExpirada,
} from '@/lib/tarefas/limparLixeiraExpirada';

const HORAS_24 = 24 * 60 * 60 * 1000;
const DIAS = (n: number) => n * 24 * 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  mockFsState.cacheDirectory = 'cache://test/';
});

describe('limparLixeiraExpirada — janela 24h', () => {
  it('nao roda quando ultima limpeza foi <24h atras', async () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const ultima = new Date(agora.getTime() - 12 * 60 * 60 * 1000);
    mockGetItem.mockResolvedValueOnce(ultima.toISOString());

    const out = await limparLixeiraExpirada(agora);
    expect(out.rodou).toBe(false);
    expect(out.motivo).toBe('janela ativa');
    expect(mockReadDir).not.toHaveBeenCalled();
  });

  it('roda quando ultima limpeza foi >=24h atras', async () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const ultima = new Date(agora.getTime() - HORAS_24 - 60_000);
    mockGetItem.mockResolvedValueOnce(ultima.toISOString());
    mockReadDir.mockResolvedValueOnce([]);

    const out = await limparLixeiraExpirada(agora);
    expect(out.rodou).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith(
      KEY_ULTIMA_LIMPEZA,
      agora.toISOString()
    );
  });

  it('roda quando nunca foi limpa (sem timestamp)', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockReadDir.mockResolvedValueOnce([]);
    const agora = new Date('2026-04-29T10:00:00Z');
    const out = await limparLixeiraExpirada(agora);
    expect(out.rodou).toBe(true);
  });
});

describe('limparLixeiraExpirada — varredura', () => {
  beforeEach(() => {
    mockGetItem.mockResolvedValue(null);
  });

  it('remove arquivos com prefixo de data >30 dias', async () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const antiga = new Date(agora.getTime() - DIAS(45));
    const y = antiga.getUTCFullYear();
    const m = String(antiga.getUTCMonth() + 1).padStart(2, '0');
    const d = String(antiga.getUTCDate()).padStart(2, '0');
    const nomeAntigo = `${y}${m}${d}-100000-2025-01-01-x.md`;

    mockReadDir.mockResolvedValueOnce([
      nomeAntigo,
      '20260429-090000-2026-04-29-recente.md',
    ]);
    mockDelete.mockResolvedValue(undefined);

    const out = await limparLixeiraExpirada(agora);
    expect(out.arquivosRemovidos).toBe(1);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(
      expect.stringContaining(nomeAntigo),
      expect.objectContaining({ idempotent: true })
    );
  });

  it('mantem arquivos dentro da janela de retencao', async () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const recente = new Date(agora.getTime() - DIAS(15));
    const y = recente.getUTCFullYear();
    const m = String(recente.getUTCMonth() + 1).padStart(2, '0');
    const d = String(recente.getUTCDate()).padStart(2, '0');
    const nome = `${y}${m}${d}-100000-recente.md`;

    mockReadDir.mockResolvedValueOnce([nome]);

    const out = await limparLixeiraExpirada(agora);
    expect(out.arquivosRemovidos).toBe(0);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('ignora nomes sem prefixo de data', async () => {
    mockReadDir.mockResolvedValueOnce(['sem-prefixo.md', 'random.txt']);
    const out = await limparLixeiraExpirada(new Date('2026-04-29T10:00:00Z'));
    expect(out.arquivosRemovidos).toBe(0);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('trata pasta inexistente como sucesso vazio', async () => {
    mockReadDir.mockRejectedValueOnce(new Error('ENOENT'));
    const out = await limparLixeiraExpirada(
      new Date('2026-04-29T10:00:00Z')
    );
    expect(out.rodou).toBe(true);
    expect(out.arquivosRemovidos).toBe(0);
  });

  it('cobre cap de retencao exatamente em 30 dias', () => {
    expect(RETENCAO_DIAS).toBe(30);
  });
});

describe('limparLixeiraExpirada — cacheDirectory ausente', () => {
  it('marca timestamp e retorna sem rodar', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockFsState.cacheDirectory = null;

    const agora = new Date('2026-04-29T10:00:00Z');
    const out = await limparLixeiraExpirada(agora);
    expect(out.rodou).toBe(false);
    expect(out.motivo).toMatch(/cacheDirectory/);
    expect(mockSetItem).toHaveBeenCalledWith(
      KEY_ULTIMA_LIMPEZA,
      agora.toISOString()
    );
  });
});
