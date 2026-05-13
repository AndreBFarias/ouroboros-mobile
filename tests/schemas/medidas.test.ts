// Testes do MedidasSchema. Cobre caminho feliz, defaults, autores
// invalidos, limites superiores, todos os campos opcionais.
import {
  MedidasSchema,
  MEDIDAS_CAMPOS,
  MEDIDAS_LABELS,
} from '@/lib/schemas/medidas';

const baseMedida = {
  tipo: 'medidas',
  data: '2026-04-28',
  autor: 'pessoa_a',
  peso: 78.4,
  gordura: 18.5,
  cintura: 84.0,
  peito: 102.0,
  braco_esq: 33.0,
  braco_dir: 33.5,
  coxa_esq: 56.0,
  coxa_dir: 56.5,
  barriga: 89.0,
  quadril: 96.0,
  fotos: [
    'assets/m-2026-04-28-frente.jpg',
    'assets/m-2026-04-28-costas.jpg',
  ],
  reflexao: 'Dorso sentindo melhor depois das semanas de cardio.',
};

describe('MedidasSchema', () => {
  it('aceita registro completo com 10 medidas (Q17.c.d incluiu gordura)', () => {
    const out = MedidasSchema.parse(baseMedida);
    expect(out.peso).toBe(78.4);
    expect(out.gordura).toBe(18.5);
    expect(out.cintura).toBe(84.0);
    expect(out.fotos).toHaveLength(2);
    expect(out.reflexao).toContain('Dorso');
  });

  it('aceita registro minimo (so peso, sem fotos, sem reflexao)', () => {
    const out = MedidasSchema.parse({
      tipo: 'medidas',
      data: '2026-04-28',
      autor: 'pessoa_b',
      peso: 65.5,
    });
    expect(out.peso).toBe(65.5);
    expect(out.cintura).toBeUndefined();
    expect(out.fotos).toEqual([]);
    expect(out.reflexao).toBeUndefined();
  });

  it('aceita registro sem nenhuma medida (so foto)', () => {
    const out = MedidasSchema.parse({
      tipo: 'medidas',
      data: '2026-04-28',
      autor: 'pessoa_a',
      fotos: ['assets/m-2026-04-28-frente.jpg'],
    });
    expect(out.peso).toBeUndefined();
    expect(out.fotos).toHaveLength(1);
  });

  it('rejeita data fora do formato YYYY-MM-DD', () => {
    expect(() =>
      MedidasSchema.parse({ ...baseMedida, data: '28/04/2026' })
    ).toThrow();
  });

  it('rejeita data com hora (medidas sao snapshot diario)', () => {
    expect(() =>
      MedidasSchema.parse({
        ...baseMedida,
        data: '2026-04-28T10:00:00-03:00',
      })
    ).toThrow();
  });

  it('rejeita autor ambos', () => {
    expect(() =>
      MedidasSchema.parse({ ...baseMedida, autor: 'ambos' })
    ).toThrow();
  });

  it('rejeita peso negativo', () => {
    expect(() =>
      MedidasSchema.parse({ ...baseMedida, peso: -5 })
    ).toThrow();
  });

  it('rejeita peso zero', () => {
    expect(() =>
      MedidasSchema.parse({ ...baseMedida, peso: 0 })
    ).toThrow();
  });

  it('rejeita medida acima do limite defensivo de 500', () => {
    expect(() =>
      MedidasSchema.parse({ ...baseMedida, peso: 780 })
    ).toThrow();
  });

  it('aceita registro sem gordura (Q17.c.d optional)', () => {
    const { gordura: _omit, ...semGordura } = baseMedida;
    const out = MedidasSchema.parse(semGordura);
    expect(out.gordura).toBeUndefined();
  });

  it('rejeita gordura acima de 100% (Q17.c.d)', () => {
    expect(() =>
      MedidasSchema.parse({ ...baseMedida, gordura: 105 })
    ).toThrow();
  });

  it('rejeita gordura negativa (Q17.c.d)', () => {
    expect(() =>
      MedidasSchema.parse({ ...baseMedida, gordura: -2 })
    ).toThrow();
  });

  it('aceita gordura 0 (Q17.c.d nonnegative)', () => {
    const out = MedidasSchema.parse({ ...baseMedida, gordura: 0 });
    expect(out.gordura).toBe(0);
  });

  it('aceita decimais comuns (78,4 kg)', () => {
    const out = MedidasSchema.parse({
      ...baseMedida,
      peso: 78.4,
      cintura: 84.5,
    });
    expect(out.peso).toBe(78.4);
    expect(out.cintura).toBe(84.5);
  });

  it('rejeita tipo diferente de medidas', () => {
    expect(() =>
      MedidasSchema.parse({ ...baseMedida, tipo: 'humor' })
    ).toThrow();
  });

  it('aceita fotos vazio por default', () => {
    const out = MedidasSchema.parse({
      tipo: 'medidas',
      data: '2026-04-28',
      autor: 'pessoa_a',
      peso: 70,
    });
    expect(out.fotos).toEqual([]);
  });
});

describe('MEDIDAS_CAMPOS', () => {
  it('expoe os 10 campos canonicos na ordem esperada (Q17.c.d adicionou gordura apos peso)', () => {
    expect(MEDIDAS_CAMPOS).toEqual([
      'peso',
      'gordura',
      'cintura',
      'peito',
      'braco_esq',
      'braco_dir',
      'coxa_esq',
      'coxa_dir',
      'barriga',
      'quadril',
    ]);
  });
});

describe('MEDIDAS_LABELS', () => {
  it('peso usa unidade kg', () => {
    expect(MEDIDAS_LABELS.peso).toEqual({ label: 'Peso', unidade: 'kg' });
  });

  it('cintura usa unidade cm', () => {
    expect(MEDIDAS_LABELS.cintura.unidade).toBe('cm');
  });

  it('gordura usa unidade % com label PT-BR (Q17.c.d)', () => {
    expect(MEDIDAS_LABELS.gordura).toEqual({
      label: 'Gordura corporal',
      unidade: '%',
    });
  });

  it('todos os 10 campos tem label PT-BR com acentuacao quando aplicavel', () => {
    expect(MEDIDAS_LABELS.braco_esq.label).toBe('Braço esquerdo');
    expect(MEDIDAS_LABELS.braco_dir.label).toBe('Braço direito');
    expect(MEDIDAS_LABELS.coxa_esq.label).toBe('Coxa esquerda');
    expect(MEDIDAS_LABELS.coxa_dir.label).toBe('Coxa direita');
  });

  it('cobre todos os 10 campos sem omissoes', () => {
    for (const campo of MEDIDAS_CAMPOS) {
      expect(MEDIDAS_LABELS[campo]).toBeDefined();
      expect(MEDIDAS_LABELS[campo].label.length).toBeGreaterThan(0);
    }
  });
});
