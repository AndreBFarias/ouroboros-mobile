// Testes do calculador puro de stats agregadas
// (R-VAULT-CANONICAL-COMPLETE-B).
//
// Cobre:
//   - Round-trip por periodo (7d/30d/90d/all) com fixtures sinteticas.
//   - Edge cases: vault vazio, vault com 1 item so, vault com lacunas
//     temporais (so dados antigos fora do periodo).
//   - Top-5 ranking determinista (sort estavel por chave em empate
//     de frequencia).
//   - Medias de humor: null quando lista vazia, 2 casas decimais quando
//     ha registros.
//   - countPorTipo mapeia todos os tipos canonicos.
//   - streaksAtuais inclui apenas contadores com dias >= 1.
//
// Comentarios sem acento.

import { calcularStatsAgregadas, diasDoPeriodo } from '@/lib/stats/calcular';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';
import type { Marco } from '@/lib/schemas/marco';
import type { Contador } from '@/lib/schemas/contador';
import type { Tarefa } from '@/lib/schemas/tarefa';

const AGORA = new Date('2026-05-16T12:00:00-03:00');

// Constroi humor sintetico para uma data offset em dias do agora.
function humorEmDias(offset: number, valor: number): HumorMeta {
  const d = new Date(AGORA);
  d.setDate(d.getDate() - offset);
  const ymd = d.toISOString().slice(0, 10);
  return {
    tipo: 'humor',
    data: ymd,
    autor: 'pessoa_a',
    humor: valor,
    energia: 3,
    ansiedade: 3,
    foco: 3,
    tags: [],
  };
}

function diarioGatilho(
  offsetDias: number,
  emocoes: string[]
): DiarioEmocionalMeta {
  const d = new Date(AGORA);
  d.setDate(d.getDate() - offsetDias);
  return {
    tipo: 'diario_emocional',
    data: d.toISOString().replace('Z', '-03:00'),
    autor: 'pessoa_a',
    modo: 'gatilho',
    emocoes,
    intensidade: 4,
    com: [],
    contexto_social: [],
    texto: 'momento dificil',
    midia: [],
    para: { tipo: 'mim' },
  };
}

function diarioConquista(offsetDias: number): DiarioEmocionalMeta {
  const d = new Date(AGORA);
  d.setDate(d.getDate() - offsetDias);
  return {
    tipo: 'diario_emocional',
    data: d.toISOString().replace('Z', '-03:00'),
    autor: 'pessoa_a',
    modo: 'conquista',
    emocoes: [],
    intensidade: 4,
    com: [],
    contexto_social: [],
    texto: 'conquista feliz',
    midia: [
      {
        tipo: 'foto',
        path: 'jpg/foto-2026-05-16-abc.jpg',
      } as DiarioEmocionalMeta['midia'][number],
    ],
    para: { tipo: 'mim' },
  };
}

function eventoPositivo(offsetDias: number): EventoMeta {
  const d = new Date(AGORA);
  d.setDate(d.getDate() - offsetDias);
  return {
    tipo: 'evento',
    data: d.toISOString().replace('Z', '-03:00'),
    autor: 'pessoa_a',
    modo: 'positivo',
    com: [],
    intensidade: 3,
    fotos: [],
    midia: [
      {
        tipo: 'foto',
        path: 'jpg/foto.jpg',
      } as EventoMeta['midia'][number],
    ],
    para: { tipo: 'mim' },
  };
}

function eventoNegativo(offsetDias: number): EventoMeta {
  const d = new Date(AGORA);
  d.setDate(d.getDate() - offsetDias);
  return {
    tipo: 'evento',
    data: d.toISOString().replace('Z', '-03:00'),
    autor: 'pessoa_a',
    modo: 'negativo',
    com: [],
    intensidade: 4,
    fotos: [],
    midia: [],
    para: { tipo: 'mim' },
  };
}

function marco(offsetDias: number, descricao = 'marco generico'): Marco {
  const d = new Date(AGORA);
  d.setDate(d.getDate() - offsetDias);
  return {
    tipo: 'marco',
    data: d.toISOString().replace('Z', '-03:00'),
    autor: 'pessoa_a',
    descricao,
    tags: [],
    auto: false,
    para: { tipo: 'mim' },
  };
}

function contador(slug: string, iniciodaysAgo: number): Contador {
  const d = new Date(AGORA);
  d.setDate(d.getDate() - iniciodaysAgo);
  return {
    tipo: 'contador',
    slug,
    titulo: `Contador ${slug}`,
    inicio: d.toISOString().slice(0, 10),
    recorde: iniciodaysAgo,
    resets: [],
    criado_em: d.toISOString().replace('Z', '-03:00'),
    para: { tipo: 'mim' },
  };
}

function tarefaConcluida(
  offsetDias: number,
  titulo: string
): { meta: Tarefa; rel: string } {
  const d = new Date(AGORA);
  d.setDate(d.getDate() - offsetDias);
  return {
    meta: {
      tipo: 'tarefa',
      data: d.toISOString().slice(0, 10),
      autor: 'pessoa_a',
      titulo,
      feito: true,
      feito_em: d.toISOString().replace('Z', '-03:00'),
      categoria: 'outro',
      pessoa_destino: { tipo: 'mim' },
      alarme: null,
    },
    rel: `markdown/tarefa-${titulo.replace(/\s+/g, '-')}.md`,
  };
}

