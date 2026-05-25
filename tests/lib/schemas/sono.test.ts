// Testes do SonoSchema (validacao zod do schema de sessao de sono).
// R-INT-3-HC-AUTOPULL-SLEEP.
//
// Comentarios sem acento.
import { SonoSchema } from '@/lib/schemas/sono';

const VALIDO = {
  tipo: 'sono' as const,
  data: '2026-05-22',
  autor: 'pessoa_a' as const,
  inicio: '2026-05-21T23:15:00-03:00',
  fim: '2026-05-22T07:32:00-03:00',
  duracao_min: 497,
  fonte_hc_id: 'a1b2c3d4-0000',
  fonte_hc_origin: 'com.samsung.health',
};

describe('SonoSchema', () => {
  it('aceita um registro de sono valido completo', () => {
    const r = SonoSchema.safeParse(VALIDO);
    expect(r.success).toBe(true);
  });

  it('aceita sem fonte_hc_id e fonte_hc_origin (opcionais)', () => {
    const { fonte_hc_id, fonte_hc_origin, ...semOrigem } = VALIDO;
    void fonte_hc_id;
    void fonte_hc_origin;
    const r = SonoSchema.safeParse(semOrigem);
    expect(r.success).toBe(true);
  });

  it('aceita pessoa_b como autor', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, autor: 'pessoa_b' });
    expect(r.success).toBe(true);
  });

  it('rejeita autor ambos (so pessoa_a/pessoa_b)', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, autor: 'ambos' });
    expect(r.success).toBe(false);
  });

  it('rejeita tipo diferente de sono', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, tipo: 'passos' });
    expect(r.success).toBe(false);
  });

  it('rejeita data fora do padrao YYYY-MM-DD', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, data: '22/05/2026' });
    expect(r.success).toBe(false);
  });

  it('rejeita inicio sem offset ISO', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, inicio: '2026-05-21 23:15' });
    expect(r.success).toBe(false);
  });

  it('aceita inicio/fim em Z (UTC)', () => {
    const r = SonoSchema.safeParse({
      ...VALIDO,
      inicio: '2026-05-22T02:15:00Z',
      fim: '2026-05-22T10:32:00Z',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita duracao_min zero', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, duracao_min: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita duracao_min negativa', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, duracao_min: -10 });
    expect(r.success).toBe(false);
  });

  it('rejeita duracao_min nao inteira', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, duracao_min: 497.5 });
    expect(r.success).toBe(false);
  });

  it('rejeita duracao_min acima do teto de 24h', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, duracao_min: 1441 });
    expect(r.success).toBe(false);
  });

  it('aceita duracao_min no teto exato (1440)', () => {
    const r = SonoSchema.safeParse({ ...VALIDO, duracao_min: 1440 });
    expect(r.success).toBe(true);
  });
});
