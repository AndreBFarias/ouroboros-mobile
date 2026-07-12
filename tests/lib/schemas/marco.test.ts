// Testes do MarcoSchema. Cobre caminho feliz, manual vs auto,
// origem opcional, hash truncado em 12 chars, defaults.
import { MarcoSchema, MarcoOrigemSchema } from '@/lib/schemas/marco';

const baseMarco = {
  tipo: 'marco',
  data: '2026-04-23T20:15:00-03:00',
  autor: 'pessoa_a',
  descricao: 'Tres treinos nesta semana.',
  tags: ['treino', 'consistencia'],
};

describe('MarcoSchema', () => {
  it('aceita marco manual completo', () => {
    const out = MarcoSchema.parse(baseMarco);
    expect(out.descricao).toBe('Tres treinos nesta semana.');
    expect(out.auto).toBe(false); // default
  });

  it('aplica default tags = [] quando ausente', () => {
    const sem = {
      tipo: 'marco',
      data: '2026-04-23T20:15:00-03:00',
      autor: 'pessoa_a',
      descricao: 'algo.',
    };
    const out = MarcoSchema.parse(sem);
    expect(out.tags).toEqual([]);
  });

  it('aceita auto=true com origem backend', () => {
    const m = {
      ...baseMarco,
      auto: true,
      origem: 'backend',
      hash: 'abcdef123456',
    };
    const out = MarcoSchema.parse(m);
    expect(out.auto).toBe(true);
    expect(out.origem).toBe('backend');
    expect(out.hash).toBe('abcdef123456');
  });

  it('aceita auto=true com origem client', () => {
    const m = {
      ...baseMarco,
      auto: true,
      origem: 'client',
      hash: '0123456789ab',
    };
    expect(MarcoSchema.parse(m).origem).toBe('client');
  });

  it('rejeita hash com tamanho diferente de 12 chars', () => {
    expect(() => MarcoSchema.parse({ ...baseMarco, hash: 'abc123' })).toThrow();
    expect(() =>
      MarcoSchema.parse({ ...baseMarco, hash: 'abc1234567890' })
    ).toThrow();
  });

  it('rejeita descricao vazia', () => {
    expect(() => MarcoSchema.parse({ ...baseMarco, descricao: '' })).toThrow();
  });

  it('rejeita autor "ambos"', () => {
    expect(() => MarcoSchema.parse({ ...baseMarco, autor: 'ambos' })).toThrow();
  });

  it('rejeita origem invalida', () => {
    expect(() =>
      MarcoSchema.parse({ ...baseMarco, auto: true, origem: 'qualquer' })
    ).toThrow();
  });
});

describe('MarcoSchema campo para (M33)', () => {
  it('default {tipo:"mim"} quando campo omitido (compat .md v1)', () => {
    const out = MarcoSchema.parse(baseMarco);
    expect(out.para).toEqual({ tipo: 'mim' });
  });

  it('aceita para mim explicito', () => {
    const out = MarcoSchema.parse({
      ...baseMarco,
      para: { tipo: 'mim' },
    });
    expect(out.para).toEqual({ tipo: 'mim' });
  });

  it('aceita para outra pessoa (pessoa_a)', () => {
    const out = MarcoSchema.parse({
      ...baseMarco,
      para: { tipo: 'outra', pessoa: 'pessoa_a' },
    });
    expect(out.para).toEqual({ tipo: 'outra', pessoa: 'pessoa_a' });
  });

  it('aceita para o casal', () => {
    const out = MarcoSchema.parse({
      ...baseMarco,
      para: { tipo: 'casal' },
    });
    expect(out.para).toEqual({ tipo: 'casal' });
  });

  it('rejeita tipo invalido em para', () => {
    expect(() =>
      MarcoSchema.parse({
        ...baseMarco,
        para: { tipo: 'parceiro' },
      })
    ).toThrow();
  });

  it('rejeita outra sem pessoa', () => {
    expect(() =>
      MarcoSchema.parse({
        ...baseMarco,
        para: { tipo: 'outra' },
      })
    ).toThrow();
  });
});

describe('MarcoSchema campo medidaRef (M11.4)', () => {
  it('aceita marco sem medidaRef (default omisso)', () => {
    const out = MarcoSchema.parse(baseMarco);
    expect(out.medidaRef).toBeUndefined();
  });

  it('aceita medidaRef em formato YYYY-MM-DD', () => {
    const out = MarcoSchema.parse({ ...baseMarco, medidaRef: '2026-04-15' });
    expect(out.medidaRef).toBe('2026-04-15');
  });

  it('rejeita medidaRef em formato invalido', () => {
    expect(() =>
      MarcoSchema.parse({ ...baseMarco, medidaRef: '2026/04/15' })
    ).toThrow();
    expect(() =>
      MarcoSchema.parse({ ...baseMarco, medidaRef: 'abril-2026' })
    ).toThrow();
  });
});

describe('MarcoOrigemSchema', () => {
  it('aceita "backend" e "client"', () => {
    expect(MarcoOrigemSchema.parse('backend')).toBe('backend');
    expect(MarcoOrigemSchema.parse('client')).toBe('client');
  });

  it('rejeita outros valores', () => {
    expect(() => MarcoOrigemSchema.parse('manual')).toThrow();
  });
});
