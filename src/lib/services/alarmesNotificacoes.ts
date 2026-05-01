// Wrapper sobre expo-notifications para alarmes pessoais (M16).
// Diferente do notificacoesLembretes (3 chaves diarias do Settings),
// alarmes são individuais, recorrentes por dia da semana e expoem
// snooze/desligar via category com action buttons.
//
// Convencoes de identifier:
//   - 1 schedule por dia da semana de cada alarme:
//       'ouroboros.alarme.<slug>.d<0-6>'
//   - 1 snooze one-shot opcional:
//       'ouroboros.alarme.<slug>.snooze'
//
// reagendarAlarmes() le todos os alarmes do Vault e re-cria schedules
// para os ativos. Idempotente: cancela schedules antigos do prefixo
// antes para evitar drift após boot.
//
// Em Web cai em no-op silencioso (Platform.OS === 'web') para não
// quebrar smoke do Chrome.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  AlarmeSchema,
  LIMITE_SCHEDULES,
  type Alarme,
  type AlarmeSom,
} from '@/lib/schemas/alarme';
import {
  ALARME_CATEGORY_ID,
  ALARME_CHANNEL_ID,
} from '@/lib/services/notificationActions';

// Prefixo canonico dos identifiers desta feature.
const ID_PREFIX = 'ouroboros.alarme.';

// Sufixos por papel.
function idDia(slug: string, dia: number): string {
  return `${ID_PREFIX}${slug}.d${dia}`;
}

function idSnooze(slug: string): string {
  return `${ID_PREFIX}${slug}.snooze`;
}

// Mapa interno: slug do som -> arquivo .wav empacotado. O nome do
// arquivo (sem extensao) e o que expo-notifications resolve via
// Android resource. SDK 54: a string vai direto em content.sound.
const SOM_FILE: Record<AlarmeSom, string> = {
  gentle: 'gentle.wav',
  normal: 'normal.wav',
  forte: 'forte.wav',
};

export function nomeArquivoSom(som: AlarmeSom): string {
  return SOM_FILE[som];
}

// Pede permissao se ainda não tiver. Em Web retorna false silenciosamente.
export async function pedirPermissao(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return true;
  if (!status.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// Conta quantos schedules dessa feature estao ativos. Usado para
// respeitar o cap de 64 (decisão do spec, seção 11).
export async function contarSchedulesAlarmes(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const lista = await Notifications.getAllScheduledNotificationsAsync();
  return lista.filter((n) => n.identifier.startsWith(ID_PREFIX)).length;
}

// Resultado de agendarAlarme. Em sucesso retorna ids. Em estouro de
// cap retorna estourou=true e ids=[].
export interface AgendarResultado {
  ids: string[];
  estourou: boolean;
}

// Parseia "HH:MM" 24h em { hour, minute }. Retorna null se invalido.
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

// Agenda um alarme: 1 schedule por dia da semana presente em
// alarme.dias_semana. Cancela schedules previos do mesmo slug antes
// para evitar duplicidade. Retorna array de identifiers (vazio se
// agendamento não foi possivel) e flag estourou=true quando o cap
// global de 64 foi atingido.
//
// Em Web vira no-op (ids=[], estourou=false).
export async function agendarAlarme(
  alarme: Alarme
): Promise<AgendarResultado> {
  if (Platform.OS === 'web') return { ids: [], estourou: false };
  const parsed = AlarmeSchema.safeParse(alarme);
  if (!parsed.success) return { ids: [], estourou: false };
  const tempo = parseHorario(parsed.data.horario);
  if (!tempo) return { ids: [], estourou: false };
  const ok = await pedirPermissao();
  if (!ok) return { ids: [], estourou: false };

  // Cancela qualquer schedule previo deste slug.
  await cancelarAlarme(parsed.data.slug);

  // Verifica cap antes de criar os novos. dias_semana.length adicionais.
  const ativos = await contarSchedulesAlarmes();
  if (ativos + parsed.data.dias_semana.length > LIMITE_SCHEDULES) {
    return { ids: [], estourou: true };
  }

  const ids: string[] = [];
  for (const dia of parsed.data.dias_semana) {
    const identifier = idDia(parsed.data.slug, dia);
    // expo-notifications WeeklyTriggerInput: weekday 1=domingo,
    // 7=sabado (formato iOS-like). Convertendo: 0=domingo -> 1.
    const weekday = ((dia % 7) + 1);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: parsed.data.titulo,
        // Body vazio: notificação simples (decisão do spec, seção 5).
        body: '',
        sound: nomeArquivoSom(parsed.data.som),
        categoryIdentifier: ALARME_CATEGORY_ID,
        // Payload útil para o handler de action button identificar o
        // slug do alarme afetado.
        data: { slug: parsed.data.slug, dia },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: tempo.hour,
        minute: tempo.minute,
        channelId: ALARME_CHANNEL_ID,
      },
    });
    ids.push(identifier);
  }
  return { ids, estourou: false };
}

