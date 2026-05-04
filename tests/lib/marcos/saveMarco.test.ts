// Testes do saveMarco. Foca na injecao automatica de hash e
// derivacao de slug.
import type { Marco } from '@/lib/schemas/marco';

const mockEscreverMarco = jest.fn();

jest.mock('@/lib/vault/marcos', () => {
  const actual = jest.requireActual('@/lib/vault/marcos');
  return {
    ...actual,
    escreverMarco: (...args: unknown[]) => mockEscreverMarco(...args),
  };
});

import { saveMarco } from '@/lib/marcos/saveMarco';
import { hashMarcoConteudo } from '@/lib/marcos/hash';

const VAULT_ROOT = 'content://test/vault';

const marcoBase: Marco = {
  tipo: 'marco',
  data: '2026-04-23T20:15:00-03:00',
  autor: 'pessoa_a',
  descricao: 'Tres treinos nesta semana.',
  tags: ['treino'],
  auto: false,
  para: { tipo: 'mim' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEscreverMarco.mockResolvedValue({
    uri: 'content://test/vault/marcos/2026-04-23-tres-treinos.md',
    rel: 'marcos/2026-04-23-tres-treinos.md',
  });
});

describe('saveMarco', () => {
  it('injeta hash automaticamente quando ausente', async () => {
    await saveMarco({ meta: marcoBase, vaultRoot: VAULT_ROOT });
    const expected = hashMarcoConteudo(
      'pessoa_a',
      'Tres treinos nesta semana.'
    );
    expect(mockEscreverMarco).toHaveBeenCalledWith(
      VAULT_ROOT,
      expect.any(String),
      expect.objectContaining({ hash: expected }),
      ''
    );
  });

  it('preserva hash existente quando ja vem no meta', async () => {
    const m: Marco = { ...marcoBase, hash: 'aaaaaaaaaaaa' };
    await saveMarco({ meta: m, vaultRoot: VAULT_ROOT });
    expect(mockEscreverMarco).toHaveBeenCalledWith(
      VAULT_ROOT,
      expect.any(String),
      expect.objectContaining({ hash: 'aaaaaaaaaaaa' }),
      ''
    );
  });

  it('deriva slug da descricao', async () => {
    const out = await saveMarco({ meta: marcoBase, vaultRoot: VAULT_ROOT });
    expect(out.slug).toMatch(/^tres/);
  });

  it('respeita slugOverride', async () => {
    const out = await saveMarco({
      meta: marcoBase,
      vaultRoot: VAULT_ROOT,
      slugOverride: 'custom',
    });
    expect(out.slug).toBe('custom');
  });

  it('rejeita meta invalido (descricao vazia)', async () => {
    await expect(
      saveMarco({
        meta: { ...marcoBase, descricao: '' },
        vaultRoot: VAULT_ROOT,
      })
    ).rejects.toThrow(/marco invalido/);
    expect(mockEscreverMarco).not.toHaveBeenCalled();
  });
});
