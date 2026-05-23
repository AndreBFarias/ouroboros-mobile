// Testes do writer escreverPassos. Mocka writeVaultFile e valida
// que o path canonico (markdown/passos-YYYY-MM-DD.md) e o meta
// chegam corretos a camada de IO.
const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import { escreverPassos } from '@/lib/vault/passos';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('escreverPassos', () => {
  it('escreve no path canonico markdown/passos-YYYY-MM-DD.md', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const out = await escreverPassos(
      VAULT_ROOT,
      '2026-05-21',
      8472,
      'pessoa_a',
      '2026-05-22T20:30:00-03:00'
    );
    expect(out.rel).toBe('markdown/passos-2026-05-21.md');
    expect(out.uri).toContain('markdown/passos-2026-05-21.md');
  });

  it('passa meta validado com fonte_hc=true e tipo=passos', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverPassos(
      VAULT_ROOT,
      '2026-05-21',
      8472,
      'pessoa_a',
      '2026-05-22T20:30:00-03:00'
    );
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('markdown/passos-2026-05-21.md');
    expect(meta.tipo).toBe('passos');
    expect(meta.fonte_hc).toBe(true);
    expect(meta.total).toBe(8472);
    expect(meta.autor).toBe('pessoa_a');
    expect(meta.data).toBe('2026-05-21');
    expect(meta.sincronizado_em).toBe('2026-05-22T20:30:00-03:00');
    expect(body).toBe('');
  });

  it('default sincronizado_em quando omitido', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const antes = Date.now();
    await escreverPassos(VAULT_ROOT, '2026-05-21', 100, 'pessoa_a');
    const depois = Date.now();
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    const ts = new Date(meta.sincronizado_em).getTime();
    expect(ts).toBeGreaterThanOrEqual(antes);
    expect(ts).toBeLessThanOrEqual(depois);
  });

  it('aceita pessoa_b como autor', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverPassos(
      VAULT_ROOT,
      '2026-05-21',
      5000,
      'pessoa_b',
      '2026-05-22T20:30:00-03:00'
    );
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect(meta.autor).toBe('pessoa_b');
  });

  it('rejeita total negativo via schema', async () => {
    await expect(
      escreverPassos(
        VAULT_ROOT,
        '2026-05-21',
        -5,
        'pessoa_a',
        '2026-05-22T20:30:00-03:00'
      )
    ).rejects.toThrow(/passos invalido/);
  });

  it('rejeita data fora do padrao YYYY-MM-DD', async () => {
    await expect(
      escreverPassos(
        VAULT_ROOT,
        '21/05/2026',
        100,
        'pessoa_a',
        '2026-05-22T20:30:00-03:00'
      )
    ).rejects.toThrow(/passos invalido/);
  });

  it('aceita total zero (dia caminhada nula)', async () => {
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    await escreverPassos(
      VAULT_ROOT,
      '2026-05-21',
      0,
      'pessoa_a',
      '2026-05-22T20:30:00-03:00'
    );
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect(meta.total).toBe(0);
  });
});
