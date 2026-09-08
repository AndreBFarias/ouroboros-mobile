// Testes do saveTreino. Mocka escreverTreino para isolar a logica de
// derivacao de slug e validacao defensiva.
//
// EXE-1 (2026-09-08): `slugOverride` virou `relOverride` (path relativo
// inteiro). Os asserts passaram a afirmar o quinto argumento de
// escreverTreino, que e' onde o override viaja.
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
    uri: 'content://test/vault/treinos/2026-04-23-1800-rotina-a.md',
    rel: 'treinos/2026-04-23-1800-rotina-a.md',
  });
});

describe('saveTreino', () => {
  it('deriva slug da rotina por padrao e nao passa relOverride', async () => {
    const out = await saveTreino({ meta: sessaoBase, vaultRoot: VAULT_ROOT });
    expect(out.slug).toBe('rotina-a');
    // Sem override, o `rel` e' o derivado pelo escreverTreino.
    expect(out.rel).toBe('treinos/2026-04-23-1800-rotina-a.md');
    expect(mockEscreverTreino).toHaveBeenCalledWith(
      VAULT_ROOT,
      'rotina-a',
      sessaoBase,
      '',
      undefined
    );
  });

  // EXE-1 AC-5: relOverride presente faz escreverTreino receber
  // exatamente aquele rel.
  it('repassa relOverride para escreverTreino quando fornecido', async () => {
    const REL = 'treinos/2026-04-23-0712-rotina-a.md';
    mockEscreverTreino.mockResolvedValueOnce({
      uri: `content://test/vault/${REL}`,
      rel: REL,
    });
    const out = await saveTreino({
      meta: sessaoBase,
      vaultRoot: VAULT_ROOT,
      relOverride: REL,
    });
    expect(out.rel).toBe(REL);
    // O slug continua derivado da rotina (o override e' do path).
    expect(out.slug).toBe('rotina-a');
    expect(mockEscreverTreino).toHaveBeenCalledWith(
      VAULT_ROOT,
      'rotina-a',
      sessaoBase,
      '',
      { relOverride: REL }
    );
  });

  // Edicao de arquivo em formato legado, ainda nao migrado: o save
  // reescreve onde ele esta, nao cria um segundo no formato novo.
  it('aceita relOverride em formato legado sem hora', async () => {
    const REL = 'treinos/2026-04-23-rotina-a.md';
    mockEscreverTreino.mockResolvedValueOnce({
      uri: `content://test/vault/${REL}`,
      rel: REL,
    });
    const out = await saveTreino({
      meta: { ...sessaoBase, rotina: 'Rotina renomeada' },
      vaultRoot: VAULT_ROOT,
      relOverride: REL,
    });
    expect(out.rel).toBe(REL);
    expect(mockEscreverTreino).toHaveBeenCalledWith(
      VAULT_ROOT,
      'rotina-renomeada',
      expect.objectContaining({ rotina: 'Rotina renomeada' }),
      '',
      { relOverride: REL }
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
      'sessao boa.',
      undefined
    );
  });

  // EXE-1 AC-5: o caso do fallback afirma o REL completo, nao so o
  // slug. Antes desta sprint o teste parava no slug, e por isso nao
  // enxergava que tres sessoes livres do mesmo dia colapsavam num
  // arquivo so'.
  it('fallback "treino" quando rotina ausente, com rel completo', async () => {
    const REL_ESPERADO = 'treinos/2026-04-23-1800-treino.md';
    mockEscreverTreino.mockImplementationOnce(async () => ({
      uri: `content://test/vault/${REL_ESPERADO}`,
      rel: REL_ESPERADO,
    }));
    const sessao = { ...sessaoBase, rotina: undefined };
    const out = await saveTreino({ meta: sessao, vaultRoot: VAULT_ROOT });
    expect(out.slug).toBe('treino');
    expect(out.rel).toBe(REL_ESPERADO);
    expect(mockEscreverTreino).toHaveBeenCalledWith(
      VAULT_ROOT,
      'treino',
      sessao,
      '',
      undefined
    );
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
      '',
      undefined
    );
  });
});
