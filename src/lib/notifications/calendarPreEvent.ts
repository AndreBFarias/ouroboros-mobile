// Notificacao pre-evento do Google Calendar (R-INT-2-CALENDAR-NOTIF-PROXIMO,
// 2026-05-25).
//
// Para cada evento de agenda sincronizado cujo inicio esta no futuro
// proximo, agenda UMA notificacao local para `inicio - 15min`. Janela
// fixa de 15 minutos (decisao do dono: simples, sem configuracao).
//
// REUSO do padrao de expo-notifications de alarmesNotificacoes.ts:
//   - identifier determinístico por evento (`calendar-preevent-<id>`),
//   - cancelamento idempotente por prefixo antes de re-agendar,
//   - no-op silencioso em Web (Platform.OS === 'web').
//
// GATE: esta funcao roda dentro do fluxo de sync do Calendar, que ja e'
// guardado pelo toggle `googleCalendarSync` (src/lib/stores/settings.ts).
// Por isso NAO criamos sub-toggle proprio: se o sync esta desligado, os
// eventos nem chegam aqui e nenhuma notificacao e' agendada. Mantem
// simples (decisao do dono).
//
// Idempotencia: ao re-sincronizar, cancelamos TODOS os schedules do
// prefixo desta feature antes de re-agendar os eventos futuros atuais.
// Isso garante que eventos removidos/passados deixem de notificar e que
// nao haja duplicidade do mesmo event.id.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { AgendaEvento } from '@/lib/vault/agenda';

// Prefixo canonico dos identifiers desta feature. Distinto do prefixo
// 'ouroboros.alarme.' dos alarmes pessoais para nao colidir.
const ID_PREFIX = 'calendar-preevent-';

// Janela fixa de antecedencia: 15 minutos antes do inicio do evento.
const ANTECEDENCIA_MIN = 15;
const ANTECEDENCIA_MS = ANTECEDENCIA_MIN * 60 * 1000;

// Identifier determinístico por evento. Mesmo event.id => mesmo
// identifier => re-agendar sobrescreve em vez de duplicar.
function idEvento(eventoId: string): string {
  return `${ID_PREFIX}${eventoId}`;
}

// Cancela todos os schedules desta feature. Idempotente. Chamado antes
// de re-agendar para refletir o snapshot atual (eventos removidos ou ja
// passados somem; nenhuma duplicidade sobra).
async function cancelarTodosPreEvento(): Promise<void> {
  const lista = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of lista) {
    if (item.identifier.startsWith(ID_PREFIX)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      } catch {
        // Ignora falhas individuais; cancelamento e' best-effort.
      }
    }
  }
}

// Agenda notificacoes pre-evento para os eventos de agenda passados.
// Regras:
//   - Cancela tudo do prefixo antes (idempotencia + limpeza de drift).
//   - Para cada evento com `inicio` valido cujo disparo (inicio - 15min)
//     ainda esta no futuro em relacao a `agora`, agenda 1 schedule DATE.
//   - Eventos com inicio invalido, ja passados, ou cujo disparo ja
//     passou sao ignorados (sem notificacao retroativa).
//
// Em Web vira no-op silencioso (smoke do Chrome nao agenda nada nativo).
export async function agendarNotifsPreEvento(
  eventos: AgendaEvento[],
  agora: Date
): Promise<void> {
  if (Platform.OS === 'web') return;

  // Limpeza/idempotencia: parte sempre de um estado conhecido.
  await cancelarTodosPreEvento();

  const agoraMs = agora.getTime();

  for (const ev of eventos) {
    const inicioMs = new Date(ev.inicio).getTime();
    // Ignora datas invalidas.
    if (Number.isNaN(inicioMs)) continue;

    const disparoMs = inicioMs - ANTECEDENCIA_MS;
    // So agenda se o disparo ainda e' futuro. Cobre tanto eventos ja
    // passados quanto eventos a menos de 15min (disparo no passado).
    if (disparoMs <= agoraMs) continue;

    const identifier = idEvento(ev.id);
    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          // Strings UI com acentuacao completa PT-BR, tom sobrio, sem
          // emoji nem exclamacao.
          title: 'Evento em 15min',
          body: ev.titulo,
          data: { tipo: 'calendar-preevent', eventoId: ev.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(disparoMs),
        },
      });
    } catch {
      // Erro de agendamento individual nao derruba os demais eventos.
    }
  }
}
