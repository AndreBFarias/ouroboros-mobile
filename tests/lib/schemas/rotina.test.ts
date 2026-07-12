// Testes do RotinaSchema (Q11.a, M-ROTINA-TREINO). Cobre caminho feliz,
// cap de 20 exercicios, carga_kg null (peso corporal), reps string
// livre, regex de slug e data, e autor.
//
// Comentarios sem acento (convencao shell/CI).
import {
  RotinaSchema,
  ExercicioRotinaSchema,
  ROTINA_CATEGORIAS,
  ROTINA_CATEGORIA_LABELS,
  type ExercicioRotina,
} from '@/lib/schemas/rotina';

const exBase: ExercicioRotina = {
  nome: 'Agachamento',
  carga_kg: 40,
  series: 3,
  reps: '10',
  descanso_seg: 90,
  observacao: null,
};

const baseRotina = {
  tipo: 'rotina_treino' as const,
  slug: 'treino-a',
  nome: 'Treino A',
  descricao: null,
  exercicios: [exBase],
  data_criacao: '2026-05-12',
  autor: 'pessoa_a' as const,
};

describe('ExercicioRotinaSchema', () => {
  it('aceita exercicio completo', () => {
    const out = ExercicioRotinaSchema.parse(exBase);
    expect(out.nome).toBe('Agachamento');
    expect(out.carga_kg).toBe(40);
  });

  it('aceita carga_kg null (peso corporal)', () => {
    const out = ExercicioRotinaSchema.parse({ ...exBase, carga_kg: null });
    expect(out.carga_kg).toBeNull();
  });

  it('aceita carga_kg zero', () => {
    const out = ExercicioRotinaSchema.parse({ ...exBase, carga_kg: 0 });
    expect(out.carga_kg).toBe(0);
  });

  it('rejeita carga_kg negativa', () => {
    expect(() =>
      ExercicioRotinaSchema.parse({ ...exBase, carga_kg: -5 })
    ).toThrow();
  });

  it('aceita reps como faixa "8-10"', () => {
    const out = ExercicioRotinaSchema.parse({ ...exBase, reps: '8-10' });
    expect(out.reps).toBe('8-10');
  });

  it('aceita reps como "amrap" ou "ate falha"', () => {
    expect(ExercicioRotinaSchema.parse({ ...exBase, reps: 'amrap' }).reps).toBe(
      'amrap'
    );
    expect(
      ExercicioRotinaSchema.parse({ ...exBase, reps: 'ate falha' }).reps
    ).toBe('ate falha');
  });

  it('rejeita reps vazio', () => {
    expect(() =>
      ExercicioRotinaSchema.parse({ ...exBase, reps: '' })
    ).toThrow();
  });

  it('rejeita series zero ou negativo', () => {
    expect(() =>
      ExercicioRotinaSchema.parse({ ...exBase, series: 0 })
    ).toThrow();
    expect(() =>
      ExercicioRotinaSchema.parse({ ...exBase, series: -2 })
    ).toThrow();
  });

  it('default descanso_seg 90 quando ausente', () => {
    const { descanso_seg, ...sem } = exBase;
    void descanso_seg;
    const out = ExercicioRotinaSchema.parse(sem);
    expect(out.descanso_seg).toBe(90);
  });

  it('aceita observacao texto ou null', () => {
    expect(
      ExercicioRotinaSchema.parse({ ...exBase, observacao: 'aquecer 5min' })
        .observacao
    ).toBe('aquecer 5min');
    expect(
      ExercicioRotinaSchema.parse({ ...exBase, observacao: null }).observacao
    ).toBeNull();
  });

  it('Q18.b preserva gif quando presente e aceita ausencia (retro-compat)', () => {
    const comGif = ExercicioRotinaSchema.parse({
      ...exBase,
      gif: 'midia/exercicios/agachamento.gif',
    });
    expect(comGif.gif).toBe('midia/exercicios/agachamento.gif');
    const semGif = ExercicioRotinaSchema.parse(exBase);
    expect(semGif.gif).toBeUndefined();
  });
});

