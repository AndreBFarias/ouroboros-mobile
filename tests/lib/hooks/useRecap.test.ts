// Testes do hook useRecap (M36). Foco na funcao pura agregarRecap
// que recebe listas brutas + range e devolve RecapData. O hook em si
// (uso de useEffect + useState) e coberto pelo teste de RecapScreen.
//
// Cobre:
//  - resolverPeriodo nas 3 chaves canonicas (semana/mes/ano).
//  - agregarRecap respeita o filtro de periodo em todas as listas.
//  - Conquistas combinam vitoria+evento_positivo+marco+contador+tarefa.
//  - Crises sao ordenadas por intensidade desc.
//  - Tarefas pendentes (feito=false) sao ignoradas.
//  - Numeros agregados batem com a soma das listas filtradas.
//
// Comentarios sem acento (convencao shell/CI).
import { agregarRecap, resolverPeriodo } from '@/lib/hooks/useRecap';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';
import type { Marco } from '@/lib/schemas/marco';
import type { Contador } from '@/lib/schemas/contador';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';
import type { Tarefa } from '@/lib/schemas/tarefa';

function humor(data: string, valor: number): HumorMeta {
  return {
    tipo: 'humor',
    data,
    autor: 'pessoa_a',
    humor: valor,
    energia: 3,
    ansiedade: 3,
    foco: 3,
    tags: [],
  };
}

function diario(
  data: string,
  modo: 'gatilho' | 'conquista',
  intensidade = 3,
  texto = 'texto'
): DiarioEmocionalMeta {
  const base: DiarioEmocionalMeta = {
    tipo: 'diario_emocional',
    data,
    autor: 'pessoa_a',
    modo,
    emocoes: [],
    intensidade,
    com: [],
    contexto_social: [],
    texto,
    midia:
      modo === 'conquista'
        ? [{ tipo: 'foto', path: 'media/fotos/x.jpg' }]
        : [],
    para: { tipo: 'mim' },
  };
  return base;
}

function evento(
  data: string,
  modo: 'positivo' | 'negativo',
  intensidade = 3
): EventoMeta {
  return {
    tipo: 'evento',
    data,
    autor: 'pessoa_a',
    modo,
    com: [],
    intensidade,
    fotos: [],
    midia:
      modo === 'positivo' ? [{ tipo: 'foto', path: 'media/fotos/y.jpg' }] : [],
    para: { tipo: 'mim' },
    categoria: 'lazer',
  };
}

function marco(data: string, descricao = 'novo marco'): Marco {
  return {
    tipo: 'marco',
    data,
    autor: 'pessoa_a',
    descricao,
    tags: [],
    auto: false,
    para: { tipo: 'mim' },
  };
}

function contador(slug: string, inicio: string, recorde = 0): Contador {
  return {
    tipo: 'contador',
    slug,
    titulo: `Sem ${slug}`,
    inicio,
    recorde,
    resets: [],
    criado_em: '2024-01-01T00:00:00-03:00',
    para: { tipo: 'mim' },
  };
}

function treino(data: string, duracao = 30): TreinoSessao {
  return {
    tipo: 'treino_sessao',
    data,
    autor: 'pessoa_a',
    duracao_min: duracao,
    exercicios: [{ nome: 'agachamento', series: 3, reps: 10 }],
  };
}

function tarefa(
  titulo: string,
  feito: boolean,
  feito_em: string | null,
  categoria: Tarefa['categoria'] = 'casa'
): { meta: Tarefa; rel: string } {
  return {
    meta: {
      tipo: 'tarefa',
      data: '2026-05-01',
      autor: 'pessoa_a',
      titulo,
      feito,
      feito_em,
      categoria,
      pessoa_destino: { tipo: 'mim' },
      alarme: null,
    },
    rel: `tarefas/2026-05-01-${titulo.toLowerCase().replace(/ /g, '-')}.md`,
  };
}

describe('resolverPeriodo', () => {
  const agora = new Date('2026-05-04T12:00:00-03:00');

  it('semana cobre os ultimos 7 dias', () => {
    const r = resolverPeriodo('semana', agora);
    const diff = (r.ate.getTime() - r.de.getTime()) / 86400000;
    expect(Math.round(diff)).toBeGreaterThanOrEqual(6);
    expect(Math.round(diff)).toBeLessThanOrEqual(7);
  });

  it('mes cobre 30 dias', () => {
    const r = resolverPeriodo('mes', agora);
    const diff = (r.ate.getTime() - r.de.getTime()) / 86400000;
    expect(Math.round(diff)).toBeGreaterThanOrEqual(29);
    expect(Math.round(diff)).toBeLessThanOrEqual(30);
  });

  it('ano cobre 365 dias', () => {
    const r = resolverPeriodo('ano', agora);
    const diff = (r.ate.getTime() - r.de.getTime()) / 86400000;
    expect(Math.round(diff)).toBeGreaterThanOrEqual(364);
    expect(Math.round(diff)).toBeLessThanOrEqual(365);
  });

  it('personalizado exige range custom', () => {
    expect(() => resolverPeriodo('personalizado', agora)).toThrow();
  });

  it('personalizado devolve range custom quando passado', () => {
    const custom = {
      de: new Date('2026-01-01T00:00:00-03:00'),
      ate: new Date('2026-02-01T23:59:59-03:00'),
    };
    const r = resolverPeriodo('personalizado', agora, custom);
    expect(r.de.getTime()).toBe(custom.de.getTime());
    expect(r.ate.getTime()).toBe(custom.ate.getTime());
  });
});

