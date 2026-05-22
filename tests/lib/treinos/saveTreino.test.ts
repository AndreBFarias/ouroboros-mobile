// Testes do saveTreino. Mocka escreverTreino para isolar a logica de
// derivacao de slug e validacao defensiva.
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

const mockEscreverTreino = jest.fn();

jest.mock('@/lib/vault/treinos', () => {
  const actual = jest.requireActual('@/lib/vault/treinos');
  return {
    ...actual,
    escreverTreino: (...args: unknown[]) => mockEscreverTreino(...args),
  };
});

import { saveTreino } from '@/lib/treinos/saveTreino';

const VAULT_ROOT = 'content://test/vault';

const sessaoBase: TreinoSessao = {
  tipo: 'treino_sessao',
  data: '2026-04-23T18:00:00-03:00',
  autor: 'pessoa_a',
  rotina: 'Rotina A',
  duracao_min: 28,
  exercicios: [{ nome: 'supino', series: 3, reps: 8, carga_kg: 4 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEscreverTreino.mockResolvedValue({
    uri: 'content://test/vault/treinos/2026-04-23-rotina-a.md',
    rel: 'treinos/2026-04-23-rotina-a.md',
  });
});

describe('saveTreino', () => {
  it('deriva slug da rotina por padrao', async () => {
    const out = await saveTreino({ meta: sessaoBase, vaultRoot: VAULT_ROOT });
    expect(out.slug).toBe('rotina-a');
    expect(mockEscreverTreino).toHaveBeenCalledWith(
      VAULT_ROOT,
      'rotina-a',
      sessaoBase,
      ''
    );
  });

  it('respeita slugOverride quando fornecido', async () => {
    const out = await saveTreino({
      meta: sessaoBase,
      vaultRoot: VAULT_ROOT,
      slugOverride: 'custom-slug',
    });
    expect(out.slug).toBe('custom-slug');
    expect(mockEscreverTreino).toHaveBeenCalledWith(
      VAULT_ROOT,
      'custom-slug',
      sessaoBase,
      ''
    );
  });

  it('rejeita meta invalido antes de tocar I/O', async () => {
    await expect(
      saveTreino({
        meta: { ...sessaoBase, duracao_min: 0 },
        vaultRoot: VAULT_ROOT,
      })
    ).rejects.toThrow(/treino invalido/);
    expect(mockEscreverTreino).not.toHaveBeenCalled();
  });

  it('preserva body livre', async () => {
    await saveTreino({
      meta: sessaoBase,
      body: 'sessao boa.',
      vaultRoot: VAULT_ROOT,
    });
    expect(mockEscreverTreino).toHaveBeenCalledWith(
      VAULT_ROOT,
      'rotina-a',
      sessaoBase,
      'sessao boa.'
    );
  });

  it('fallback "treino" quando rotina ausente', async () => {
    const sessao = { ...sessaoBase, rotina: undefined };
    const out = await saveTreino({ meta: sessao, vaultRoot: VAULT_ROOT });
    expect(out.slug).toBe('treino');
  });

  // R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG: o writer canonico precisa
  // propagar rotina_slug do meta para escreverTreino sem perda.
  it('propaga rotina_slug presente no meta para escreverTreino', async () => {
    const sessao: TreinoSessao = {
      ...sessaoBase,
      rotina_slug: 'rotina-a',
    };
    await saveTreino({ meta: sessao, vaultRoot: VAULT_ROOT });
    expect(mockEscreverTreino).toHaveBeenCalledWith(
      VAULT_ROOT,
      'rotina-a',
      expect.objectContaining({ rotina_slug: 'rotina-a' }),
      ''
    );
  });
});
