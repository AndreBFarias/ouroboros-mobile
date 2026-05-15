import { z } from 'zod';
import {
  parseFrontmatter,
  stringifyFrontmatter,
} from '@/lib/vault/frontmatter';

const FixtureSchema = z.object({
  tipo: z.string(),
  autor: z.enum(['pessoa_a', 'pessoa_b']),
  valor: z.number().int(),
});

describe('parseFrontmatter', () => {
  it('parseia bloco YAML e devolve corpo apos o segundo ---', () => {
    const raw = `---\ntipo: nota\nautor: pessoa_a\nvalor: 7\n---\n\ncorpo livre.\n`;
    const out = parseFrontmatter(raw, FixtureSchema);
    expect(out.meta).toEqual({ tipo: 'nota', autor: 'pessoa_a', valor: 7 });
    expect(out.body).toBe('corpo livre.\n');
  });

  it('aceita corpo vazio', () => {
    const raw = `---\ntipo: nota\nautor: pessoa_b\nvalor: 1\n---\n`;
    const out = parseFrontmatter(raw, FixtureSchema);
    expect(out.body).toBe('');
  });

  it('lanca quando frontmatter ausente', () => {
    expect(() => parseFrontmatter('sem frontmatter', FixtureSchema)).toThrow(
      /frontmatter ausente/
    );
  });

  it('lanca quando schema falha', () => {
    const raw = `---\ntipo: nota\nautor: andre\nvalor: 1\n---\n`;
    expect(() => parseFrontmatter(raw, FixtureSchema)).toThrow();
  });

  it('lanca em yaml sintaticamente invalido', () => {
    const raw = `---\n: : : invalido\n---\n`;
    expect(() => parseFrontmatter(raw, FixtureSchema)).toThrow();
  });
});

describe('stringifyFrontmatter', () => {
  it('gera ---/yaml/--- com corpo', () => {
    const out = stringifyFrontmatter(
      { tipo: 'nota', autor: 'pessoa_a', valor: 7 },
      'corpo livre.'
    );
    expect(out.startsWith('---\n')).toBe(true);
    expect(out).toContain('tipo: nota');
    expect(out).toContain('autor: pessoa_a');
    expect(out).toContain('valor: 7');
    expect(out.trimEnd().endsWith('corpo livre.')).toBe(true);
  });

  it('gera apenas frontmatter quando body vazio', () => {
    const out = stringifyFrontmatter(
      { tipo: 'nota', autor: 'pessoa_a', valor: 1 },
      ''
    );
    expect(out).toMatch(/^---\n[\s\S]*\n---\n$/);
  });
});

describe('round-trip parse + stringify', () => {
  it('preserva dados', () => {
    const meta = { tipo: 'nota', autor: 'pessoa_a' as const, valor: 42 };
    const body = 'um corpo qualquer\nem duas linhas.';
    const raw = stringifyFrontmatter(meta, body);
    const parsed = parseFrontmatter(raw, FixtureSchema);
    expect(parsed.meta).toEqual(meta);
    expect(parsed.body.trim()).toBe(body.trim());
  });
});
