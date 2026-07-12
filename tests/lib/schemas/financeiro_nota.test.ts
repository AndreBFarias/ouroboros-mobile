// Tests do schema FinanceiroNota (M09, scanner OCR). Cobre validacao
// completa, falha quando imagem ausente, range de ocr_confianca e
// default de revisar.
import { FinanceiroNotaSchema } from '@/lib/schemas/financeiro_nota';

const META_VALIDA = {
  tipo: 'financeiro' as const,
  subtipo: 'nota' as const,
  data: '2026-04-28T14:30',
  autor: 'pessoa_a' as const,
  valor: 87.4,
  descricao: 'Mercado Pao de Acucar',
  categoria: 'mercado' as const,
  imagem: 'assets/2026-04-28-1430-nota.jpg',
  ocr_confianca: 0.92,
  revisar: false,
};

describe('FinanceiroNotaSchema', () => {
  it('aceita meta valido completo', () => {
    const r = FinanceiroNotaSchema.safeParse(META_VALIDA);
    expect(r.success).toBe(true);
  });

  it('rejeita quando imagem esta ausente', () => {
    const semImagem = { ...META_VALIDA, imagem: undefined };
    const r = FinanceiroNotaSchema.safeParse(semImagem);
    expect(r.success).toBe(false);
  });

  it('rejeita ocr_confianca fora do intervalo [0,1]', () => {
    const acima = { ...META_VALIDA, ocr_confianca: 1.5 };
    expect(FinanceiroNotaSchema.safeParse(acima).success).toBe(false);
  });

  it('aplica default revisar=false e rejeita subtipo nao-nota', () => {
    const semRevisar: Record<string, unknown> = { ...META_VALIDA };
    delete semRevisar.revisar;
    const r = FinanceiroNotaSchema.safeParse(semRevisar);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.revisar).toBe(false);
    }
    const subErrado = { ...META_VALIDA, subtipo: 'pix' };
    expect(FinanceiroNotaSchema.safeParse(subErrado).success).toBe(false);
  });
});
