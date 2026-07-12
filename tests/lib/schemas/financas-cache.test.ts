// Tests do schema FinancasCache (M14). Cobre validacao positiva
// (fixture canonica do desktop), rejeicao de schema_version
// desconhecido, transacao com tipo invalido, top_categorias vazio
// (aceito) e percentual fora de [0,1].
import {
  FinancasCacheSchema,
  FinancasTransacaoSchema,
  FinancasTopCategoriaSchema,
} from '@/lib/schemas/financas-cache';

const CACHE_VALIDO = {
  schema_version: 1,
  gerado_em: '2026-05-01T22:18:40-03:00',
  periodo_referencia: '2026-04-27 a 2026-05-03',
  gasto_semana: 873.45,
  gasto_semana_anterior: 921.1,
  delta_textual: 'abaixo da media',
  top_categorias: [
    { nome: 'Mercado', valor: 326.19, percentual: 0.37 },
    { nome: 'Delivery', valor: 158.79, percentual: 0.18 },
  ],
  ultimas_transacoes: [
    {
      data: '2026-05-01',
      autor: 'pessoa_a',
      tipo: 'despesa',
      valor: 57.86,
      destino: 'compras online',
      categoria: 'Compras Online',
    },
    {
      data: '2026-04-30',
      autor: 'pessoa_b',
      tipo: 'credito',
      valor: 12.5,
      destino: 'estorno cashback',
      categoria: 'Estorno',
    },
  ],
};

describe('FinancasCacheSchema valida', () => {
  it('aceita o cache canonico de exemplo', () => {
    const r = FinancasCacheSchema.safeParse(CACHE_VALIDO);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.schema_version).toBe(1);
      expect(r.data.top_categorias).toHaveLength(2);
      expect(r.data.ultimas_transacoes).toHaveLength(2);
    }
  });

  it('aceita top_categorias vazio (semana sem gasto)', () => {
    const r = FinancasCacheSchema.safeParse({
      ...CACHE_VALIDO,
      top_categorias: [],
      gasto_semana: 0,
    });
    expect(r.success).toBe(true);
  });

  it('aceita transacao tipo credito', () => {
    const r = FinancasTransacaoSchema.safeParse(
      CACHE_VALIDO.ultimas_transacoes[1]
    );
    expect(r.success).toBe(true);
  });
});

describe('FinancasCacheSchema rejeita', () => {
  it('schema_version diferente de 1', () => {
    const r = FinancasCacheSchema.safeParse({
      ...CACHE_VALIDO,
      schema_version: 2,
    });
    expect(r.success).toBe(false);
  });

  it('tipo de transacao desconhecido', () => {
    const r = FinancasTransacaoSchema.safeParse({
      ...CACHE_VALIDO.ultimas_transacoes[0],
      tipo: 'transferencia',
    });
    expect(r.success).toBe(false);
  });

  it('percentual de categoria fora de [0,1]', () => {
    const r = FinancasTopCategoriaSchema.safeParse({
      nome: 'Mercado',
      valor: 100,
      percentual: 1.5,
    });
    expect(r.success).toBe(false);
  });

  it('autor diferente de pessoa_a/pessoa_b', () => {
    const r = FinancasTransacaoSchema.safeParse({
      ...CACHE_VALIDO.ultimas_transacoes[0],
      autor: 'ambos',
    });
    expect(r.success).toBe(false);
  });

  it('data fora do formato YYYY-MM-DD', () => {
    const r = FinancasTransacaoSchema.safeParse({
      ...CACHE_VALIDO.ultimas_transacoes[0],
      data: '01/05/2026',
    });
    expect(r.success).toBe(false);
  });
});