// Cancela todos os schedules de um alarme (todos os dias da semana
// + snooze ativo). Idempotente.
export async function cancelarAlarme(slug: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const lista = await Notifications.getAllScheduledNotificationsAsync();
  const prefixoSlug = `${ID_PREFIX}${slug}.`;
  for (const item of lista) {
    if (item.identifier.startsWith(prefixoSlug)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      } catch {
        // Ignora falhas individuais.
      }
    }
  }
}

// Agenda snooze one-shot daqui a N minutos. Cancela snooze previo do
// mesmo slug antes para não acumular. Retorna identifier do snooze
// agendado, ou null em falha (web, sem permissao).
export async function agendarSnooze(
  slug: string,
  minutos: number
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (minutos < 1 || minutos > 60) return null;
  const ok = await pedirPermissao();
  if (!ok) return null;

  await cancelarSnooze(slug);

  const identifier = idSnooze(slug);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      // Titulo padrao do snooze; a UI não mostra outra string aqui.
      title: 'Soneca',
      body: '',
      // Sem som no snooze: e re-disparo, deve ser menos invasivo.
      sound: false,
      categoryIdentifier: ALARME_CATEGORY_ID,
      data: { slug, snooze: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutos * 60,
      // One-shot: não repete.
      repeats: false,
      channelId: ALARME_CHANNEL_ID,
    },
  });
  return identifier;
}

// Cancela snooze pendente do slug, se houver. Idempotente.
export async function cancelarSnooze(slug: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const identifier = idSnooze(slug);
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Sem snooze previo; ok.
  }
}

// Lista identifiers ativos desta feature (debug/tela de Settings
// futura). Retorna so os do prefixo canonico, ignorando lembretes e
// outras features.
export async function listarAgendados(): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  const lista = await Notifications.getAllScheduledNotificationsAsync();
  return lista
    .filter((n) => n.identifier.startsWith(ID_PREFIX))
    .map((n) => n.identifier);
}

// Reagenda todos os alarmes do Vault no boot. Cancela tudo do prefixo
// antes para evitar drift entre estado persistido e estado do SO.
// Hook idempotente para BOOT_HOOKS (M00.5). Aceita lista pre-carregada
// para facilitar testes; em runtime carrega do Vault.
export async function reagendarAlarmes(
  carregar?: () => Promise<Alarme[]>
): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancela tudo do prefixo. Garante consistencia mesmo se o usuario
  // editou alarmes em outro dispositivo (Vault sincronizado via
  // Syncthing) e o SO ainda tem schedules antigos.
  const ativos = await listarAgendados();
  for (const id of ativos) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignora falhas individuais.
    }
  }

  // Carregamento do Vault. Em testes podemos passar um carregar custom;
  // em runtime resolvemos via require dinamico para evitar ciclo entre
  // services e vault.
  let alarmes: Alarme[] = [];
  if (carregar) {
    alarmes = await carregar();
  } else {
    try {
      const { useVault } = await import('@/lib/stores/vault');
      const vaultRoot = useVault.getState().vaultRoot;
      if (!vaultRoot) return;
      const { listarAlarmes } = await import('@/lib/vault/alarmes');
      alarmes = await listarAlarmes(vaultRoot);
    } catch {
      return;
    }
  }

  // Reagenda apenas ativos.
  for (const alarme of alarmes) {
    if (alarme.ativo) {
      // Erros de agendamento individual não quebram o boot.
      try {
        await agendarAlarme(alarme);
      } catch {
        // Ignora.
      }
    }
  }
}
