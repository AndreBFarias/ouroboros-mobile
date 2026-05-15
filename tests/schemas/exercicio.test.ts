// Testes do ExercicioSchema. Cobre caminho feliz, defaults, slug
// invalido, gif ausente, historico vazio, niveis canonicos.
import {
  ExercicioSchema,
  NivelExercicioSchema,
  HistoricoExecucaoSchema,
} from '@/lib/schemas/exercicio';

const baseExercicio = {
  tipo: 'exercicio',
  slug: 'agachamento-livre',
  nome: 'Agachamento livre',
  grupo_muscular: ['pernas', 'core'],
  nivel: 'intermediario',
  equipamento: 'barra',
  instrucao:
    'Posicione a barra sobre os ombros, desca ate as coxas ficarem paralelas ao chao e suba.',
  dicas: ['Mantenha o tronco ereto', 'Olhar a frente'],
  gif: 'agachamento-livre.gif',
  historico: [],
};

describe('ExercicioSchema', () => {
  it('aceita exercicio completo valido', () => {
    const out = ExercicioSchema.parse(baseExercicio);
    expect(out.slug).toBe('agachamento-livre');
    expect(out.grupo_muscular).toEqual(['pernas', 'core']);
    expect(out.nivel).toBe('intermediario');
    expect(out.dicas).toHaveLength(2);
  });

  it('aceita exercicio minimo (sem dicas, sem historico, sem gif)', () => {
    const out = ExercicioSchema.parse({
      tipo: 'exercicio',
      slug: 'flexao',
      nome: 'Flexão de braços',
      grupo_muscular: ['peito', 'triceps'],
      nivel: 'iniciante',
      equipamento: 'peso corporal',
      instrucao:
        'Apoie as maos no chao na largura dos ombros e flexione os bracos.',
    });
    expect(out.dicas).toEqual([]);
    expect(out.gif).toBe('');
    expect(out.historico).toEqual([]);
  });

  it('rejeita slug com underscore', () => {
    expect(() =>
      ExercicioSchema.parse({ ...baseExercicio, slug: 'agachamento_livre' })
    ).toThrow();
  });

  it('rejeita slug com espaco', () => {
    expect(() =>
      ExercicioSchema.parse({ ...baseExercicio, slug: 'agachamento livre' })
    ).toThrow();
  });

  it('rejeita slug com letra maiuscula', () => {
    expect(() =>
      ExercicioSchema.parse({ ...baseExercicio, slug: 'Agachamento' })
    ).toThrow();
  });

  it('rejeita slug com acento', () => {
    expect(() =>
      ExercicioSchema.parse({ ...baseExercicio, slug: 'flexao-cruzado' })
    ).not.toThrow();
    expect(() =>
      ExercicioSchema.parse({ ...baseExercicio, slug: 'flexão' })
    ).toThrow();
  });

  it('rejeita grupo_muscular vazio', () => {
    expect(() =>
      ExercicioSchema.parse({ ...baseExercicio, grupo_muscular: [] })
    ).toThrow();
  });

  it('rejeita nivel invalido', () => {
    expect(() =>
      ExercicioSchema.parse({ ...baseExercicio, nivel: 'expert' })
    ).toThrow();
  });

  it('rejeita instrucao vazia', () => {
    expect(() =>
      ExercicioSchema.parse({ ...baseExercicio, instrucao: '' })
    ).toThrow();
  });

  it('aceita historico com varias entradas', () => {
    const out = ExercicioSchema.parse({
      ...baseExercicio,
      historico: [
        {
          data: '2026-04-15T10:00:00-03:00',
          carga: 40,
          series: 3,
          reps: 10,
        },
        {
          data: '2026-04-22T10:00:00-03:00',
          carga: 42.5,
          series: 3,
          reps: 10,
        },
      ],
    });
    expect(out.historico).toHaveLength(2);
    expect(out.historico[1].carga).toBe(42.5);
  });
});

describe('NivelExercicioSchema', () => {
  it('aceita os tres niveis canonicos', () => {
    expect(NivelExercicioSchema.parse('iniciante')).toBe('iniciante');
    expect(NivelExercicioSchema.parse('intermediario')).toBe('intermediario');
    expect(NivelExercicioSchema.parse('avancado')).toBe('avancado');
  });

  it('rejeita valores fora da lista', () => {
    expect(() => NivelExercicioSchema.parse('mestre')).toThrow();
  });
});

describe('HistoricoExecucaoSchema', () => {
  it('aceita execucao valida', () => {
    const out = HistoricoExecucaoSchema.parse({
      data: '2026-04-29T14:30:00-03:00',
      carga: 50,
      series: 4,
      reps: 8,
    });
    expect(out.carga).toBe(50);
    expect(out.series).toBe(4);
  });

  it('rejeita series com zero', () => {
    expect(() =>
      HistoricoExecucaoSchema.parse({
        data: '2026-04-29T14:30:00-03:00',
        carga: 10,
        series: 0,
        reps: 8,
      })
    ).toThrow();
  });

  it('rejeita reps negativos', () => {
    expect(() =>
      HistoricoExecucaoSchema.parse({
        data: '2026-04-29T14:30:00-03:00',
        carga: 10,
        series: 3,
        reps: -1,
      })
    ).toThrow();
  });

  it('aceita carga zero (peso corporal)', () => {
    const out = HistoricoExecucaoSchema.parse({
      data: '2026-04-29T14:30:00-03:00',
      carga: 0,
      series: 3,
      reps: 12,
    });
    expect(out.carga).toBe(0);
  });
});
