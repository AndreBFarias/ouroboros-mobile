// Tests do schema InboxArquivo (M08, share intent receiver). Cobre
// validacao positiva, defaults e rejeicoes esperadas.
import {
  InboxArquivoSchema,
  InboxArquivoSubtipoSchema,
} from '@/lib/schemas/inbox_arquivo';

describe('InboxArquivoSubtipoSchema', () => {
  it('aceita os 8 subtipos canonicos', () => {
    const validos = [
      'pix',
      'extrato',
      'nota',
      'exame',
      'receita',
      'garantia',
      'contrato',
      'outro',
    ];
    for (const s of validos) {
      expect(InboxArquivoSubtipoSchema.safeParse(s).success).toBe(true);
    }
  });

  it('rejeita string fora do enum', () => {
    expect(InboxArquivoSubtipoSchema.safeParse('boleto').success).toBe(false);
    expect(InboxArquivoSubtipoSchema.safeParse('').success).toBe(false);
  });
});

describe('InboxArquivoSchema valida', () => {
  const baseValido = {
    tipo: 'inbox_arquivo' as const,
    subtipo: 'pix',
    data: '2026-04-30T09:30:45-03:00',
    autor: 'pessoa_a',
    arquivo: 'inbox/financeiro/pix/2026-04-30-093045.pdf',
    mime_type: 'application/pdf',
    tamanho_bytes: 12345,
    origem: 'com.nu.production',
    revisar: true,
  };

  it('aceita objeto canonico', () => {
    const r = InboxArquivoSchema.safeParse(baseValido);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.subtipo).toBe('pix');
      expect(r.data.revisar).toBe(true);
    }
  });

  it('aplica default revisar=true quando ausente', () => {
    const semRevisar = { ...baseValido };
    delete (semRevisar as { revisar?: boolean }).revisar;
    const r = InboxArquivoSchema.safeParse(semRevisar);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.revisar).toBe(true);
    }
  });

  it('aceita origem null (intent emissor desconhecido)', () => {
    const r = InboxArquivoSchema.safeParse({
      ...baseValido,
      origem: null,
    });
    expect(r.success).toBe(true);
  });

  it('aceita tamanho 0 (SAF nao expoe size)', () => {
    const r = InboxArquivoSchema.safeParse({
      ...baseValido,
      tamanho_bytes: 0,
    });
    expect(r.success).toBe(true);
  });
});

describe('InboxArquivoSchema rejeita', () => {
  const baseValido = {
    tipo: 'inbox_arquivo' as const,
    subtipo: 'pix',
    data: '2026-04-30T09:30:45-03:00',
    autor: 'pessoa_a',
    arquivo: 'inbox/financeiro/pix/2026-04-30-093045.pdf',
    mime_type: 'application/pdf',
    tamanho_bytes: 12345,
    origem: 'com.nu.production',
    revisar: true,
  };

  it('tipo errado', () => {
    expect(
      InboxArquivoSchema.safeParse({ ...baseValido, tipo: 'evento' }).success
    ).toBe(false);
  });

  it('subtipo invalido', () => {
    expect(
      InboxArquivoSchema.safeParse({ ...baseValido, subtipo: 'boleto' }).success
    ).toBe(false);
  });

  it('autor ambos (so pessoa_a/b)', () => {
    expect(
      InboxArquivoSchema.safeParse({ ...baseValido, autor: 'ambos' }).success
    ).toBe(false);
  });

  it('data fora de ISO 8601', () => {
    expect(
      InboxArquivoSchema.safeParse({
        ...baseValido,
        data: 'ontem 9h',
      }).success
    ).toBe(false);
  });

  it('arquivo string vazia', () => {
    expect(
      InboxArquivoSchema.safeParse({ ...baseValido, arquivo: '' }).success
    ).toBe(false);
  });

  it('tamanho negativo', () => {
    expect(
      InboxArquivoSchema.safeParse({
        ...baseValido,
        tamanho_bytes: -1,
      }).success
    ).toBe(false);
  });

  it('mime vazio', () => {
    expect(
      InboxArquivoSchema.safeParse({ ...baseValido, mime_type: '' }).success
    ).toBe(false);
  });
});
