import { DiarioEmocionalSchema } from '@/lib/schemas/diario_emocional';

const baseTrigger = {
  tipo: 'diario_emocional',
  data: '2026-04-29T19:15:00-03:00',
  autor: 'pessoa_a',
  modo: 'trigger',
  emocoes: ['tristeza', 'frustracao'],
  intensidade: 4,
  com: ['pessoa_b'],
  texto: 'discussao sobre dinheiro.',
};

const baseSucesso = {
  tipo: 'diario_emocional',
  data: '2026-04-29T20:00:00-03:00',
  autor: 'pessoa_a',
  // modo vitoria = anonimato-allow: superacao
  modo: 'vitoria',
  emocoes: ['alegria', 'gratidao'],
  intensidade: 4,
  com: [],
  texto: 'consegui terminar o que comecei.',
};

describe('DiarioEmocionalSchema modo trigger', () => {
  it('aceita registro com estrategia e funcionou', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseTrigger,
      estrategia: 'respirei fundo.',
      funcionou: true,
    });
    expect(out.modo).toBe('trigger');
    expect(out.funcionou).toBe(true);
  });

  it('aceita sem estrategia/funcionou', () => {
    expect(() => DiarioEmocionalSchema.parse(baseTrigger)).not.toThrow();
  });

  it('rejeita intensidade fora de 1-5', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, intensidade: 0 })
    ).toThrow();
  });
});

describe('DiarioEmocionalSchema modo vitoria', () => {
  it('aceita sem funcionou', () => {
    const out = DiarioEmocionalSchema.parse(baseSucesso);
    // anonimato-allow: substantivo comum 'vitoria'
    expect(out.modo).toBe('vitoria');
    expect(out.funcionou).toBeUndefined();
  });

  it('rejeita funcionou em modo vitoria', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseSucesso, funcionou: true })
    ).toThrow(/funcionou so pode ser definido em modo trigger/);
  });
});

describe('DiarioEmocionalSchema validacoes gerais', () => {
  it('rejeita autor ambos', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, autor: 'ambos' })
    ).toThrow();
  });

  it('rejeita data sem hora', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, data: '2026-04-29' })
    ).toThrow();
  });

  it('aceita audio null e undefined', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, audio: null })
    ).not.toThrow();
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, audio: undefined })
    ).not.toThrow();
  });
});
