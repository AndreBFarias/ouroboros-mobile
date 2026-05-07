// Testes da funcao saveHumor. Mockamos writeVaultFile e readVaultFile
// do barrel '@/lib/vault' para isolar a logica pura sem tocar SAF.
import type { HumorMeta } from '@/lib/schemas/humor';

const mockWriteVaultFile = jest.fn<Promise<void>, [string, unknown, string]>();
const mockReadVaultFile = jest.fn<
  Promise<{ meta: HumorMeta; body: string } | null>,
  [string, unknown]
>();

jest.mock('@/lib/vault', () => {
  const actual = jest.requireActual('@/lib/vault');
  return {
    ...actual,
    writeVaultFile: (...args: [string, unknown, string]) =>
      mockWriteVaultFile(...args),
    readVaultFile: (...args: [string, unknown]) =>
      mockReadVaultFile(...args),
  };
});

import { saveHumor } from '@/lib/humor/saveHumor';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const baseHumor: HumorMeta = {
  tipo: 'humor',
  data: '2026-04-29',
  autor: 'pessoa_a',
  humor: 4,
  energia: 3,
  ansiedade: 2,
  foco: 4,
  tags: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Por padrao retorna null = arquivo nao existe.
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  // Fixa a data para os testes nao dependerem de today.
  jest.useFakeTimers().setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('saveHumor', () => {
  it('caminho feliz: escreve no path canonico sem conflito', async () => {
    const out = await saveHumor(baseHumor, VAULT_ROOT);
    expect(out.conflito).toBe(false);
    expect(out.uri).toMatch(/markdown\/humor-2026-04-29\.md$/);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('markdown/humor-2026-04-29.md');
    expect(meta).toMatchObject({
      tipo: 'humor',
      data: '2026-04-29',
      autor: 'pessoa_a',
    });
    // Corpo vazio: frase vai no frontmatter.
    expect(body).toBe('');
  });

  it('mesmo autor regravando: sobrescreve no canonico sem conflito', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: { ...baseHumor, humor: 1 },
      body: '',
    });
    const out = await saveHumor(baseHumor, VAULT_ROOT);
    expect(out.conflito).toBe(false);
    expect(out.uri).toMatch(/markdown\/humor-2026-04-29\.md$/);
  });

  it('outra instalacao ja gravou: aplica sufixo deviceId M38', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: { ...baseHumor, autor: 'pessoa_b' },
      body: '',
    });
    const out = await saveHumor(baseHumor, VAULT_ROOT);
    expect(out.conflito).toBe(true);
    // M38: suffix mudou de '-pessoa_<a|b>' para '-ouro-<6chars>' para
    // cobrir 4+ devices em vez de so 2.
    expect(out.uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toMatch(/markdown\/humor-2026-04-29-ouro-[a-z0-9]{6}\.md$/);
  });

  it('rejeita payload invalido (humor=0)', async () => {
    const invalido = { ...baseHumor, humor: 0 } as HumorMeta;
    await expect(saveHumor(invalido, VAULT_ROOT)).rejects.toThrow(
      /humor invalido/
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('normaliza root com barra final na concatenacao', async () => {
    await saveHumor(baseHumor, `${VAULT_ROOT}/`);
    const [uri] = mockWriteVaultFile.mock.calls[0];
    // Nao deve haver '//' antes de daily/.
    expect(uri).not.toContain('//markdown/');
    expect(uri).toMatch(/\/markdown\/humor-2026-04-29\.md$/);
  });
});
