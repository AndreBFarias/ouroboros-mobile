// Wrapper sobre expo-notifications para os 3 lembretes diarios da
// tela de Settings (CONTRACT seção 1.5: lembretes.medicacao,
// lembretes.treino, lembretes.humor). API minima: schedule por chave
// + cancel por chave. ID de notificação = "ouroboros.lembrete.<chave>".
//
// Comportamento canonico (Decisão M15 - seção 11 do spec):
//   - 1 schedule por lembrete com `repeats: true`. Diario simples,
//     sem weekday-specific.
//   - Permissao pedida just-in-time no toggle on. Falha ou recusa
//     volta `false` e a UI deve refletir desligado.
//   - Toggle off cancela o agendamento (deleta) sem perguntar.
//   - Re-schedule (toggle off->on com horario novo) sempre cancela
//     antes para evitar duplicidade.
//
// Plataforma:
//   - Android nativo: usa channel `default` (registrado em app.json).
//   - Web: expo-notifications não tem implementacao Web útil; cai em
//     no-op silencioso para não quebrar o smoke do Chrome.
//   - iOS: não alvo principal, mas a API e a mesma.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type LembreteChave = 'medicacao' | 'treino' | 'humor';

const ID_PREFIX = 'ouroboros.lembrete.';

// Titulos default (sentence case com acentuacao PT-BR completa).
// Body opcional para não virar empurrao com tom culpado.
const TITULOS: Record<LembreteChave, string> = {
  medicacao: 'Medicação',
  treino: 'Treino',
  humor: 'Humor diário',
};

const CORPOS: Record<LembreteChave, string> = {
  medicacao: 'Lembre-se da medicação.',
  treino: 'Hora do treino.',
  humor: 'Como está o humor agora?',
};

// Converte "HH:MM" 24h em { hour, minute } numeric. Aceita "9:00" sem
// padding zero. Retorna null se invalido (caller deve assumir 09:00
// fallback ou registrar erro).
export function parseHorario(
  horario: string
): { hour: number; minute: number } | null {
  const match = horario.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return { hour, minute };
}

// Pede permissao se ainda não tiver. Retorna true se concedida.
// No web (sem implementacao nativa), retorna false silenciosamente.
export async function pedirPermissao(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return true;
  if (!status.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// Agenda lembrete diario na chave. Cancela qualquer schedule
// pre-existente para a mesma chave antes (evita duplicidade).
// Retorna true em sucesso, false em falha de permissao.
export async function agendarLembrete(
  chave: LembreteChave,
  horario: string
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const tempo = parseHorario(horario);
  if (!tempo) return false;
  const ok = await pedirPermissao();
  if (!ok) return false;
  await cancelarLembrete(chave);
  // SDK 54: trigger por DailyTriggerInput exige `type: 'daily'` explicito.
  await Notifications.scheduleNotificationAsync({
    identifier: `${ID_PREFIX}${chave}`,
    content: {
      title: TITULOS[chave],
      body: CORPOS[chave],
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: tempo.hour,
      minute: tempo.minute,
    },
  });
  return true;
}

// Cancela schedule da chave (idempotente: não falha se não existe).
export async function cancelarLembrete(chave: LembreteChave): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(
      `${ID_PREFIX}${chave}`
    );
  } catch {
    // Sem schedule previo; ok.
  }
}

// Útil para debug/Settings: lista todos os lembretes agendados.
// Retorna so os identifiers que comecam com nosso prefixo (ignora
// agendas de outras features futuras).
export async function listarAgendados(): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  const lista = await Notifications.getAllScheduledNotificationsAsync();
  return lista
    .filter((n) => n.identifier.startsWith(ID_PREFIX))
    .map((n) => n.identifier);
}

// Cancela tudo (útil em testes e em "limpar dados" futuro).
export async function cancelarTudo(): Promise<void> {
  if (Platform.OS === 'web') return;
  for (const chave of ['medicacao', 'treino', 'humor'] as LembreteChave[]) {
    await cancelarLembrete(chave);
  }
}

// Boot hook: deprecado em sprint M29 (settings v2 removeu a chave
// `lembretes`). Mantido como no-op para nao quebrar BOOT_HOOKS ate
// M30 substituir por `reagendarAlarmesPreCadastrados()` quando
// lembretes virarem alarmes pre-cadastrados absorvidos pela tela
// de Alarmes. Cancela qualquer schedule legado remanescente para
// evitar disparo orfao em dispositivos que tinham lembretes ativos
// no shape v1.
export async function reagendarLembretes(): Promise<void> {
  if (Platform.OS === 'web') return;
  // Limpa schedules antigos do shape v1 (idempotente; nao falha se
  // nao existirem). M30 reagendara conforme novo modelo.
  await cancelarTudo();
}
