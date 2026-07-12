// Testes do helper puro mesclarAgendaAlarmes (R-HOME-2). Cobre:
//  - Apenas eventos (sem alarmes/tarefas).
//  - Apenas alarmes/tarefas (graceful fallback sem OAuth conectado).
//  - Mescla eventos + alarmes + tarefas com ordenacao cronologica.
//  - Limite hard de 3 itens.
//  - Eventos fora da janela 4h filtrados.
//  - Eventos passados filtrados.
//  - ISO datetime invalido ignorado.
//
// Comentarios sem acento (convencao shell/CI).
import {
  mesclarAgendaAlarmes,
  LIMITE_PROXIMOS,
  __test__,
} from '@/lib/proximos/mesclarAgendaAlarmes';
import type { AgendaEvento } from '@/lib/vault/agenda';
import type { ItemProximo } from '@/lib/hooks/useProximos';

const { eventoParaItem } = __test__;

const TS_AGORA = '2026-05-04T08:00:00-03:00';

function eventoBase(over: Partial<AgendaEvento> = {}): AgendaEvento {
  return {
    id: 'ev-1',
    pessoa: 'pessoa_a',
    titulo: 'Reuniao de equipe',
    inicio: '2026-05-04T09:00:00-03:00',
    fim: '2026-05-04T10:00:00-03:00',
    fonte: 'google_calendar',
    sincronizado_em: '2026-05-04T07:00:00-03:00',
    ...over,
  };
}

function itemAlarme(
  iso: string,
  titulo: string = 'Alarme'
): ItemProximo {
  return {
    tipo: 'alarme',
    id: `alarme-${titulo}`,
    titulo,
    hora: iso.slice(11, 16),
    iso,
  };
}

function itemTarefa(
  iso: string,
  titulo: string = 'Tarefa'
): ItemProximo {
  return {
    tipo: 'tarefa',
    id: `tarefa-${titulo}`,
    titulo,
    hora: iso.slice(11, 16),
    iso,
    feita: false,
  };
}

test('eventoParaItem: evento dentro da janela vira ItemProximo evento', () => {
  const agora = new Date(TS_AGORA);
  const limite = new Date(agora.getTime() + 4 * 3600_000);
  const ev = eventoBase({
    inicio: '2026-05-04T09:30:00-03:00',
    titulo: 'Cafe da manha',
  });
  const item = eventoParaItem(ev, agora, limite);
  expect(item).not.toBeNull();
  expect(item!.tipo).toBe('evento');
  expect(item!.titulo).toBe('Cafe da manha');
  expect(item!.hora).toBe('09:30');
  expect(item!.id).toBe(ev.id);
});

test('eventoParaItem: evento passado retorna null', () => {
  const agora = new Date(TS_AGORA);
  const limite = new Date(agora.getTime() + 4 * 3600_000);
  const ev = eventoBase({
    inicio: '2026-05-04T07:00:00-03:00',
  });
  expect(eventoParaItem(ev, agora, limite)).toBeNull();
});

test('eventoParaItem: evento alem da janela 4h retorna null', () => {
  const agora = new Date(TS_AGORA);
  const limite = new Date(agora.getTime() + 4 * 3600_000);
  const ev = eventoBase({
    inicio: '2026-05-04T14:00:00-03:00',
  });
  expect(eventoParaItem(ev, agora, limite)).toBeNull();
});

test('eventoParaItem: ISO invalido retorna null', () => {
  const agora = new Date(TS_AGORA);
  const limite = new Date(agora.getTime() + 4 * 3600_000);
  const ev = eventoBase({ inicio: 'data-totalmente-invalida' });
  expect(eventoParaItem(ev, agora, limite)).toBeNull();
});

test('mesclarAgendaAlarmes: apenas eventos -> retorna eventos ordenados', () => {
  const agora = new Date(TS_AGORA);
  const eventos = [
    eventoBase({
      id: 'ev-tarde',
      inicio: '2026-05-04T10:00:00-03:00',
      titulo: 'Tarde',
    }),
    eventoBase({
      id: 'ev-cedo',
      inicio: '2026-05-04T08:30:00-03:00',
      titulo: 'Cedo',
    }),
  ];
  const out = mesclarAgendaAlarmes({
    eventos,
    itensAlarmesETarefas: [],
    agora,
  });
  expect(out.length).toBe(2);
  expect(out[0].titulo).toBe('Cedo');
  expect(out[1].titulo).toBe('Tarde');
  expect(out.every((i) => i.tipo === 'evento')).toBe(true);
});

