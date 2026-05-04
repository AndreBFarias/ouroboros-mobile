// M34: testes do serializador stringifyCompanionMidia + slugDeFrase.
// Cobre tipos foto/audio/video/frase, todos os estados de Para
// (mim/casal/outra), legenda opcional, slug ASCII de frase e o body
// dedicado do tipo midia_frase.
import {
  slugDeFrase,
  stringifyCompanionMidia,
} from '@/lib/midia/companion';

describe('stringifyCompanionMidia (M34)', () => {
  it('serializa midia_foto com Para mim sem legenda', () => {
    const md = stringifyCompanionMidia({
      tipo: 'midia_foto',
      arquivo: '2026-05-04-abcd.jpg',
      data: '2026-05-04T12:00:00.000Z',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
    });
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('tipo: midia_foto');
    expect(md).toContain('arquivo: 2026-05-04-abcd.jpg');
    expect(md).toContain('data: 2026-05-04T12:00:00.000Z');
    expect(md).toContain('autor: pessoa_a');
    expect(md).toContain('para: mim');
    expect(md).not.toContain('legenda:');
    expect(md.endsWith('\n')).toBe(true);
  });

  it('serializa midia_audio com Para casal e legenda', () => {
    const md = stringifyCompanionMidia({
      tipo: 'midia_audio',
      arquivo: '2026-05-04-1200.m4a',
      data: '2026-05-04T15:00:00.000Z',
      autor: 'pessoa_b',
      para: { tipo: 'casal' },
      legenda: 'música do dia',
    });
    expect(md).toContain('tipo: midia_audio');
    expect(md).toContain('autor: pessoa_b');
    expect(md).toContain('para: casal');
    expect(md).toContain('legenda: "música do dia"');
  });

  it('serializa midia_video com Para outra:pessoa_a', () => {
    const md = stringifyCompanionMidia({
      tipo: 'midia_video',
      arquivo: '2026-05-04-zzzz.mp4',
      data: '2026-05-04T18:00:00.000Z',
      autor: 'pessoa_b',
      para: { tipo: 'outra', pessoa: 'pessoa_a' },
    });
    expect(md).toContain('tipo: midia_video');
    expect(md).toContain('para: outra:pessoa_a');
  });

  it('escapa aspas duplas dentro da legenda', () => {
    const md = stringifyCompanionMidia({
      tipo: 'midia_foto',
      arquivo: 'x.jpg',
      data: '2026-05-04T00:00:00.000Z',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
      legenda: 'ela disse "oi"',
    });
    expect(md).toContain('legenda: "ela disse \\"oi\\""');
  });

  it('em midia_frase replica o texto no body apos o frontmatter', () => {
    const md = stringifyCompanionMidia({
      tipo: 'midia_frase',
      arquivo: '2026-05-04-tudo-bem.md',
      data: '2026-05-04T20:00:00.000Z',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
      legenda: 'tudo bem comigo hoje',
    });
    // Apos o segundo --- deve haver linha em branco e a frase.
    const partes = md.split('---\n');
    // Layout: ['', frontmatter+'---\n', '\n<body>\n']
    expect(partes.length).toBeGreaterThanOrEqual(3);
    expect(partes[2]).toContain('tudo bem comigo hoje');
  });
});

describe('slugDeFrase (M34)', () => {
  it('converte para kebab-case ASCII removendo acentos', () => {
    expect(slugDeFrase('Tudo bem comigo hoje')).toBe('tudo-bem-comigo-hoje');
    expect(slugDeFrase('Não é um dia ruim')).toBe('nao-e-um-dia-ruim');
    expect(slugDeFrase('  espaços  multiplos  ')).toBe('espacos-multiplos');
  });

  it('limita a 32 chars sem quebrar palavra com hifen final', () => {
    const longa = 'esta e uma frase bem longa para testar limite';
    const slug = slugDeFrase(longa);
    expect(slug.length).toBeLessThanOrEqual(32);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('fallback fixo para frase vazia', () => {
    expect(slugDeFrase('')).toBe('frase');
    expect(slugDeFrase('!!!')).toBe('frase');
  });
});
