// Testes da notificacao pre-evento do Google Calendar.
// R-INT-2-CALENDAR-NOTIF-PROXIMO (2026-05-25).
//
// Cobre:
//   1. So agenda eventos cujo disparo (inicio - 15min) e' futuro.
//   2. Janela fixa de 15min: o trigger DATE bate inicio - 15min.
//   3. Conteudo PT-BR sobrio (titulo + corpo, sem emoji/exclamacao).
//   4. Idempotencia: re-agendar o mesmo evento nao duplica (1 schedule).
//   5. Re-sync com snapshot diferente cancela os antigos e agenda os
//      novos (eventos removidos somem).
//   6. Inicio invalido e' ignorado sem quebrar os demais.
//
// expo-notifications ja e' mockado em jest.setup.cjs (Map in-memory:
// schedule/cancel/getAll funcionam). Usamos esse mock direto.
//
// Comentarios sem acento (convencao shell/CI).

import * as Notifications from 'expo-notifications';
import { agendarNotifsPreEvento } from '@/lib/notifications/calendarPreEvent';
import type { AgendaEvento } from '@/lib/vault/agenda';

const PREFIX = 'calendar-preevent-';
const MIN_15_MS = 15 * 60 * 1000;

function evento(id: string, inicioIso: string): AgendaEvento {
  return {
    id,
    pessoa: 'pessoa_a',
    titulo: `Reuniao ${id}`,
    inicio: inicioIso,
    fim: inicioIso,
    fonte: 'google_calendar',
    sincronizado_em: '2026-05-25T12:00:00.000Z',
  };
}

async function agendadosPreEvento() {
  const todos = await Notifications.getAllScheduledNotificationsAsync();
  return todos.filter((n) => n.identifier.startsWith(PREFIX));
}

describe('agendarNotifsPreEvento', () => {
  const agora = new Date('2026-05-25T12:00:00.000Z');

  beforeEach(async () => {
    // Limpa qualquer schedule deixado por outro teste.
    const todos = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of todos) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    jest.clearAllMocks();
  });

  it('agenda evento futuro com disparo a inicio - 15min', async () => {
    // Inicio bem no futuro (1h adiante): disparo = 12:45.
    const inicio = '2026-05-25T13:00:00.000Z';
    await agendarNotifsPreEvento([evento('e1', inicio)], agora);

    const ativos = await agendadosPreEvento();
    expect(ativos).toHaveLength(1);
    const sched = ativos[0];
    expect(sched.identifier).toBe(`${PREFIX}e1`);

    const esperadoMs = new Date(inicio).getTime() - MIN_15_MS;
    const date = (sched.trigger as { date: Date }).date;
    expect(new Date(date).getTime()).toBe(esperadoMs);
  });

  it('conteudo PT-BR sobrio: titulo fixo + corpo com titulo do evento', async () => {
    await agendarNotifsPreEvento(
      [evento('e1', '2026-05-25T13:00:00.000Z')],
      agora
    );
    const ativos = await agendadosPreEvento();
    const content = ativos[0].content as { title: string; body: string };
    expect(content.title).toBe('Evento em 15min');
    expect(content.body).toBe('Reuniao e1');
    // Tom sobrio: sem exclamacao.
    expect(content.title).not.toContain('!');
    expect(content.body).not.toContain('!');
  });

  it('ignora evento ja passado', async () => {
    // Inicio no passado: disparo tambem no passado.
    await agendarNotifsPreEvento(
      [evento('passado', '2026-05-25T10:00:00.000Z')],
      agora
    );
    expect(await agendadosPreEvento()).toHaveLength(0);
  });

  it('ignora evento a menos de 15min (disparo no passado)', async () => {
    // Inicio em 10min: inicio - 15min = 5min no passado. Nao agenda.
    await agendarNotifsPreEvento(
      [evento('curto', '2026-05-25T12:10:00.000Z')],
      agora
    );
    expect(await agendadosPreEvento()).toHaveLength(0);
  });

  it('agenda exatamente quando disparo coincide com fronteira futura', async () => {
    // Inicio em 16min: disparo em +1min => futuro => agenda.
    await agendarNotifsPreEvento(
      [evento('limite', '2026-05-25T12:16:00.000Z')],
      agora
    );
    expect(await agendadosPreEvento()).toHaveLength(1);
  });

  it('idempotencia: re-agendar o mesmo evento nao duplica', async () => {
    const lista = [evento('e1', '2026-05-25T13:00:00.000Z')];
    await agendarNotifsPreEvento(lista, agora);
    await agendarNotifsPreEvento(lista, agora);

    const ativos = await agendadosPreEvento();
    expect(ativos).toHaveLength(1);
    expect(ativos[0].identifier).toBe(`${PREFIX}e1`);
  });

  it('re-sync com snapshot diferente cancela os antigos', async () => {
    // Primeiro sync: e1 e e2 futuros.
    await agendarNotifsPreEvento(
      [
        evento('e1', '2026-05-25T13:00:00.000Z'),
        evento('e2', '2026-05-25T14:00:00.000Z'),
      ],
      agora
    );
    expect(await agendadosPreEvento()).toHaveLength(2);

    // Segundo sync: e2 foi removido, e3 surgiu. e1 mantido.
    await agendarNotifsPreEvento(
      [
        evento('e1', '2026-05-25T13:00:00.000Z'),
        evento('e3', '2026-05-25T15:00:00.000Z'),
      ],
      agora
    );

    const ativos = await agendadosPreEvento();
    const ids = ativos.map((n) => n.identifier).sort();
    expect(ids).toEqual([`${PREFIX}e1`, `${PREFIX}e3`]);
  });

  it('inicio invalido e ignorado sem quebrar os demais', async () => {
    await agendarNotifsPreEvento(
      [
        evento('invalido', 'nao-e-data'),
        evento('valido', '2026-05-25T13:00:00.000Z'),
      ],
      agora
    );
    const ativos = await agendadosPreEvento();
    expect(ativos).toHaveLength(1);
    expect(ativos[0].identifier).toBe(`${PREFIX}valido`);
  });

  it('lista vazia: nenhum schedule', async () => {
    await agendarNotifsPreEvento([], agora);
    expect(await agendadosPreEvento()).toHaveLength(0);
  });
});
