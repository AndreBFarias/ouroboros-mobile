// Testes do helper sessaoFromRotina (Q11.b). Cobre conversao
// reps string -> number, copia imutavel (snapshot nao retroage),
// carga_kg null -> undefined, observacao vazia preservada.
//
// Comentarios sem acento (convencao shell/CI).
import { sessaoFromRotina } from '@/lib/treino/sessaoFromRotina';
import type { RotinaMeta } from '@/lib/schemas/rotina';

function fixtureRotina(over: Partial<RotinaMeta> = {}): RotinaMeta {
  return {
    tipo: 'rotina_treino',
    slug: 'treino-a',
    nome: 'Treino A',
    descricao: null,
    exercicios: [
      {
        nome: 'Agachamento',
        carga_kg: 40,
        series: 3,
        reps: '10',
        descanso_seg: 90,
        observacao: null,
      },
    ],
    data_criacao: '2026-05-12',
    autor: 'pessoa_a',
    // R-ROT-2: categoria adicionada ao schema. Fixture usa 'outro'
    // (default) para manter semantica de teste legacy.
    categoria: 'outro',
    // R-ROT-1-D: silenciar_sugestao_ate default null (rotina nao
    // silenciada para sugestao de alarme temporal).
    silenciar_sugestao_ate: null,
    ...over,
  };
}

describe('sessaoFromRotina', () => {
  it('mapeia campos basicos', () => {
    const out = sessaoFromRotina(
      fixtureRotina(),
      '2026-05-12T10:00:00-03:00',
      'pessoa_a'
    );
    expect(out.tipo).toBe('treino_sessao');
    expect(out.rotina).toBe('Treino A');
    expect(out.data).toBe('2026-05-12T10:00:00-03:00');
    expect(out.autor).toBe('pessoa_a');
    expect(out.exercicios).toHaveLength(1);
  });

  it('repete exercicios na mesma ordem', () => {
    const rot = fixtureRotina({
      exercicios: [
        {
          nome: 'A',
          carga_kg: 10,
          series: 1,
          reps: '8',
          descanso_seg: 60,
          observacao: null,
        },
        {
          nome: 'B',
          carga_kg: 20,
          series: 2,
          reps: '12',
          descanso_seg: 90,
          observacao: null,
        },
      ],
    });
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.map((e) => e.nome)).toEqual(['A', 'B']);
  });

  it('reps numero exato vira number igual', () => {
    const out = sessaoFromRotina(fixtureRotina(), '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].reps).toBe(10);
  });

  it('reps faixa "8-10" pega o piso (8)', () => {
    const rot = fixtureRotina({
      exercicios: [
        {
          ...fixtureRotina().exercicios[0],
          reps: '8-10',
        },
      ],
    });
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].reps).toBe(8);
  });

  it('reps "amrap" cai em fallback 10', () => {
    const rot = fixtureRotina({
      exercicios: [{ ...fixtureRotina().exercicios[0], reps: 'amrap' }],
    });
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].reps).toBe(10);
  });

  it('reps "ate falha" cai em fallback 10', () => {
    const rot = fixtureRotina({
      exercicios: [{ ...fixtureRotina().exercicios[0], reps: 'ate falha' }],
    });
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].reps).toBe(10);
  });

  it('reps string vazia cai em fallback 10', () => {
    const rot = fixtureRotina({
      exercicios: [{ ...fixtureRotina().exercicios[0], reps: '   ' }],
    });
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].reps).toBe(10);
  });

  it('carga_kg null vira undefined (peso corporal)', () => {
    const rot = fixtureRotina({
      exercicios: [{ ...fixtureRotina().exercicios[0], carga_kg: null }],
    });
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].carga_kg).toBeUndefined();
  });

  it('carga_kg 0 preservado (treino sem peso explicito)', () => {
    const rot = fixtureRotina({
      exercicios: [{ ...fixtureRotina().exercicios[0], carga_kg: 0 }],
    });
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].carga_kg).toBe(0);
  });

  it('observacao preenchida copia para sessao', () => {
    const rot = fixtureRotina({
      exercicios: [
        { ...fixtureRotina().exercicios[0], observacao: 'aquecer 5min' },
      ],
    });
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].observacao).toBe('aquecer 5min');
  });

  it('observacao null nao polui o exercicio resultante', () => {
    const out = sessaoFromRotina(fixtureRotina(), '2026-05-12', 'pessoa_a');
    expect(out.exercicios?.[0].observacao).toBeUndefined();
  });

  it('snapshot e imutavel: mutar saida nao afeta rotina original', () => {
    const rot = fixtureRotina();
    const out = sessaoFromRotina(rot, '2026-05-12', 'pessoa_a');
    if (out.exercicios) {
      out.exercicios[0].series = 999;
    }
    expect(rot.exercicios[0].series).toBe(3);
  });
});
