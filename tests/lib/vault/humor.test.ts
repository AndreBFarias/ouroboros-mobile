// Testes do listarHumor (M36). Cobre pasta vazia, ordenacao desc por
// data e descarte silencioso de arquivos malformados.
import type { HumorMeta } from '@/lib/schemas/humor';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

import { listarHumor } from '@/lib/vault/humor';

const VAULT_ROOT = 'content://test/vault';

const humorBase: HumorMeta = {
  tipo: 'humor',
  data: '2026-05-01',
  autor: 'pessoa_a',
  humor: 4,
  energia: 3,
  ansiedade: 2,
  foco: 4,
  tags: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarHumor', () => {
  it('devolve [] quando vault root vazio ou web mock', async () => {
    expect(await listarHumor('')).toEqual([]);
    expect(await listarHumor('web://mock-vault')).toEqual([]);
    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });

  it('devolve [] quando pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarHumor(VAULT_ROOT);
    expect(out).toEqual([]);
  });

  it('ordena desc por data', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/daily/2026-04-29.md`,
      `${VAULT_ROOT}/daily/2026-05-01.md`,
      `${VAULT_ROOT}/daily/2026-04-30.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({ meta: { ...humorBase, data: '2026-04-29' } })
      .mockResolvedValueOnce({ meta: { ...humorBase, data: '2026-05-01' } })
      .mockResolvedValueOnce({ meta: { ...humorBase, data: '2026-04-30' } });
    const out = await listarHumor(VAULT_ROOT);
    expect(out.map((h) => h.data)).toEqual([
      '2026-05-01',
      '2026-04-30',
      '2026-04-29',
    ]);
  });

  it('descarta arquivos malformados', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/daily/2026-05-01.md`,
      `${VAULT_ROOT}/daily/quebrado.md`,
    ]);
    mockReadVaultFile
      .mockResolvedValueOnce({ meta: humorBase })
      .mockResolvedValueOnce(null);
    const out = await listarHumor(VAULT_ROOT);
    expect(out.length).toBe(1);
  });
});
