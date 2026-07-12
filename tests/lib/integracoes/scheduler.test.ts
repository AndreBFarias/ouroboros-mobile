// Testes do orquestrador puro `orquestrarIntegracoes`.
// R-INT-2-CALENDAR-SYNC-EVENTOS (2026-05-25).
//
// Estrategia: scheduler e' puro (sem store, sem rede). Injetamos
// Integracao fakes (jest.fn) para validar:
//
//   1. Multiplas integracoes OK -> totalNovos agregado, sem erro.
//   2. 1 integracao com erro string -> agregado preserva, outras seguem.
//   3. Integracao lancando excecao -> tratada como erro (allSettled),
//      nao derruba as outras.
//   4. Ordem do array preservada no resultado.
//   5. Array vazio -> resultado vazio, nao crasha.
//
// Comentarios sem acento (convencao shell/CI).

import {
  orquestrarIntegracoes,
  type Integracao,
} from '@/lib/integracoes/scheduler';

function fakeIntegracao(
  nome: string,
  resultado: { novos: number; erro: string | null } | Error
): Integracao {
  const sincronizar = jest.fn(async () => {
    if (resultado instanceof Error) throw resultado;
    return resultado;
  });
  return { nome, sincronizar };
}

describe('orquestrarIntegracoes', () => {
  it('multiplas integracoes OK: agrega novos e sem erro', async () => {
    const a = fakeIntegracao('google_calendar', { novos: 5, erro: null });
    const b = fakeIntegracao('spotify', { novos: 2, erro: null });

    const res = await orquestrarIntegracoes([a, b]);

    expect(res.integracoes).toHaveLength(2);
    expect(
      res.integracoes.map((i) => i.novos).reduce((x, y) => x + y, 0)
    ).toBe(7);
    expect(res.integracoes.every((i) => i.erro === null)).toBe(true);
    expect(typeof res.rodadoEm).toBe('string');
  });

  it('1 integracao com erro string: preserva e nao derruba as outras', async () => {
    const a = fakeIntegracao('google_calendar', { novos: 3, erro: null });
    const b = fakeIntegracao('spotify', { novos: 0, erro: 'rede' });

    const res = await orquestrarIntegracoes([a, b]);

    const cal = res.integracoes.find((i) => i.nome === 'google_calendar');
    const spo = res.integracoes.find((i) => i.nome === 'spotify');
    expect(cal?.erro).toBeNull();
    expect(cal?.novos).toBe(3);
    expect(spo?.erro).toBe('rede');
  });

  it('integracao que lanca excecao e tratada como erro (allSettled)', async () => {
    const a = fakeIntegracao('google_calendar', new Error('boom'));
    const b = fakeIntegracao('spotify', { novos: 4, erro: null });

    const res = await orquestrarIntegracoes([a, b]);

    const cal = res.integracoes.find((i) => i.nome === 'google_calendar');
    const spo = res.integracoes.find((i) => i.nome === 'spotify');
    expect(cal?.erro).toBe('boom');
    expect(cal?.novos).toBe(0);
    // A outra integracao completou normalmente.
    expect(spo?.erro).toBeNull();
    expect(spo?.novos).toBe(4);
  });

  it('preserva a ordem do array de entrada', async () => {
    const a = fakeIntegracao('um', { novos: 1, erro: null });
    const b = fakeIntegracao('dois', { novos: 1, erro: null });
    const c = fakeIntegracao('tres', { novos: 1, erro: null });

    const res = await orquestrarIntegracoes([a, b, c]);

    expect(res.integracoes.map((i) => i.nome)).toEqual(['um', 'dois', 'tres']);
  });

  it('array vazio: resultado vazio sem crash', async () => {
    const res = await orquestrarIntegracoes([]);
    expect(res.integracoes).toEqual([]);
    expect(typeof res.rodadoEm).toBe('string');
  });
});
