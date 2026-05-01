// Testes do ContadorSchema (M18). Cobre caminho feliz, regex de
// data, regex de criado_em, slug, recorde, resets e helpers.
//
// Comentarios sem acento (convencao shell/CI).
import {
  ContadorSchema,
  slugifyTitulo,
  sufixoRandom,
} from '@/lib/schemas/contador';

const baseContador = {
  tipo: 'contador',
  slug: 'sem-cigarro',
  titulo: 'Sem cigarro',
  inicio: '2026-04-01',
  recorde: 0,
  resets: [],
  criado_em: '2026-02-04T14:00:00-03:00',
};

describe('ContadorSchema', () => {
  it('aceita contador novo completo', () => {
    const out = ContadorSchema.parse(baseContador);
    expect(out.titulo).toBe('Sem cigarro');
    expect(out.recorde).toBe(0);
    expect(out.resets).toEqual([]);
  });

  it('aceita contador com historico de resets', () => {
    const c = {
      ...baseContador,
      recorde: 28,
      resets: [
        '2026-03-04T10:30:00-03:00',
        '2026-04-01T08:00:00-03:00',
      ],
      inicio: '2026-04-01',
    };
    const out = ContadorSchema.parse(c);
    expect(out.recorde).toBe(28);
    expect(out.resets).toHaveLength(2);
  });

  it('default recorde 0 quando ausente', () => {
    const { recorde, ...semRecorde } = baseContador;
    void recorde;
    const out = ContadorSchema.parse(semRecorde);
    expect(out.recorde).toBe(0);
  });

  it('default resets [] quando ausente', () => {
    const { resets, ...semResets } = baseContador;
    void resets;
    const out = ContadorSchema.parse(semResets);
    expect(out.resets).toEqual([]);
  });

  it('rejeita recorde negativo', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, recorde: -1 })
    ).toThrow();
  });

  it('rejeita recorde nao-inteiro', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, recorde: 3.5 })
    ).toThrow();
  });

  it('rejeita slug com maiusculas', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, slug: 'Sem-Cigarro' })
    ).toThrow();
  });

  it('rejeita slug com espaco', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, slug: 'sem cigarro' })
    ).toThrow();
  });

  it('rejeita slug vazio', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, slug: '' })
    ).toThrow();
  });

  it('rejeita inicio fora do formato YYYY-MM-DD', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, inicio: '01/04/2026' })
    ).toThrow();
    expect(() =>
      ContadorSchema.parse({ ...baseContador, inicio: '2026-4-1' })
    ).toThrow();
  });

  it('rejeita reset sem offset', () => {
    expect(() =>
      ContadorSchema.parse({
        ...baseContador,
        resets: ['2026-04-01 10:00:00'],
      })
    ).toThrow();
  });

  it('aceita reset em UTC com Z', () => {
    const out = ContadorSchema.parse({
      ...baseContador,
      resets: ['2026-04-01T13:00:00Z'],
    });
    expect(out.resets[0]).toBe('2026-04-01T13:00:00Z');
  });

  it('rejeita titulo vazio', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, titulo: '' })
    ).toThrow();
  });

  it('rejeita titulo > 80 chars', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, titulo: 'a'.repeat(81) })
    ).toThrow();
  });

  it('rejeita tipo diferente de "contador"', () => {
    expect(() =>
      ContadorSchema.parse({ ...baseContador, tipo: 'humor' })
    ).toThrow();
  });
});

describe('slugifyTitulo (contador)', () => {
  it('remove acentos e troca espacos por hifen', () => {
    expect(slugifyTitulo('Sem açúcar')).toBe('sem-acucar');
  });

  it('remove caracteres especiais', () => {
    expect(slugifyTitulo('Sem álcool / fumo!')).toBe('sem-alcool-fumo');
  });

  it('colapsa hifens consecutivos', () => {
    expect(slugifyTitulo('a   b')).toBe('a-b');
  });

  it('retorna fallback "contador" para titulo so com simbolos', () => {
    expect(slugifyTitulo('!!!')).toBe('contador');
  });

  it('limita a 64 chars', () => {
    const longo = 'a '.repeat(80);
    const out = slugifyTitulo(longo);
    expect(out.length).toBeLessThanOrEqual(64);
  });

  it('trata maiusculas', () => {
    expect(slugifyTitulo('SEM CIGARRO')).toBe('sem-cigarro');
  });
});

describe('sufixoRandom (contador)', () => {
  it('gera 4 chars [a-z0-9]', () => {
    const s = sufixoRandom();
    expect(s).toMatch(/^[a-z0-9]{4}$/);
  });

  it('valores variam entre chamadas', () => {
    const conjunto = new Set<string>();
    for (let i = 0; i < 5; i++) conjunto.add(sufixoRandom());
    expect(conjunto.size).toBeGreaterThanOrEqual(2);
  });
});
