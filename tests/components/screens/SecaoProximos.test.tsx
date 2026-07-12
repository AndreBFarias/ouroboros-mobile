// Testes da logica pura de useProximos (M40, estendido em R-HOME-2).
// Cobre:
//  - Alarme inativo nao entra.
//  - Alarme diario com horario futuro hoje entra.
//  - Alarme fora da janela 4h nao entra.
//  - Alarme semanal pega o dia da semana correto.
//  - Tarefa com alarme hoje entra; tarefa de outro dia nao.
//  - Ordenacao cronologica.
//  - R-HOME-2: eventos da agenda Google entram, ordem cronologica unica.
//  - R-HOME-2: limite hard de 3 itens respeitado.
//  - R-HOME-2: fallback sem OAuth (eventos===[]) preserva comportamento.
import { construirProximos, __test__ } from '@/lib/hooks/useProximos';
import type { Alarme } from '@/lib/schemas/alarme';
import type { Tarefa } from '@/lib/schemas/tarefa';
import type { AgendaEvento } from '@/lib/vault/agenda';

const { proximoDisparo } = __test__;

function alarmeBase(over: Partial<Alarme> = {}): Alarme {
  return {
    tipo: 'alarme',
    slug: 'medicacao-manha',
    titulo: 'Medicação manhã',
    horario: '09:00',
    dias_semana: [1, 2, 3, 4, 5],
    recorrencia: 'semanal',
    tag: 'medicacao',
    som: 'gentle',
    ativo: true,
    snooze_minutos: 5,
    criado_em: '2026-05-01T08:00:00-03:00',
    ultimo_disparo: null,
    notification_ids: [],
    snooze_id: null,
    ...over,
  } as Alarme;
}

function tarefaBase(over: Partial<Tarefa> = {}): Tarefa {
  return {
    tipo: 'tarefa',
    data: '2026-05-04',
    autor: 'pessoa_a',
    titulo: 'Comprar pão',
    feito: false,
    feito_em: null,
    categoria: 'casa',
    pessoa_destino: { tipo: 'mim' },
    alarme: null,
    ...over,
  } as Tarefa;
}

test('proximoDisparo: alarme inativo devolve null', () => {
  const alarme = alarmeBase({ ativo: false });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  expect(proximoDisparo(alarme, agora)).toBeNull();
});

