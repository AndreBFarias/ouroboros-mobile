// Tests do schema HumorHeatmapCache (M10). Cobre validacao positiva
// (fixture do cache real do desktop), rejeicao de schema_version
// desconhecido, humor fora do intervalo 1-5 e autor desconhecido.
import {
  HumorHeatmapCacheSchema,
  HumorHeatmapCellSchema,
} from '@/lib/schemas/humor_heatmap_cache';

const CACHE_VALIDO = {
  schema_version: 1,
  gerado_em: '2026-05-01T22:18:39-03:00',
  periodo_dias: 90,
  pessoas: ['pessoa_a', 'pessoa_b'],
  celulas: [
    {
      data: '2026-04-29',
      autor: 'pessoa_a',
      humor: 4,
      energia: 3,
      ansiedade: 2,
      foco: 4,
    },
  ],
  estatisticas: {
    pessoa_a: {
      media_humor_30d: 4.0,
      registros_30d: 1,
      registros_total: 1,
    },
    pessoa_b: {
      media_humor_30d: 0.0,
      registros_30d: 0,
      registros_total: 0,
    },
  },
};

describe('HumorHeatmapCacheSchema valida', () => {
  it('aceita o cache canonico de exemplo', () => {
    const r = HumorHeatmapCacheSchema.safeParse(CACHE_VALIDO);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.schema_version).toBe(1);
      expect(r.data.celulas).toHaveLength(1);
      expect(r.data.estatisticas.pessoa_a.registros_total).toBe(1);
    }
  });

  it('aceita celulas com tags e frase opcionais', () => {
    const cache = {
      ...CACHE_VALIDO,
      celulas: [
        {
          ...CACHE_VALIDO.celulas[0],
          tags: ['casa', 'estudo'],
          frase: 'Foi um dia bom.',
        },
      ],
    };
    const r = HumorHeatmapCacheSchema.safeParse(cache);
    expect(r.success).toBe(true);
  });
});

describe('HumorHeatmapCacheSchema rejeita', () => {
  it('schema_version diferente de 1', () => {
    const r = HumorHeatmapCacheSchema.safeParse({
      ...CACHE_VALIDO,
      schema_version: 2,
    });
    expect(r.success).toBe(false);
  });

  it('humor fora de 1..5', () => {
    const cache = {
      ...CACHE_VALIDO,
      celulas: [{ ...CACHE_VALIDO.celulas[0], humor: 6 }],
    };
    const r = HumorHeatmapCacheSchema.safeParse(cache);
    expect(r.success).toBe(false);
  });

  it('humor zero (sliders sao 1..5, nao 0)', () => {
    const r = HumorHeatmapCellSchema.safeParse({
      ...CACHE_VALIDO.celulas[0],
      humor: 0,
    });
    expect(r.success).toBe(false);
  });

  it('autor diferente de pessoa_a/pessoa_b', () => {
    const cache = {
      ...CACHE_VALIDO,
      celulas: [{ ...CACHE_VALIDO.celulas[0], autor: 'ambos' }],
    };
    const r = HumorHeatmapCacheSchema.safeParse(cache);
    expect(r.success).toBe(false);
  });

  it('data fora do formato YYYY-MM-DD', () => {
    const r = HumorHeatmapCellSchema.safeParse({
      ...CACHE_VALIDO.celulas[0],
      data: '29/04/2026',
    });
    expect(r.success).toBe(false);
  });

  it('falta o bloco estatisticas.pessoa_b', () => {
    const cache = {
      ...CACHE_VALIDO,
      estatisticas: { pessoa_a: CACHE_VALIDO.estatisticas.pessoa_a },
    };
    const r = HumorHeatmapCacheSchema.safeParse(cache);
    expect(r.success).toBe(false);
  });
});
