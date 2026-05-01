// Testes do TreinoSessaoSchema. Cobre caminho feliz, validacao de
// duracao, lista de exercicios obrigatoria, observacoes opcionais e
// rejeita autor invalido.
import {
  TreinoSessaoSchema,
  ExercicioSessaoSchema,
} from '@/lib/schemas/treino_sessao';

const baseSessao = {
  tipo: 'treino_sessao',
  data: '2026-04-23T18:00:00-03:00',
  autor: 'pessoa_a',
  rotina: 'rotina A',
  duracao_min: 28,
  exercicios: [
    {
      nome: 'supino reto',
      series: 3,
      reps: 8,
      carga_kg: 4,
    },
  ],
};

describe('TreinoSessaoSchema', () => {
  it('aceita sessao completa valida', () => {
    const out = TreinoSessaoSchema.parse(baseSessao);
    expect(out.tipo).toBe('treino_sessao');
    expect(out.exercicios).toHaveLength(1);
    expect(out.duracao_min).toBe(28);
  });

  it('aceita sem rotina e sem observacoes (opcionais)', () => {
    const sessao = {
      ...baseSessao,
      rotina: undefined,
      observacoes: undefined,
    };
    const out = TreinoSessaoSchema.parse(sessao);
    expect(out.rotina).toBeUndefined();
    expect(out.observacoes).toBeUndefined();
  });

  it('rejeita duracao 0 ou maior que 240', () => {
    expect(() =>
      TreinoSessaoSchema.parse({ ...baseSessao, duracao_min: 0 })
    ).toThrow();
    expect(() =>
      TreinoSessaoSchema.parse({ ...baseSessao, duracao_min: 241 })
    ).toThrow();
  });

  it('rejeita lista vazia de exercicios', () => {
    expect(() =>
      TreinoSessaoSchema.parse({ ...baseSessao, exercicios: [] })
    ).toThrow();
  });

  it('rejeita autor invalido', () => {
    expect(() =>
      TreinoSessaoSchema.parse({ ...baseSessao, autor: 'ambos' })
    ).toThrow();
  });

  it('rejeita data sem hora', () => {
    expect(() =>
      TreinoSessaoSchema.parse({ ...baseSessao, data: '2026-04-23' })
    ).toThrow();
  });

  it('rejeita tipo errado', () => {
    expect(() =>
      TreinoSessaoSchema.parse({ ...baseSessao, tipo: 'humor' })
    ).toThrow();
  });

  it('aceita carga_kg ausente em exercicio (peso corporal)', () => {
    const sessao = {
      ...baseSessao,
      exercicios: [{ nome: 'flexao', series: 3, reps: 12 }],
    };
    const out = TreinoSessaoSchema.parse(sessao);
    expect(out.exercicios[0].carga_kg).toBeUndefined();
  });

  it('aceita observacao por exercicio', () => {
    const sessao = {
      ...baseSessao,
      exercicios: [
        {
          nome: 'agachamento',
          series: 3,
          reps: 8,
          observacao: 'tranquilo, sem dor.',
        },
      ],
    };
    const out = TreinoSessaoSchema.parse(sessao);
    expect(out.exercicios[0].observacao).toBe('tranquilo, sem dor.');
  });
});

describe('ExercicioSessaoSchema', () => {
  it('rejeita series acima de 20', () => {
    expect(() =>
      ExercicioSessaoSchema.parse({
        nome: 'x',
        series: 21,
        reps: 1,
      })
    ).toThrow();
  });

  it('rejeita reps abaixo de 1', () => {
    expect(() =>
      ExercicioSessaoSchema.parse({
        nome: 'x',
        series: 1,
        reps: 0,
      })
    ).toThrow();
  });

  it('rejeita carga negativa', () => {
    expect(() =>
      ExercicioSessaoSchema.parse({
        nome: 'x',
        series: 1,
        reps: 1,
        carga_kg: -1,
      })
    ).toThrow();
  });
});
