// Testes do writer escreverSono. Mocka writeVaultFile e valida que o
// path canonico (markdown/sono-YYYY-MM-DD-hc-<id>.md) e o meta chegam
// corretos a camada de IO.
// R-INT-3-HC-AUTOPULL-SLEEP.
//
// Comentarios sem acento.
const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import { escreverSono } from '@/lib/vault/sono';

const VAULT_ROOT = 'content://test/vault';

const DADOS = {
  data: '2026-05-22',
  autor: 'pessoa_a' as const,
  inicio: '2026-05-21T23:15:00-03:00',
  fim: '2026-05-22T07:32:00-03:00',
  duracao_min: 497,
  fonte_hc_id: 'a1b2c3d4-0000',
  fonte_hc_origin: 'com.samsung.health',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteVaultFile.mockResolvedValue(undefined);
});

describe('escreverSono', () => {
  it('escreve no path canonico markdown/sono-YYYY-MM-DD-hc-<id>.md', async () => {
    const out = await escreverSono(VAULT_ROOT, DADOS);
    expect(out.rel).toBe('markdown/sono-2026-05-22-hc-a1b2c3d4-0000.md');
    expect(out.uri).toContain('markdown/sono-2026-05-22-hc-a1b2c3d4-0000.md');
  });

  it('passa meta validado com tipo=sono e campos completos', async () => {
    await escreverSono(VAULT_ROOT, DADOS);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('markdown/sono-2026-05-22-hc-a1b2c3d4-0000.md');
    expect(meta.tipo).toBe('sono');
    expect(meta.data).toBe('2026-05-22');
    expect(meta.autor).toBe('pessoa_a');
    expect(meta.inicio).toBe('2026-05-21T23:15:00-03:00');
    expect(meta.fim).toBe('2026-05-22T07:32:00-03:00');
    expect(meta.duracao_min).toBe(497);
    expect(meta.fonte_hc_id).toBe('a1b2c3d4-0000');
    expect(meta.fonte_hc_origin).toBe('com.samsung.health');
    expect(body).toBe('');
  });

  it('aceita pessoa_b como autor', async () => {
    await escreverSono(VAULT_ROOT, { ...DADOS, autor: 'pessoa_b' });
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect(meta.autor).toBe('pessoa_b');
  });

  it('sanitiza hc id com caracteres especiais no path', async () => {
    const out = await escreverSono(VAULT_ROOT, {
      ...DADOS,
      fonte_hc_id: 'ABC/123:xyz',
    });
    expect(out.rel).toBe('markdown/sono-2026-05-22-hc-abc-123-xyz.md');
  });

  it('omite fonte_hc_origin quando ausente', async () => {
    const { fonte_hc_origin, ...semOrigin } = DADOS;
    void fonte_hc_origin;
    await escreverSono(VAULT_ROOT, semOrigin);
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect(meta.fonte_hc_origin).toBeUndefined();
  });

  it('usa fallback de slug manual quando fonte_hc_id ausente', async () => {
    const { fonte_hc_id, ...semId } = DADOS;
    void fonte_hc_id;
    const out = await escreverSono(VAULT_ROOT, semId);
    expect(out.rel).toContain('markdown/sono-2026-05-22-hc-manual-');
  });

  it('rejeita duracao_min invalida via schema', async () => {
    await expect(
      escreverSono(VAULT_ROOT, { ...DADOS, duracao_min: 0 })
    ).rejects.toThrow(/sono invalido/);
  });

  it('rejeita data fora do padrao via schema', async () => {
    await expect(
      escreverSono(VAULT_ROOT, { ...DADOS, data: '22/05/2026' })
    ).rejects.toThrow(/sono invalido/);
  });
});
