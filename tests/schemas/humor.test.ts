import { HumorSchema } from '@/lib/schemas/humor';

const baseHumor = {
  tipo: 'humor',
  data: '2026-04-29',
  autor: 'pessoa_a',
  humor: 4,
  energia: 3,
  ansiedade: 2,
  foco: 4,
};

describe('HumorSchema', () => {
  it('aceita registro minimo', () => {
    const out = HumorSchema.parse(baseHumor);
    expect(out.tags).toEqual([]);
  });

  it('aceita campos opcionais e tags', () => {
    const out = HumorSchema.parse({
      ...baseHumor,
      medicacao: 'Fluoxetina 20mg',
      horas_sono: 7,
      tags: ['exercicio', 'boa_conversa'],
      frase: 'dia denso mas terminei tranquilo.',
    });
    expect(out.tags).toEqual(['exercicio', 'boa_conversa']);
    expect(out.medicacao).toBe('Fluoxetina 20mg');
    expect(out.horas_sono).toBe(7);
  });

  it('rejeita medicacao como boolean (campo agora eh texto)', () => {
    expect(() =>
      HumorSchema.parse({ ...baseHumor, medicacao: true })
    ).toThrow();
  });

  it('rejeita medicacao string vazia (use undefined para omitir)', () => {
    expect(() =>
      HumorSchema.parse({ ...baseHumor, medicacao: '' })
    ).toThrow();
  });

  it('rejeita autor ambos (so autor escreve)', () => {
    expect(() => HumorSchema.parse({ ...baseHumor, autor: 'ambos' })).toThrow();
  });

  it('rejeita humor fora de 1-5', () => {
    expect(() => HumorSchema.parse({ ...baseHumor, humor: 0 })).toThrow();
    expect(() => HumorSchema.parse({ ...baseHumor, humor: 6 })).toThrow();
  });

  it('rejeita data em formato invalido', () => {
    expect(() => HumorSchema.parse({ ...baseHumor, data: '29/04/2026' })).toThrow();
  });

  it('rejeita sem autor', () => {
    const semAutor: Omit<typeof baseHumor, 'autor'> & { autor?: string } = {
      ...baseHumor,
    };
    delete semAutor.autor;
    expect(() => HumorSchema.parse(semAutor)).toThrow();
  });

  it('rejeita tipo diferente de humor', () => {
    expect(() => HumorSchema.parse({ ...baseHumor, tipo: 'evento' })).toThrow();
  });
});