describe('stats/calcular: diasDoPeriodo', () => {
  it('mapeia periodos para numeros canonicos', () => {
    expect(diasDoPeriodo('7d')).toBe(7);
    expect(diasDoPeriodo('30d')).toBe(30);
    expect(diasDoPeriodo('90d')).toBe(90);
    expect(diasDoPeriodo('all')).toBeNull();
  });
});

describe('stats/calcular: vault vazio', () => {
  it('humorMedio* todos null quando nao ha humor', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.humorMedio7d).toBeNull();
    expect(r.humorMedio30d).toBeNull();
    expect(r.humorMedio90d).toBeNull();
    expect(r.humorMedioAll).toBeNull();
  });

  it('countPorTipo zerado em todas chaves canonicas', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '30d',
      agora: AGORA,
    });
    expect(r.countPorTipo).toEqual({
      humor: 0,
      diario_gatilho: 0,
      diario_conquista: 0,
      diario_reflexao: 0,
      marco: 0,
      evento_positivo: 0,
      evento_negativo: 0,
      contador: 0,
      tarefa_concluida: 0,
    });
  });

  it('streaksAtuais vazio', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(r.streaksAtuais).toEqual({});
  });

  it('topGatilhosUltimos90d e topConquistas listas vazias', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '90d',
      agora: AGORA,
    });
    expect(r.topGatilhosUltimos90d).toEqual([]);
    expect(r.topConquistas).toEqual([]);
  });

  it('ultimaAtualizacao e atualizadoEm sao ISO do agora', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(r.ultimaAtualizacao).toBe(AGORA.toISOString());
    expect(r.atualizadoEm).toBe(AGORA.toISOString());
  });
});

describe('stats/calcular: medias de humor com 2 casas', () => {
  it('media de 3 humores: (3+4+5)/3 = 4.00', () => {
    const r = calcularStatsAgregadas({
      humor: [humorEmDias(0, 3), humorEmDias(1, 4), humorEmDias(2, 5)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.humorMedio7d).toBe(4);
    // Mesmos 3 registros estao em todos os horizontes.
    expect(r.humorMedio30d).toBe(4);
    expect(r.humorMedio90d).toBe(4);
    expect(r.humorMedioAll).toBe(4);
  });

  it('media de (3 + 4) / 2 = 3.5', () => {
    const r = calcularStatsAgregadas({
      humor: [humorEmDias(0, 3), humorEmDias(1, 4)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(r.humorMedioAll).toBe(3.5);
  });

  it('media so com 1 registro vira o proprio valor', () => {
    const r = calcularStatsAgregadas({
      humor: [humorEmDias(0, 2)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.humorMedio7d).toBe(2);
  });

  it('horizontes diferentes filtram corretamente', () => {
    // 1 em 5d, 1 em 15d, 1 em 60d. So 5d entra em 7d; ate 30d em 30d;
    // todos em 90d e all.
    const r = calcularStatsAgregadas({
      humor: [humorEmDias(5, 5), humorEmDias(15, 3), humorEmDias(60, 1)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(r.humorMedio7d).toBe(5);
    expect(r.humorMedio30d).toBe(4); // (5+3)/2
    expect(r.humorMedio90d).toBe(3); // (5+3+1)/3
    expect(r.humorMedioAll).toBe(3); // (5+3+1)/3
  });
});

describe('stats/calcular: countPorTipo no periodo', () => {
  it('conta humor dentro do periodo apenas', () => {
    // 2 dentro de 7d, 1 fora.
    const r = calcularStatsAgregadas({
      humor: [humorEmDias(0, 3), humorEmDias(5, 4), humorEmDias(20, 5)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.countPorTipo.humor).toBe(2);
  });

  it('conta diarios por modo separadamente', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [
        diarioGatilho(1, ['raiva']),
        diarioGatilho(2, ['medo']),
        diarioConquista(3),
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.countPorTipo.diario_gatilho).toBe(2);
    expect(r.countPorTipo.diario_conquista).toBe(1);
    expect(r.countPorTipo.diario_reflexao).toBe(0);
  });

  it('conta eventos positivos e negativos', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [eventoPositivo(2), eventoNegativo(3), eventoNegativo(4)],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.countPorTipo.evento_positivo).toBe(1);
    expect(r.countPorTipo.evento_negativo).toBe(2);
  });

  it('contador conta sempre (nao tem campo data filtravel)', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [contador('um', 10), contador('dois', 50)],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.countPorTipo.contador).toBe(2);
  });

  it('tarefa_concluida filtra por feito_em no periodo', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [
        tarefaConcluida(2, 'comprar pao'),
        tarefaConcluida(20, 'ler livro'),
      ],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.countPorTipo.tarefa_concluida).toBe(1);
  });
});

describe('stats/calcular: streaksAtuais', () => {
  it('inclui contadores com dias >= 1', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [
        contador('sem-acucar', 30),
        contador('sem-fumar', 100),
      ],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(r.streaksAtuais).toEqual({
      'sem-acucar': 30,
      'sem-fumar': 100,
    });
  });

  it('exclui contador com dias = 0 (criado hoje)', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [contador('novo', 0)],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(r.streaksAtuais).toEqual({});
  });

  it('sort por slug ASC determinista (insertion order do record)', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [
        contador('zebra', 10),
        contador('alpha', 20),
        contador('mid', 5),
      ],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(Object.keys(r.streaksAtuais)).toEqual(['alpha', 'mid', 'zebra']);
  });
});

describe('stats/calcular: topGatilhosUltimos90d', () => {
  it('top 5 por frequencia de emocao em diario_gatilho', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [
        diarioGatilho(10, ['raiva', 'raiva']),
        diarioGatilho(20, ['medo']),
        diarioGatilho(30, ['raiva']),
        diarioGatilho(40, ['tristeza', 'medo']),
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.topGatilhosUltimos90d).toEqual([
      { chave: 'raiva', n: 3 },
      { chave: 'medo', n: 2 },
      { chave: 'tristeza', n: 1 },
    ]);
  });

  it('descarta diarios fora de 90d mesmo com periodo=all', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [
        diarioGatilho(80, ['ansiedade']),
        diarioGatilho(120, ['culpa']), // fora de 90d
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(r.topGatilhosUltimos90d).toEqual([
      { chave: 'ansiedade', n: 1 },
    ]);
  });

  it('empate de frequencia: sort estavel por chave ASC', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [
        diarioGatilho(1, ['zebra']),
        diarioGatilho(2, ['alpha']),
        diarioGatilho(3, ['mid']),
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    // Todos com n=1; chave ASC PT-BR vence empate.
    expect(r.topGatilhosUltimos90d).toEqual([
      { chave: 'alpha', n: 1 },
      { chave: 'mid', n: 1 },
      { chave: 'zebra', n: 1 },
    ]);
  });

  it('limita a top 5', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [
        diarioGatilho(1, ['a', 'a', 'b', 'b', 'c', 'd', 'e', 'f']),
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.topGatilhosUltimos90d.length).toBe(5);
    expect(r.topGatilhosUltimos90d[0]).toEqual({ chave: 'a', n: 2 });
    expect(r.topGatilhosUltimos90d[1]).toEqual({ chave: 'b', n: 2 });
  });
});