test('proximoDisparo: alarme diario futuro hoje entra', () => {
  const alarme = alarmeBase({
    recorrencia: 'diaria',
    horario: '10:00',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const iso = proximoDisparo(alarme, agora);
  expect(iso).not.toBeNull();
  expect(iso!.includes('10:00')).toBe(true);
});

test('proximoDisparo: alarme diario passado vai para amanha', () => {
  const alarme = alarmeBase({
    recorrencia: 'diaria',
    horario: '06:00',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const iso = proximoDisparo(alarme, agora);
  expect(iso).not.toBeNull();
  // ISO deve ser de 05/05 ou 06/05 dependendo do fuso de execucao,
  // mas garantidamente >= agora.
  expect(new Date(iso!).getTime()).toBeGreaterThanOrEqual(agora.getTime());
});

test('proximoDisparo: alarme semanal pega proximo dia listado', () => {
  // Domingo 2026-05-03; segunda 04. Lista [3=quarta]; pula 3 dias.
  const alarme = alarmeBase({
    recorrencia: 'semanal',
    dias_semana: [3],
    horario: '09:00',
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const iso = proximoDisparo(alarme, agora);
  expect(iso).not.toBeNull();
  // Quarta 06/05/2026.
  expect(iso!.startsWith('2026-05-06')).toBe(true);
});

test('construirProximos: filtra alarme fora da janela 4h', () => {
  // Alarme as 18h, agora 08h => fora dos 4h.
  const alarme = alarmeBase({
    recorrencia: 'diaria',
    horario: '18:00',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const itens = construirProximos([alarme], [], agora);
  expect(itens).toEqual([]);
});

test('construirProximos: alarme dentro da janela aparece', () => {
  // Alarme as 09:30, agora 08:00 => dentro de 4h.
  const alarme = alarmeBase({
    recorrencia: 'diaria',
    horario: '09:30',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const itens = construirProximos([alarme], [], agora);
  expect(itens.length).toBe(1);
  expect(itens[0].tipo).toBe('alarme');
  expect(itens[0].titulo).toBe('Medicação manhã');
  expect(itens[0].hora).toBe('09:30');
});

test('construirProximos: tarefa com alarme hoje entra; tarefa de outro dia nao', () => {
  const t1 = tarefaBase({
    titulo: 'Tarefa hoje',
    alarme: {
      ativo: true,
      data_hora_iso: '2026-05-04T15:00:00-03:00',
      recorrencia: 'unica',
    },
  });
  const t2 = tarefaBase({
    titulo: 'Tarefa amanha',
    alarme: {
      ativo: true,
      data_hora_iso: '2026-05-05T15:00:00-03:00',
      recorrencia: 'unica',
    },
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const itens = construirProximos(
    [],
    [
      { meta: t1, rel: 'tarefas/2026-05-04-tarefa-hoje.md' },
      { meta: t2, rel: 'tarefas/2026-05-04-tarefa-amanha.md' },
    ],
    agora
  );
  expect(itens.length).toBe(1);
  expect(itens[0].titulo).toBe('Tarefa hoje');
  expect(itens[0].tipo).toBe('tarefa');
  expect(itens[0].hora).toBe('15:00');
});

test('construirProximos: ordenacao cronologica asc', () => {
  const a1 = alarmeBase({
    slug: 'a-tarde',
    titulo: 'Tarde',
    recorrencia: 'diaria',
    horario: '11:00',
    dias_semana: [],
  });
  const a2 = alarmeBase({
    slug: 'a-manha',
    titulo: 'Manhã cedo',
    recorrencia: 'diaria',
    horario: '09:30',
    dias_semana: [],
  });
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const itens = construirProximos([a1, a2], [], agora);
  expect(itens.map((i) => i.titulo)).toEqual(['Manhã cedo', 'Tarde']);
});

// ----------------------------------------------------------------------
// R-HOME-2: mescla agenda + alarmes/tarefas
// ----------------------------------------------------------------------

function eventoBase(over: Partial<AgendaEvento> = {}): AgendaEvento {
  return {
    id: 'ev-reuniao',
    pessoa: 'pessoa_a',
    titulo: 'Reuniao 1:1',
    inicio: '2026-05-04T09:30:00-03:00',
    fim: '2026-05-04T10:00:00-03:00',
    fonte: 'google_calendar',
    sincronizado_em: '2026-05-04T07:00:00-03:00',
    ...over,
  };
}

test('construirProximos R-HOME-2: 2 eventos + 1 alarme -> ordem cronologica unica', () => {
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const alarme = alarmeBase({
    slug: 'medicacao',
    titulo: 'Medicação',
    recorrencia: 'diaria',
    horario: '09:00',
    dias_semana: [],
  });
  const eventos = [
    eventoBase({
      id: 'ev-A',
      titulo: 'Cafe da manha',
      inicio: '2026-05-04T08:30:00-03:00',
    }),
    eventoBase({
      id: 'ev-B',
      titulo: 'Reuniao tarde',
      inicio: '2026-05-04T11:00:00-03:00',
    }),
  ];
  const itens = construirProximos([alarme], [], agora, eventos);
  expect(itens.length).toBe(3);
  expect(itens.map((i) => i.titulo)).toEqual([
    'Cafe da manha',
    'Medicação',
    'Reuniao tarde',
  ]);
  expect(itens.map((i) => i.tipo)).toEqual(['evento', 'alarme', 'evento']);
  // Cada evento expoe id estavel do Google.
  expect(itens[0].id).toBe('ev-A');
  expect(itens[2].id).toBe('ev-B');
});

test('construirProximos R-HOME-2: fallback sem OAuth (eventos===undefined) preserva legado', () => {
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const alarme = alarmeBase({
    slug: 'medicacao',
    titulo: 'Medicação',
    recorrencia: 'diaria',
    horario: '09:00',
    dias_semana: [],
  });
  const itens = construirProximos([alarme], [], agora);
  expect(itens.length).toBe(1);
  expect(itens[0].tipo).toBe('alarme');
  expect(itens[0].titulo).toBe('Medicação');
});

test('construirProximos R-HOME-2: fallback explicito eventos=[] e identico a undefined', () => {
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const alarme = alarmeBase({
    slug: 'medicacao',
    titulo: 'Medicação',
    recorrencia: 'diaria',
    horario: '09:00',
    dias_semana: [],
  });
  const semParam = construirProximos([alarme], [], agora);
  const comArrayVazio = construirProximos([alarme], [], agora, []);
  expect(comArrayVazio).toEqual(semParam);
});

test('construirProximos R-HOME-2: limite hard de 3 itens', () => {
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const eventos = [
    eventoBase({
      id: 'ev-1',
      titulo: 'E1',
      inicio: '2026-05-04T08:30:00-03:00',
    }),
    eventoBase({
      id: 'ev-2',
      titulo: 'E2',
      inicio: '2026-05-04T09:00:00-03:00',
    }),
    eventoBase({
      id: 'ev-3',
      titulo: 'E3',
      inicio: '2026-05-04T09:30:00-03:00',
    }),
    eventoBase({
      id: 'ev-4',
      titulo: 'E4',
      inicio: '2026-05-04T10:00:00-03:00',
    }),
  ];
  const itens = construirProximos([], [], agora, eventos);
  expect(itens.length).toBe(3);
  expect(itens.map((i) => i.titulo)).toEqual(['E1', 'E2', 'E3']);
});

test('construirProximos R-HOME-2: evento fora janela 4h e filtrado', () => {
  const agora = new Date('2026-05-04T08:00:00-03:00');
  const eventos = [
    eventoBase({
      id: 'ev-tarde',
      titulo: 'Tarde demais',
      // 14h: alem da janela [08, 12].
      inicio: '2026-05-04T14:00:00-03:00',
    }),
  ];
  const itens = construirProximos([], [], agora, eventos);
  expect(itens.length).toBe(0);
});
