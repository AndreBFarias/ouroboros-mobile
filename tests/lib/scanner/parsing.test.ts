// Testes das heuristicas regex do scanner OCR. Cobre casos canonicos
// de recibos brasileiros (R$ + virgula decimal, ponto milhar) e o
// fallback 'outro' para categorias sem palavra-chave.
import {
  extrairValor,
  extrairData,
  extrairCategoria,
} from '@/lib/scanner/parsing';

describe('extrairValor', () => {
  it('detecta valor com R$ e virgula decimal', () => {
    expect(extrairValor('Total: R$ 87,40')).toBe(87.4);
  });

  it('detecta valor sem R$ usando ponto decimal', () => {
    expect(extrairValor('total 87.40 reais')).toBe(87.4);
  });

  it('detecta valor com milhar e virgula decimal', () => {
    expect(extrairValor('R$ 1.234,56')).toBe(1234.56);
  });
});

describe('extrairData', () => {
  it('detecta data BR DD/MM/YYYY', () => {
    expect(extrairData('emitido em 28/04/2026')).toBe('2026-04-28');
  });

  it('detecta data ISO YYYY-MM-DD', () => {
    expect(extrairData('data: 2026-04-28 14:30')).toBe('2026-04-28');
  });

  it('detecta data DD-MM-YYYY com hifen', () => {
    expect(extrairData('em 28-04-2026, sexta')).toBe('2026-04-28');
  });
});

describe('extrairCategoria', () => {
  it('classifica mercado e farmacia (acento normalizado)', () => {
    expect(extrairCategoria('Supermercado Pao de Acucar')).toBe('mercado');
    expect(extrairCategoria('Farmácia Pacheco')).toBe('farmacia');
  });

  it('classifica transporte por palavra-chave', () => {
    expect(extrairCategoria('Posto Shell - gasolina comum')).toBe('transporte');
  });

  it('cai no fallback outro quando nao casa nada', () => {
    expect(extrairCategoria('texto sem categoria conhecida')).toBe('outro');
  });
});
