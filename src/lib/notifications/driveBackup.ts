// Notificacao silenciosa de confirmacao apos backup no Google Drive.
// R-INT-5-DRIVE-NOTIF-BACKUP (2026-05-25).
//
// notificarBackupDrive(bytes) dispara uma notificacao SILENCIOSA (sem
// som) "Backup salvo no Drive" / "X MB" apos um upload bem-sucedido.
// Best-effort: qualquer falha (sem permissao, ambiente sem suporte) e'
// engolida sem rethrow para nao derrubar o backup, que ja concluiu.
//
// Em web (sem expo-notifications nativo) e' no-op silencioso, igual aos
// outros wrappers de notificacao (metaPassos, alarmesNotificacoes).
//
// Comentarios sem acento (convencao shell/CI). Strings de UI em PT-BR
// sentence case com acentuacao.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Identifier da notificacao (sobrescreve a anterior se houver).
const NOTIF_ID = 'ouroboros.driveBackup.salvo';

// Pede permissao de notificacao se ainda nao tiver. Em web retorna false
// silenciosamente. Mesma logica de metaPassos/alarmesNotificacoes.
async function pedirPermissao(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return true;
  if (!status.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// Formata bytes como MB com uma casa decimal (separador decimal PT-BR =
// virgula). Implementacao manual (sem Intl) para previsibilidade em
// todos os ambientes/testes. Ex: 2_516_582 -> "2,4 MB".
export function formatarMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const arredondado = Math.round(mb * 10) / 10;
  return `${String(arredondado).replace('.', ',')} MB`;
}

// Resultado de notificarBackupDrive. notificou=true so quando uma
// notificacao foi efetivamente disparada nesta chamada.
export interface NotificarResultado {
  notificou: boolean;
}

// Dispara a notificacao silenciosa de backup salvo. So deve ser chamada
// no success path do upload. Best-effort: nunca lanca.
//
// Retorna { notificou: true } apenas quando o aviso foi disparado nesta
// chamada (util para testes e telemetria local).
export async function notificarBackupDrive(
  bytes: number
): Promise<NotificarResultado> {
  // Bytes invalidos ou negativos: nada a notificar.
  if (!Number.isFinite(bytes) || bytes < 0) {
    return { notificou: false };
  }
  if (Platform.OS === 'web') return { notificou: false };

  try {
    const ok = await pedirPermissao();
    if (!ok) return { notificou: false };

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title: 'Backup salvo no Drive',
        body: formatarMb(bytes),
        // Silenciosa: sem som. Notificacao informativa, nao invasiva.
        sound: false,
      },
      // trigger null => entrega imediata (SDK 54).
      trigger: null,
    });
  } catch {
    // Best-effort: falha da notif nao derruba o backup (que ja concluiu).
    return { notificou: false };
  }

  return { notificou: true };
}