describe('RotinaSchema', () => {
  it('aceita rotina minima valida', () => {
    const out = RotinaSchema.parse(baseRotina);
    expect(out.nome).toBe('Treino A');
    expect(out.exercicios).toHaveLength(1);
  });

  it('aceita rotina com varios exercicios', () => {
    const out = RotinaSchema.parse({
      ...baseRotina,
      exercicios: Array.from({ length: 8 }).map((_, i) => ({
        ...exBase,
        nome: `Ex ${i + 1}`,
      })),
    });
    expect(out.exercicios).toHaveLength(8);
  });

  it('rejeita exercicios vazio', () => {
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, exercicios: [] })
    ).toThrow();
  });

  it('rejeita exercicios acima de 20 (cap)', () => {
    const arr = Array.from({ length: 21 }).map((_, i) => ({
      ...exBase,
      nome: `Ex ${i + 1}`,
    }));
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, exercicios: arr })
    ).toThrow();
  });

  it('aceita exercicios = 20 (limite)', () => {
    const arr = Array.from({ length: 20 }).map((_, i) => ({
      ...exBase,
      nome: `Ex ${i + 1}`,
    }));
    const out = RotinaSchema.parse({ ...baseRotina, exercicios: arr });
    expect(out.exercicios).toHaveLength(20);
  });

  it('rejeita slug com maiusculas', () => {
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, slug: 'Treino-A' })
    ).toThrow();
  });

  it('rejeita slug com espaco', () => {
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, slug: 'treino a' })
    ).toThrow();
  });

  it('rejeita nome vazio', () => {
    expect(() => RotinaSchema.parse({ ...baseRotina, nome: '' })).toThrow();
  });

  it('rejeita data_criacao fora do formato YYYY-MM-DD', () => {
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, data_criacao: '12/05/2026' })
    ).toThrow();
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, data_criacao: '2026-5-1' })
    ).toThrow();
  });

  it('aceita descricao texto ou null', () => {
    expect(
      RotinaSchema.parse({ ...baseRotina, descricao: 'Foco em pernas' })
        .descricao
    ).toBe('Foco em pernas');
    expect(
      RotinaSchema.parse({ ...baseRotina, descricao: null }).descricao
    ).toBeNull();
  });

  it('aceita autor pessoa_a ou pessoa_b', () => {
    expect(RotinaSchema.parse({ ...baseRotina, autor: 'pessoa_a' }).autor).toBe(
      'pessoa_a'
    );
    expect(RotinaSchema.parse({ ...baseRotina, autor: 'pessoa_b' }).autor).toBe(
      'pessoa_b'
    );
  });

  it('rejeita autor invalido (ambos)', () => {
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, autor: 'ambos' })
    ).toThrow();
  });

  it('rejeita tipo diferente de "rotina_treino"', () => {
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, tipo: 'treino_sessao' })
    ).toThrow();
  });
});

describe('RotinaSchema R-ROT-2 categoria', () => {
  it('aplica default outro quando campo ausente (retro-compat)', () => {
    const out = RotinaSchema.parse(baseRotina);
    expect(out.categoria).toBe('outro');
  });

  it('aceita medicacao', () => {
    const out = RotinaSchema.parse({ ...baseRotina, categoria: 'medicacao' });
    expect(out.categoria).toBe('medicacao');
  });

  it('aceita saude_fisica', () => {
    const out = RotinaSchema.parse({
      ...baseRotina,
      categoria: 'saude_fisica',
    });
    expect(out.categoria).toBe('saude_fisica');
  });

  it('aceita habito', () => {
    const out = RotinaSchema.parse({ ...baseRotina, categoria: 'habito' });
    expect(out.categoria).toBe('habito');
  });

  it('aceita outro explicito', () => {
    const out = RotinaSchema.parse({ ...baseRotina, categoria: 'outro' });
    expect(out.categoria).toBe('outro');
  });

  it('rejeita categoria fora do enum', () => {
    expect(() =>
      RotinaSchema.parse({ ...baseRotina, categoria: 'trabalho' })
    ).toThrow();
  });

  it('ROTINA_CATEGORIAS tem 4 valores fixos na ordem canonica', () => {
    expect(ROTINA_CATEGORIAS).toEqual([
      'medicacao',
      'saude_fisica',
      'habito',
      'outro',
    ]);
  });

  it('ROTINA_CATEGORIA_LABELS cobre todas as categorias com acentuacao PT-BR', () => {
    expect(ROTINA_CATEGORIA_LABELS.medicacao).toBe('Medicação');
    expect(ROTINA_CATEGORIA_LABELS.saude_fisica).toBe('Saúde física');
    expect(ROTINA_CATEGORIA_LABELS.habito).toBe('Hábito');
    expect(ROTINA_CATEGORIA_LABELS.outro).toBe('Outro');
    // garante que toda categoria do enum tem label correspondente
    for (const cat of ROTINA_CATEGORIAS) {
      expect(ROTINA_CATEGORIA_LABELS[cat]).toBeDefined();
      expect(ROTINA_CATEGORIA_LABELS[cat].length).toBeGreaterThan(0);
    }
  });
});
