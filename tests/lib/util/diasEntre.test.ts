// Testes da funcao pura diasEntre (M18). Cobertura inclui Date e
// string YYYY-MM-DD, fronteira de meia-noite, datas iguais, ordem
// invertida e ano bissexto.
//
// Comentarios sem acento (convencao shell/CI).
import { diasEntre } from '@/lib/util/diasEntre';

describe('diasEntre', () => {
  it('retorna 0 quando datas sao iguais', () => {
    const a = new Date('2026-04-29T10:00:00Z');
    const b = new Date('2026-04-29T20:00:00Z');
    expect(diasEntre(a, b)).toBe(0);
  });

  it('retorna 1 quando b e o dia seguinte de a (UTC)', () => {
    const a = new Date('2026-04-28T10:00:00Z');
    const b = new Date('2026-04-29T10:00:00Z');
    expect(diasEntre(a, b)).toBe(1);
  });

  it('retorna 28 entre 04-01 e 04-29', () => {
    const a = new Date('2026-04-01T00:00:00Z');
    const b = new Date('2026-04-29T00:00:00Z');
    expect(diasEntre(a, b)).toBe(28);
  });

  it('retorna negativo quando a > b', () => {
    const a = new Date('2026-04-30T00:00:00Z');
    const b = new Date('2026-04-29T00:00:00Z');
    expect(diasEntre(a, b)).toBe(-1);
  });

  it('aceita string YYYY-MM-DD', () => {
    expect(diasEntre('2026-04-01', '2026-04-29')).toBe(28);
  });

  it('aceita mistura Date + string', () => {
    const b = new Date('2026-04-29T00:00:00Z');
    expect(diasEntre('2026-04-01', b)).toBe(28);
  });

  it('reset as 23:59 ainda conta como dia 0 (mesmo dia UTC)', () => {
    const a = new Date('2026-04-29T23:59:00Z');
    const b = new Date('2026-04-29T23:59:30Z');
    expect(diasEntre(a, b)).toBe(0);
  });

  it('atravessa meia-noite UTC corretamente', () => {
    const a = new Date('2026-04-29T23:59:00Z');
    const b = new Date('2026-04-30T00:01:00Z');
    expect(diasEntre(a, b)).toBe(1);
  });

  it('atravessa virada de mes', () => {
    expect(diasEntre('2026-04-30', '2026-05-01')).toBe(1);
  });

  it('atravessa virada de ano', () => {
    expect(diasEntre('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('considera ano bissexto (29 dias em fevereiro 2024)', () => {
    expect(diasEntre('2024-02-01', '2024-03-01')).toBe(29);
  });

  it('considera ano nao-bissexto (28 dias em fevereiro 2026)', () => {
    expect(diasEntre('2026-02-01', '2026-03-01')).toBe(28);
  });

  it('rejeita string mal-formatada', () => {
    expect(() => diasEntre('abc', '2026-04-29')).toThrow(/data invalida/);
    expect(() => diasEntre('2026-04-29', '2026/04/30')).toThrow(/data invalida/);
  });

  it('cobre periodo de 365 dias', () => {
    expect(diasEntre('2025-01-01', '2026-01-01')).toBe(365);
  });
});
