// Testes do helper puro ymdMenosDias do modulo canonico de dia-local.
// R-AUDIT-DATAS (2026-07-12). Cobre subtracao simples, virada de mes,
// virada de ano e identidade (dias=0). Ancorado em meia-noite UTC, e
// imune a DST (mesmo truque de diasEntre.ts/parseYmdUtc).
//
// Comentarios sem acento (convencao shell/CI).

import {
  ymdMenosDias,
  isoComOffsetLocal,
  dataLocalYmd,
} from '@/lib/datetime/local';

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

// AUDIT-P2-8: o padrao `toISOString().replace('Z','-03:00')` estava
// espalhado pelo projeto e produz string que MENTE -- mantem os digitos de
// UTC e troca so o rotulo do fuso, adiantando o horario em 3 horas. Em
// rotina_marcacao isso jogava a marcacao das ultimas 3 horas do dia no dia
// seguinte, e a aderencia exibida na tela zerava.
describe('isoComOffsetLocal', () => {
  it('converte o instante para a hora local, nao so troca o rotulo', () => {
    // 02:30Z do dia 05 = 23:30 do dia 04 em Sao Paulo.
    const d = new Date('2026-09-05T02:30:00Z');
    expect(isoComOffsetLocal(d)).toBe('2026-09-04T23:30:00-03:00');
    // O padrao antigo devolveria o dia errado:
    expect(d.toISOString().replace('Z', '-03:00')).toContain('2026-09-05');
  });

  it('o dia local derivado bate com dataLocalYmd', () => {
    const d = new Date('2026-09-05T02:30:00Z');
    expect(isoComOffsetLocal(d).slice(0, 10)).toBe(dataLocalYmd(d));
  });

  it('meio-dia local nao muda de dia', () => {
    const d = new Date('2026-09-05T15:00:00Z'); // 12:00 em Sao Paulo
    expect(isoComOffsetLocal(d)).toBe('2026-09-05T12:00:00-03:00');
  });
});
