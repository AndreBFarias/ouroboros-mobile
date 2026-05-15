// Tests do reader financas-cache (M14). Cobre cache valido, ausente
// (SAF lanca), schema desconhecido (schema_version 2) e JSON
// malformado.
const mockReadAsString = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    readAsStringAsync: (...args: unknown[]) => mockReadAsString(...args),
  },
}));

import { lerFinancasCache } from '@/lib/cache/financas-cache';

const CACHE_VALIDO = {
  schema_version: 1,
  gerado_em: '2026-05-01T22:18:40-03:00',
  periodo_referencia: '2026-04-27 a 2026-05-03',
  gasto_semana: 873.45,
  gasto_semana_anterior: 921.1,
  delta_textual: 'abaixo da media',
  top_categorias: [{ nome: 'Mercado', valor: 326.19, percentual: 0.37 }],
  ultimas_transacoes: [
    {
      data: '2026-05-01',
      autor: 'pessoa_a',
      tipo: 'despesa',
      valor: 57.86,
      destino: 'compras online',
      categoria: 'Compras Online',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('lerFinancasCache', () => {
  it('retorna ok com cache parseado quando o JSON e valido', async () => {
    mockReadAsString.mockResolvedValueOnce(JSON.stringify(CACHE_VALIDO));
    const r = await lerFinancasCache('content://test/financas.json');
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') {
      expect(r.cache.schema_version).toBe(1);
      expect(r.cache.gasto_semana).toBeCloseTo(873.45);
      expect(r.cache.ultimas_transacoes).toHaveLength(1);
    }
  });

  it('retorna ausente quando SAF lanca (arquivo inexistente)', async () => {
    mockReadAsString.mockRejectedValueOnce(new Error('not found'));
    const r = await lerFinancasCache('content://test/financas.json');
    expect(r.tipo).toBe('ausente');
  });

  it('retorna erro quando schema_version e diferente de 1', async () => {
    mockReadAsString.mockResolvedValueOnce(
      JSON.stringify({ ...CACHE_VALIDO, schema_version: 2 })
    );
    const r = await lerFinancasCache('content://test/financas.json');
    expect(r.tipo).toBe('erro');
    if (r.tipo === 'erro') {
      expect(r.mensagem.toLowerCase()).toContain('schema');
    }
  });

  it('retorna erro quando o JSON esta malformado', async () => {
    mockReadAsString.mockResolvedValueOnce('{ this is not json');
    const r = await lerFinancasCache('content://test/financas.json');
    expect(r.tipo).toBe('erro');
    if (r.tipo === 'erro') {
      expect(r.mensagem.toLowerCase()).toContain('json');
    }
  });

  it('retorna erro quando tipo de transacao e invalido', async () => {
    const invalido = {
      ...CACHE_VALIDO,
      ultimas_transacoes: [
        { ...CACHE_VALIDO.ultimas_transacoes[0], tipo: 'transferencia' },
      ],
    };
    mockReadAsString.mockResolvedValueOnce(JSON.stringify(invalido));
    const r = await lerFinancasCache('content://test/financas.json');
    expect(r.tipo).toBe('erro');
  });
});
