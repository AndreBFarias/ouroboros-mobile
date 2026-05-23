// Testes do PassosSchema. Foco em validacao de shape, formato de
// data, range numerico e literal fonte_hc.
import { PassosSchema } from '@/lib/schemas/passos';

const valido = {
  tipo: 'passos' as const,
  data: '2026-05-21',
  autor: 'pessoa_a' as const,
  total: 8472,
  fonte_hc: true as const,
  sincronizado_em: '2026-05-22T20:30:00-03:00',
};

describe('PassosSchema', () => {
  it('aceita registro minimo valido', () => {
    const out = PassosSchema.safeParse(valido);
    expect(out.success).toBe(true);
  });

  it('rejeita data fora do padrao YYYY-MM-DD', () => {
    const out = PassosSchema.safeParse({ ...valido, data: '21-05-2026' });
    expect(out.success).toBe(false);
  });

  it('rejeita total negativo', () => {
    const out = PassosSchema.safeParse({ ...valido, total: -1 });
    expect(out.success).toBe(false);
  });

  it('rejeita total nao-inteiro', () => {
    const out = PassosSchema.safeParse({ ...valido, total: 1234.5 });
    expect(out.success).toBe(false);
  });

  it('rejeita total acima do teto defensivo 200000', () => {
    const out = PassosSchema.safeParse({ ...valido, total: 200_001 });
    expect(out.success).toBe(false);
  });

  it('aceita total zero (dia sem passos registrados)', () => {
    const out = PassosSchema.safeParse({ ...valido, total: 0 });
    expect(out.success).toBe(true);
  });

  it('rejeita fonte_hc false (literal true)', () => {
    const out = PassosSchema.safeParse({ ...valido, fonte_hc: false });
    expect(out.success).toBe(false);
  });

  it('rejeita autor ambos', () => {
    const out = PassosSchema.safeParse({ ...valido, autor: 'ambos' });
    expect(out.success).toBe(false);
  });

  it('rejeita sincronizado_em sem offset', () => {
    const out = PassosSchema.safeParse({
      ...valido,
      sincronizado_em: '2026-05-22T20:30:00',
    });
    expect(out.success).toBe(false);
  });

  it('aceita sincronizado_em com Z (UTC)', () => {
    const out = PassosSchema.safeParse({
      ...valido,
      sincronizado_em: '2026-05-22T23:30:00.000Z',
    });
    expect(out.success).toBe(true);
  });
});