describe('stats/calcular: topConquistas', () => {
  it('agrupa origens por frequencia', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [diarioConquista(1), diarioConquista(2)],
      eventos: [eventoPositivo(3)],
      marcos: [marco(4), marco(5), marco(6)],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.topConquistas).toEqual([
      { chave: 'marco', n: 3 },
      { chave: 'diario_vitoria', n: 2 },
      { chave: 'evento_positivo', n: 1 },
    ]);
  });

  it('inclui tarefa_concluida no top', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [
        tarefaConcluida(1, 'a'),
        tarefaConcluida(2, 'b'),
        tarefaConcluida(3, 'c'),
      ],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.topConquistas).toEqual([{ chave: 'tarefa_concluida', n: 3 }]);
  });

  it('respeita filtro de periodo (so conquistas dentro do recorte)', () => {
    const r = calcularStatsAgregadas({
      humor: [],
      diarios: [
        diarioConquista(2), // dentro de 7d
        diarioConquista(20), // fora de 7d
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: '7d',
      agora: AGORA,
    });
    expect(r.topConquistas).toEqual([{ chave: 'diario_vitoria', n: 1 }]);
  });
});

describe('stats/calcular: determinismo cross-device', () => {
  it('mesma entrada produz mesma saida byte-a-byte', () => {
    const input = {
      humor: [humorEmDias(1, 3), humorEmDias(2, 4)],
      diarios: [diarioGatilho(1, ['x', 'y']), diarioConquista(2)],
      eventos: [eventoPositivo(3)],
      marcos: [marco(4)],
      contadores: [contador('a', 10), contador('b', 5)],
      tarefas: [tarefaConcluida(1, 'tarefa um')],
      periodo: '7d' as const,
      agora: AGORA,
    };
    const r1 = calcularStatsAgregadas(input);
    const r2 = calcularStatsAgregadas(input);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

describe('stats/calcular: lacunas temporais', () => {
  it('vault so com dados antigos: humorMedio7d=null mas humorMedioAll=valor', () => {
    const r = calcularStatsAgregadas({
      humor: [humorEmDias(100, 4), humorEmDias(200, 5)],
      diarios: [],
      eventos: [],
      marcos: [],
      contadores: [],
      tarefas: [],
      periodo: 'all',
      agora: AGORA,
    });
    expect(r.humorMedio7d).toBeNull();
    expect(r.humorMedio30d).toBeNull();
    expect(r.humorMedio90d).toBeNull();
    expect(r.humorMedioAll).toBe(4.5);
  });
});