test('mesclarAgendaAlarmes: apenas alarmes/tarefas (sem OAuth) -> mesmos itens ordenados', () => {
  const agora = new Date(TS_AGORA);
  const itens = [
    itemAlarme('2026-05-04T09:30:00-03:00', 'Medicacao'),
    itemTarefa('2026-05-04T08:30:00-03:00', 'Tomar agua'),
  ];
  const out = mesclarAgendaAlarmes({
    eventos: [],
    itensAlarmesETarefas: itens,
    agora,
  });
  expect(out.length).toBe(2);
  expect(out[0].titulo).toBe('Tomar agua');
  expect(out[1].titulo).toBe('Medicacao');
});

test('mesclarAgendaAlarmes: mescla 2 eventos + 1 alarme -> ordem cronologica unica', () => {
  const agora = new Date(TS_AGORA);
  const eventos = [
    eventoBase({
      id: 'ev-1',
      inicio: '2026-05-04T08:30:00-03:00',
      titulo: 'Reuniao 1',
    }),
    eventoBase({
      id: 'ev-2',
      inicio: '2026-05-04T11:00:00-03:00',
      titulo: 'Reuniao 2',
    }),
  ];
  const itens = [itemAlarme('2026-05-04T09:30:00-03:00', 'Medicacao')];
  const out = mesclarAgendaAlarmes({
    eventos,
    itensAlarmesETarefas: itens,
    agora,
  });
  expect(out.length).toBe(3);
  expect(out.map((i) => i.titulo)).toEqual([
    'Reuniao 1',
    'Medicacao',
    'Reuniao 2',
  ]);
  expect(out.map((i) => i.tipo)).toEqual(['evento', 'alarme', 'evento']);
});

test('mesclarAgendaAlarmes: limite hard de 3 itens', () => {
  expect(LIMITE_PROXIMOS).toBe(3);
  const agora = new Date(TS_AGORA);
  const eventos = [
    eventoBase({
      id: 'ev-1',
      inicio: '2026-05-04T08:30:00-03:00',
      titulo: 'E1',
    }),
    eventoBase({
      id: 'ev-2',
      inicio: '2026-05-04T09:00:00-03:00',
      titulo: 'E2',
    }),
  ];
  const itens = [
    itemAlarme('2026-05-04T09:30:00-03:00', 'A1'),
    itemAlarme('2026-05-04T10:00:00-03:00', 'A2'),
    itemTarefa('2026-05-04T10:30:00-03:00', 'T1'),
  ];
  const out = mesclarAgendaAlarmes({
    eventos,
    itensAlarmesETarefas: itens,
    agora,
  });
  expect(out.length).toBe(3);
  // Os 3 primeiros cronologicamente: E1, E2, A1
  expect(out.map((i) => i.titulo)).toEqual(['E1', 'E2', 'A1']);
});

test('mesclarAgendaAlarmes: evento fora janela 4h filtrado', () => {
  const agora = new Date(TS_AGORA);
  const eventos = [
    eventoBase({
      id: 'ev-tarde',
      inicio: '2026-05-04T14:00:00-03:00',
      titulo: 'Tarde demais',
    }),
    eventoBase({
      id: 'ev-cedo',
      inicio: '2026-05-04T09:00:00-03:00',
      titulo: 'Dentro janela',
    }),
  ];
  const out = mesclarAgendaAlarmes({
    eventos,
    itensAlarmesETarefas: [],
    agora,
  });
  expect(out.length).toBe(1);
  expect(out[0].titulo).toBe('Dentro janela');
});

test('mesclarAgendaAlarmes: evento passado filtrado', () => {
  const agora = new Date(TS_AGORA);
  const eventos = [
    eventoBase({
      id: 'ev-passado',
      inicio: '2026-05-04T07:00:00-03:00',
      titulo: 'Ja passou',
    }),
    eventoBase({
      id: 'ev-futuro',
      inicio: '2026-05-04T09:00:00-03:00',
      titulo: 'Futuro',
    }),
  ];
  const out = mesclarAgendaAlarmes({
    eventos,
    itensAlarmesETarefas: [],
    agora,
  });
  expect(out.length).toBe(1);
  expect(out[0].titulo).toBe('Futuro');
});

test('mesclarAgendaAlarmes: lista vazia -> array vazio', () => {
  const out = mesclarAgendaAlarmes({
    eventos: [],
    itensAlarmesETarefas: [],
    agora: new Date(TS_AGORA),
  });
  expect(out).toEqual([]);
});
