// Tests do reader humor-heatmap (M10). Cobre cache valido, ausente
// (SAF lanca), schema desconhecido (schema_version 2) e JSON
// malformado.
const mockReadAsString = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    readAsStringAsync: (...args: unknown[]) => mockReadAsString(...args),
  },
}));

import { lerHumorHeatmap } from '@/lib/cache/humor-heatmap';

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
    pessoa_a: { media_humor_30d: 4.0, registros_30d: 1, registros_total: 1 },
    pessoa_b: { media_humor_30d: 0.0, registros_30d: 0, registros_total: 0 },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('lerHumorHeatmap', () => {
  it('retorna ok com cache parseado quando o JSON e valido', async () => {
    mockReadAsString.mockResolvedValueOnce(JSON.stringify(CACHE_VALIDO));
    const r = await lerHumorHeatmap('content://test/cache.json');
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') {
      expect(r.cache.schema_version).toBe(1);
      expect(r.cache.celulas).toHaveLength(1);
    }
  });

  it('retorna ausente quando SAF lanca (arquivo inexistente)', async () => {
    mockReadAsString.mockRejectedValueOnce(new Error('not found'));
    const r = await lerHumorHeatmap('content://test/cache.json');
    expect(r.tipo).toBe('ausente');
  });

  it('retorna erro quando schema_version e diferente de 1', async () => {
    mockReadAsString.mockResolvedValueOnce(
      JSON.stringify({ ...CACHE_VALIDO, schema_version: 2 })
    );
    const r = await lerHumorHeatmap('content://test/cache.json');
    expect(r.tipo).toBe('erro');
    if (r.tipo === 'erro') {
      expect(r.mensagem.toLowerCase()).toContain('schema');
    }
  });

  it('retorna erro quando o JSON esta malformado', async () => {
    mockReadAsString.mockResolvedValueOnce('{ this is not json');
    const r = await lerHumorHeatmap('content://test/cache.json');
    expect(r.tipo).toBe('erro');
    if (r.tipo === 'erro') {
      expect(r.mensagem.toLowerCase()).toContain('json');
    }
  });

  it('retorna erro quando humor e invalido', async () => {
    const invalido = {
      ...CACHE_VALIDO,
      celulas: [{ ...CACHE_VALIDO.celulas[0], humor: 99 }],
    };
    mockReadAsString.mockResolvedValueOnce(JSON.stringify(invalido));
    const r = await lerHumorHeatmap('content://test/cache.json');
    expect(r.tipo).toBe('erro');
  });
});
