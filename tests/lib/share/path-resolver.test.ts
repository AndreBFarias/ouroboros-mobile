// Tests do path-resolver do share intent receiver (M08).
// Funcoes puras: resolverDestino, aplicarSufixoNumerico,
// pathMdCompanion. Verificam categorizacao, formatacao timestamp em
// UTC-3 e comportamento de conflito.
import {
  resolverDestino,
  aplicarSufixoNumerico,
  pathMdCompanion,
} from '@/lib/share/path-resolver';

describe('resolverDestino', () => {
  // 2026-04-30 12:30:45 UTC = 09:30:45 em UTC-3 (Sao Paulo).
  const FIXED_DATE = new Date('2026-04-30T12:30:45.000Z');

  it('PIX + pdf -> inbox/financeiro/pix/<ts>.pdf', () => {
    const out = resolverDestino({
      subtipo: 'pix',
      mimeType: 'application/pdf',
      agora: FIXED_DATE,
    });
    expect(out).toBe('inbox/financeiro/pix/2026-04-30-093045.pdf');
  });

  it('Extrato + pdf -> inbox/financeiro/extrato/<ts>.pdf', () => {
    const out = resolverDestino({
      subtipo: 'extrato',
      mimeType: 'application/pdf',
      agora: FIXED_DATE,
    });
    expect(out).toBe('inbox/financeiro/extrato/2026-04-30-093045.pdf');
  });

  it('Nota + image/jpeg -> inbox/financeiro/nota/<ts>.jpg', () => {
    const out = resolverDestino({
      subtipo: 'nota',
      mimeType: 'image/jpeg',
      agora: FIXED_DATE,
    });
    expect(out).toBe('inbox/financeiro/nota/2026-04-30-093045.jpg');
  });

  it('Exame + pdf -> inbox/saude/exame/<ts>.pdf', () => {
    const out = resolverDestino({
      subtipo: 'exame',
      mimeType: 'application/pdf',
      agora: FIXED_DATE,
    });
    expect(out).toBe('inbox/saude/exame/2026-04-30-093045.pdf');
  });

  it('Receita + image/png -> inbox/saude/receita/<ts>.png', () => {
    const out = resolverDestino({
      subtipo: 'receita',
      mimeType: 'image/png',
      agora: FIXED_DATE,
    });
    expect(out).toBe('inbox/saude/receita/2026-04-30-093045.png');
  });

  it('Garantia + pdf -> inbox/casa/garantia/<ts>.pdf', () => {
    const out = resolverDestino({
      subtipo: 'garantia',
      mimeType: 'application/pdf',
      agora: FIXED_DATE,
    });
    expect(out).toBe('inbox/casa/garantia/2026-04-30-093045.pdf');
  });

  it('Contrato + pdf -> inbox/casa/contrato/<ts>.pdf', () => {
    const out = resolverDestino({
      subtipo: 'contrato',
      mimeType: 'application/pdf',
      agora: FIXED_DATE,
    });
    expect(out).toBe('inbox/casa/contrato/2026-04-30-093045.pdf');
  });

  it('Outro + mime desconhecido -> inbox/outros/<ts> (sem ext)', () => {
    const out = resolverDestino({
      subtipo: 'outro',
      mimeType: 'application/octet-stream',
      agora: FIXED_DATE,
    });
    expect(out).toBe('inbox/outros/2026-04-30-093045');
  });

  it('respeita extensao do nome quando mime ambiguo', () => {
    const out = resolverDestino({
      subtipo: 'outro',
      mimeType: 'application/octet-stream',
      agora: FIXED_DATE,
      nome: 'arquivo.zip',
    });
    expect(out).toBe('inbox/outros/2026-04-30-093045.zip');
  });

  it('inclui slug saneado quando fornecido', () => {
    const out = resolverDestino({
      subtipo: 'pix',
      mimeType: 'application/pdf',
      agora: FIXED_DATE,
      slug: 'comprovante',
    });
    expect(out).toBe('inbox/financeiro/pix/2026-04-30-093045-comprovante.pdf');
  });

  it('saneia slug com caracteres invalidos', () => {
    const out = resolverDestino({
      subtipo: 'pix',
      mimeType: 'application/pdf',
      agora: FIXED_DATE,
      slug: 'Comprovante 123!',
    });
    expect(out).toBe(
      'inbox/financeiro/pix/2026-04-30-093045-comprovante-123.pdf'
    );
  });

  it('slug vazio nao adiciona separador', () => {
    const out = resolverDestino({
      subtipo: 'pix',
      mimeType: 'application/pdf',
      agora: FIXED_DATE,
      slug: '   ',
    });
    expect(out).toBe('inbox/financeiro/pix/2026-04-30-093045.pdf');
  });

  it('UTC-3 cruza meia-noite corretamente', () => {
    // 2026-05-01 02:30:00 UTC = 2026-04-30 23:30:00 em UTC-3
    const d = new Date('2026-05-01T02:30:00.000Z');
    const out = resolverDestino({
      subtipo: 'pix',
      mimeType: 'application/pdf',
      agora: d,
    });
    expect(out).toMatch(/^inbox\/financeiro\/pix\/2026-04-30-2330\d{2}\.pdf$/);
  });
});

describe('aplicarSufixoNumerico', () => {
  it('insere sufixo antes da extensao', () => {
    expect(
      aplicarSufixoNumerico('inbox/financeiro/pix/2026-04-30-093045.pdf', 1)
    ).toBe('inbox/financeiro/pix/2026-04-30-093045-1.pdf');
  });

  it('aceita numeros maiores', () => {
    expect(
      aplicarSufixoNumerico('inbox/financeiro/pix/2026-04-30-093045.pdf', 9)
    ).toBe('inbox/financeiro/pix/2026-04-30-093045-9.pdf');
  });

  it('quando nao ha extensao, sufixo vai no fim', () => {
    expect(aplicarSufixoNumerico('inbox/outros/2026-04-30-093045', 2)).toBe(
      'inbox/outros/2026-04-30-093045-2'
    );
  });

  it('n=0 nao altera', () => {
    expect(aplicarSufixoNumerico('a/b.pdf', 0)).toBe('a/b.pdf');
  });

  it('aceita timestamps grandes (fallback de unicidade absoluta)', () => {
    const r = aplicarSufixoNumerico('a/b.pdf', 1735689600000);
    expect(r).toBe('a/b-1735689600000.pdf');
  });
});

describe('pathMdCompanion', () => {
  it('substitui extensao por .md', () => {
    expect(pathMdCompanion('inbox/financeiro/pix/2026-04-30-093045.pdf')).toBe(
      'inbox/financeiro/pix/2026-04-30-093045.md'
    );
    expect(pathMdCompanion('inbox/saude/exame/foto.jpg')).toBe(
      'inbox/saude/exame/foto.md'
    );
  });

  it('quando sem extensao, append .md', () => {
    expect(pathMdCompanion('inbox/outros/sem-ext')).toBe(
      'inbox/outros/sem-ext.md'
    );
  });

  it('preserva slug e timestamp', () => {
    expect(
      pathMdCompanion('inbox/financeiro/pix/2026-04-30-093045-comprovante.pdf')
    ).toBe('inbox/financeiro/pix/2026-04-30-093045-comprovante.md');
  });
});