describe('agregarRecap', () => {
  const agora = new Date('2026-05-04T20:00:00-03:00');
  const range = resolverPeriodo('semana', agora);

  it('respeita o range filtrando registros antigos', () => {
    const data = agregarRecap({
      humor: [humor('2026-05-03', 4), humor('2024-01-01', 2)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.numeros.registros).toBe(1);
  });

  it('agrega conquistas de varias origens', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [
        diario('2026-05-02T10:00:00-03:00', 'conquista', 5, 'concluí o projeto'),
      ],
      eventos: [evento('2026-05-01T10:00:00-03:00', 'positivo')],
      marcos: [marco('2026-04-30T10:00:00-03:00', 'novo recorde de leitura')],
      contadores: [contador('cigarro', '2026-04-20', 0)],
      treinos: [],
      tarefas: [
        tarefa('comprar pão', true, '2026-05-03T10:00:00-03:00'),
        tarefa(
          'estudar typescript',
          true,
          '2026-05-02T18:00:00-03:00',
          'desenvolvimento_pessoal'
        ),
      ],
      de: range.de,
      ate: range.ate,
      agora,
    });
    // 1 vitoria + 1 evento positivo + 1 marco + 1 contador (>=7d) + 2 tarefas
    expect(data.conquistas.length).toBe(6);
    const origens = data.conquistas.map((c) => c.origem);
    expect(origens).toContain('diario_vitoria');
    expect(origens).toContain('evento_positivo');
    expect(origens).toContain('marco');
    expect(origens).toContain('contador_sequencia');
    expect(origens.filter((o) => o === 'tarefa_concluida').length).toBe(2);
  });

  it('ignora contador com sequencia menor que 7 dias', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [contador('reset-recente', '2026-05-02', 0)],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.conquistas.length).toBe(0);
  });

  it('crises ordenadas por intensidade desc', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [
        diario('2026-05-01T10:00:00-03:00', 'gatilho', 2, 'leve'),
        diario('2026-05-02T10:00:00-03:00', 'gatilho', 5, 'pico'),
        diario('2026-05-03T10:00:00-03:00', 'gatilho', 3, 'medio'),
      ],
      eventos: [evento('2026-05-02T11:00:00-03:00', 'negativo', 4)],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.crises.map((c) => c.intensidade)).toEqual([5, 4, 3, 2]);
  });

  it('ignora tarefas pendentes (feito=false)', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [
        tarefa('pendente', false, null),
        tarefa('feita ontem', true, '2026-05-03T10:00:00-03:00'),
      ],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.tarefasConcluidas.length).toBe(1);
    expect(data.tarefasConcluidas[0]?.titulo).toBe('feita ontem');
    expect(data.numeros.tarefas_concluidas).toBe(1);
  });

  it('numeros agregados batem com soma das listas filtradas', () => {
    const data = agregarRecap({
      humor: [humor('2026-05-03', 3), humor('2026-05-02', 4)],
      diarios: [diario('2026-05-02T10:00:00-03:00', 'conquista')],
      eventos: [
        evento('2026-05-01T10:00:00-03:00', 'positivo'),
        evento('2026-05-03T10:00:00-03:00', 'negativo'),
      ],
      marcos: [marco('2026-05-02T10:00:00-03:00')],
      contadores: [],
      treinos: [treino('2026-05-01T10:00:00-03:00', 45)],
      tarefas: [tarefa('xis', true, '2026-05-04T08:00:00-03:00')],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.numeros.eventos_positivos).toBe(1);
    expect(data.numeros.eventos_negativos).toBe(1);
    expect(data.numeros.treinos).toBe(1);
    expect(data.numeros.tarefas_concluidas).toBe(1);
    // 2 humor + 1 diario + 2 eventos + 1 marco + 1 treino + 1 tarefa = 8
    expect(data.numeros.registros).toBe(8);
    // 1 foto no diario (vitoria) + 1 foto no evento positivo
    expect(data.numeros.fotos).toBe(2);
  });

  it('humor medio so aparece em evolucoes quando ha 2+ registros', () => {
    const um = agregarRecap({
      humor: [humor('2026-05-03', 4)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(
      um.evolucoes.find((e) => e.id === 'evolucao:humor_medio')
    ).toBeUndefined();

    const dois = agregarRecap({
      humor: [humor('2026-05-03', 4), humor('2026-05-02', 2)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(
      dois.evolucoes.find((e) => e.id === 'evolucao:humor_medio')
    ).toBeDefined();
  });

  it('estado vazio devolve listas vazias e numeros zerados', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });
    expect(data.conquistas).toEqual([]);
    expect(data.crises).toEqual([]);
    expect(data.evolucoes).toEqual([]);
    expect(data.tarefasConcluidas).toEqual([]);
    expect(data.numeros.registros).toBe(0);
    expect(data.numeros.fotos).toBe(0);
  });
});
