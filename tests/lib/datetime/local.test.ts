// Testes do helper puro ymdMenosDias do modulo canonico de dia-local.
// R-AUDIT-DATAS (2026-07-12). Cobre subtracao simples, virada de mes,
// virada de ano e identidade (dias=0). Ancorado em meia-noite UTC, e
// imune a DST (mesmo truque de diasEntre.ts/parseYmdUtc).
//
// Comentarios sem acento (convencao shell/CI).

import { ymdMenosDias } from '@/lib/datetime/local';

describe('ymdMenosDias', () => {
  it('subtrai 1 dia dentro do mesmo mes', () => {
    expect(ymdMenosDias('2026-07-10', 1)).toBe('2026-07-09');
  });

  it('subtrai 6 dias (janela de 7 dias, i=6)', () => {
    expect(ymdMenosDias('2026-07-10', 6)).toBe('2026-07-04');
  });

  it('vira o mes corretamente (01/07 -1 = 30/06)', () => {
    expect(ymdMenosDias('2026-07-01', 1)).toBe('2026-06-30');
  });

  it('vira o ano corretamente (01/01 -1 = 31/12 do ano anterior)', () => {
    expect(ymdMenosDias('2026-01-01', 1)).toBe('2025-12-31');
  });

  it('dias=0 e identidade', () => {
    expect(ymdMenosDias('2026-07-10', 0)).toBe('2026-07-10');
  });

  it('atravessa mes bissexto (01/03/2028 -1 = 29/02/2028)', () => {
    expect(ymdMenosDias('2028-03-01', 1)).toBe('2028-02-29');
  });
});
