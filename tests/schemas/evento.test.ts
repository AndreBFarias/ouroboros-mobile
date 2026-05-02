import { EventoSchema } from '@/lib/schemas/evento';

const baseEvento = {
  tipo: 'evento',
  data: '2026-04-29T10:30:00-03:00',
  autor: 'pessoa_a',
  modo: 'positivo',
  intensidade: 4,
  // M07.x: positivo exige ao menos uma midia. Foto stub para passar
  // o refine; testes especificos do refine ficam logo abaixo.
  midia: [{ tipo: 'foto', path: 'assets/2026-04-29-1030-stub.jpg' }],
};

describe('EventoSchema', () => {
  it('aceita evento minimo positivo', () => {
    const out = EventoSchema.parse(baseEvento);
    expect(out.modo).toBe('positivo');
    expect(out.com).toEqual([]);
    expect(out.fotos).toEqual([]);
  });

  it('aceita evento negativo com lugar e bairro', () => {
    const out = EventoSchema.parse({
      ...baseEvento,
      modo: 'negativo',
      lugar: 'padaria do bairro',
      bairro: 'bela vista',
      com: ['pessoa_b'],
      categoria: 'rolezinho',
      fotos: ['./assets/2026-04-29-cafe.jpg'],
    });
    expect(out.modo).toBe('negativo');
    expect(out.lugar).toBe('padaria do bairro');
    expect(out.com).toEqual(['pessoa_b']);
    expect(out.fotos).toHaveLength(1);
  });

  it('rejeita modo invalido', () => {
    expect(() =>
      EventoSchema.parse({ ...baseEvento, modo: 'neutro' })
    ).toThrow();
  });

  it('rejeita autor ambos', () => {
    expect(() =>
      EventoSchema.parse({ ...baseEvento, autor: 'ambos' })
    ).toThrow();
  });

  it('rejeita intensidade fora de 1-5', () => {
    expect(() =>
      EventoSchema.parse({ ...baseEvento, intensidade: 6 })
    ).toThrow();
  });

  it('aceita com com pessoa_a, pessoa_b e ambos', () => {
    const out = EventoSchema.parse({
      ...baseEvento,
      com: ['pessoa_a', 'pessoa_b', 'ambos'],
    });
    expect(out.com).toHaveLength(3);
  });

  // M07.x: refine de midia obrigatoria em modo positivo.
  it('rejeita positivo sem midia', () => {
    expect(() =>
      EventoSchema.parse({ ...baseEvento, midia: [] })
    ).toThrow(/positivo exige pelo menos uma midia/);
  });

  it('aceita negativo sem midia', () => {
    const out = EventoSchema.parse({
      ...baseEvento,
      modo: 'negativo',
      midia: [],
    });
    expect(out.midia).toEqual([]);
  });
});
