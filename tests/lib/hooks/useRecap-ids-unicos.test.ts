// AUDIT-P1-7 item 3: ids de conquista do Recap precisam ser unicos.
//
// Os ids sao usados como `key` de lista em RecapSecaoConquistas e como
// rotulo de acessibilidade. Duas formas colidiam:
//
//  - `marco:${m.data}:${m.autor}` -- Marco.data vem de nowIso() de
//    marcosAuto, com granularidade de MINUTO, e os 5 criterios sao
//    avaliados e gravados no mesmo laco: ate 5 marcos do mesmo autor
//    nascem com data identica e produziam 5 ids identicos.
//  - `tarefa:${meta.data}:${meta.titulo}` -- Tarefa.data e YMD, entao
//    duas tarefas homonimas no mesmo dia ("Tomar remédio" de manha e
//    de noite) colidiam.
//
// React com key duplicada reconcilia errado (itens somem, trocam de
// lugar, herdam estado de animacao do vizinho) e o toque pode abrir a
// conquista errada.
//
// Comentarios sem acento (convencao shell/CI).
import { agregarRecap } from '@/lib/hooks/useRecap';
import { hashMarcoConteudo } from '@/lib/marcos/hash';
import type { Marco } from '@/lib/schemas/marco';
import type { Tarefa } from '@/lib/schemas/tarefa';

const DE = new Date('2026-07-01T00:00:00-03:00');
const ATE = new Date('2026-07-31T23:59:59-03:00');

// Instante unico compartilhado pelos 5 marcos: e' exatamente o que
// verificarMarcosAuto produz numa unica execucao (nowIso() ate o
// minuto, mesmo valor para todos os criterios do laco).
const MESMO_MINUTO = '2026-07-20T10:15:00-03:00';

// As 5 descricoes canonicas dos criterios automaticos (marcosAuto.ts).
const CINCO_CRITERIOS = [
  'Três treinos nesta semana.',
  'Voltou apos 6 dias parados.',
  'Sete dias acompanhando.',
  'Trinta dias sem gatilho.',
  'Primeira conquista desta semana.',
];

function marco(
  data: string,
  descricao: string,
  comHash: boolean = false
): Marco {
  return {
    tipo: 'marco',
    data,
    autor: 'pessoa_a',
    descricao,
    tags: [],
    auto: true,
    origem: 'client',
    ...(comHash ? { hash: hashMarcoConteudo('pessoa_a', descricao) } : {}),
    para: { tipo: 'mim' },
  };
}

function tarefa(
  titulo: string,
  rel: string,
  feito_em: string
): { meta: Tarefa; rel: string } {
  return {
    meta: {
      tipo: 'tarefa',
      data: '2026-07-20',
      autor: 'pessoa_a',
      titulo,
      feito: true,
      feito_em,
      categoria: 'saude',
      pessoa_destino: { tipo: 'mim' },
      alarme: null,
      silenciar_sugestao_ate: null,
    },
    rel,
  };
}

function agregar(marcos: Marco[], tarefas: { meta: Tarefa; rel: string }[]) {
  return agregarRecap({
    humor: [],
    diarios: [],
    eventos: [],
    marcos,
    contadores: [],
    treinos: [],
    tarefas,
    de: DE,
    ate: ATE,
    agora: new Date('2026-07-31T12:00:00-03:00'),
  });
}

describe('agregarRecap — ids de conquista unicos (AUDIT-P1-7)', () => {
  it('5 marcos do mesmo minuto geram 5 ids distintos', () => {
    const marcos = CINCO_CRITERIOS.map((d) => marco(MESMO_MINUTO, d));
    const ids = agregar(marcos, []).conquistas.map((c) => c.id);

    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('5 marcos do mesmo minuto com hash gravado tambem sao distintos', () => {
    const marcos = CINCO_CRITERIOS.map((d) => marco(MESMO_MINUTO, d, true));
    const ids = agregar(marcos, []).conquistas.map((c) => c.id);

    expect(new Set(ids).size).toBe(5);
  });

  it('2 tarefas homonimas do mesmo dia geram ids distintos', () => {
    const tarefas = [
      tarefa(
        'Tomar remédio',
        'markdown/tarefa-tomar-remedio-a1b2-dev01.md',
        '2026-07-20T08:00:00-03:00'
      ),
      tarefa(
        'Tomar remédio',
        'markdown/tarefa-tomar-remedio-c3d4-dev01.md',
        '2026-07-20T20:00:00-03:00'
      ),
    ];
    const data = agregar([], tarefas);

    const idsConquista = data.conquistas.map((c) => c.id);
    expect(idsConquista).toHaveLength(2);
    expect(new Set(idsConquista).size).toBe(2);

    const idsDetalhe = data.tarefasConcluidas.map((t) => t.id);
    expect(idsDetalhe).toHaveLength(2);
    expect(new Set(idsDetalhe).size).toBe(2);
  });

  it('conjunto misto (5 marcos + 2 tarefas homonimas) nao repete id', () => {
    const marcos = CINCO_CRITERIOS.map((d) => marco(MESMO_MINUTO, d));
    const tarefas = [
      tarefa(
        'Tomar remédio',
        'markdown/tarefa-tomar-remedio-a1b2-dev01.md',
        '2026-07-20T08:00:00-03:00'
      ),
      tarefa(
        'Tomar remédio',
        'markdown/tarefa-tomar-remedio-c3d4-dev01.md',
        '2026-07-20T20:00:00-03:00'
      ),
    ];
    const ids = agregar(marcos, tarefas).conquistas.map((c) => c.id);

    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('prefixo de origem preservado (contrato de destinoConquista)', () => {
    const marcos = [marco(MESMO_MINUTO, CINCO_CRITERIOS[0])];
    const tarefas = [
      tarefa(
        'Tomar remédio',
        'markdown/tarefa-tomar-remedio-a1b2-dev01.md',
        '2026-07-20T08:00:00-03:00'
      ),
    ];
    const data = agregar(marcos, tarefas);

    const idMarco = data.conquistas.find((c) => c.origem === 'marco')?.id;
    const idTarefa = data.conquistas.find(
      (c) => c.origem === 'tarefa_concluida'
    )?.id;
    expect(idMarco?.startsWith('marco:')).toBe(true);
    expect(idTarefa?.startsWith('tarefa:')).toBe(true);
  });
});
