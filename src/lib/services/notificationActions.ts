// Registro de categorias e canal de notificacao para alarmes (M16).
// Uma categoria 'alarme' com 2 botoes (Soneca/Desligar) + 1 canal
// Android dedicado para isolar do canal default dos lembretes.
// Plugado em app/_layout.tsx no boot; idempotente, seguro rodar
// varias vezes.
//
// Observacoes:
//   - expo-notifications mantem categorias em memoria do SO; chamar
//     setNotificationCategoryAsync com mesmo ID sobrescreve.
//   - O canal Android (importance HIGH) e criado uma vez por instalacao;
//     setNotificationChannelAsync e idempotente.
//   - Web nao suporta categorias nem canais; cai em no-op.
//   - O handler dos botoes (clique no usuario) chega via
//     addNotificationResponseReceivedListener no boot. Esta funcao
//     so REGISTRA a categoria; o listener vai numa sprint futura.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const ALARME_CATEGORY_ID = 'alarme';
export const ALARME_CHANNEL_ID = 'alarmes';
export const SONECA_ACTION_ID = 'alarme.soneca';
export const DESLIGAR_ACTION_ID = 'alarme.desligar';

// Registra a categoria 'alarme' (action buttons) e o canal Android
// dedicado 'alarmes'. Em Web vira no-op silencioso.
export async function registrarCategoriasAlarme(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // Categoria com 2 botoes. Idempotente.
    await Notifications.setNotificationCategoryAsync(ALARME_CATEGORY_ID, [
      {
        identifier: SONECA_ACTION_ID,
        buttonTitle: 'Soneca 5 min',
        options: {
          // Nao abre o app; o servico processa o snooze em background.
          opensAppToForeground: false,
        },
      },
      {
        identifier: DESLIGAR_ACTION_ID,
        buttonTitle: 'Desligar',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    if (Platform.OS === 'android') {
      // Canal Android dedicado: importance HIGH para alarme aparecer
      // como heads-up. Vibracao on, badge off, sound default ativado
      // (a string especifica do som vai no content de cada schedule).
      await Notifications.setNotificationChannelAsync(ALARME_CHANNEL_ID, {
        name: 'Alarmes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        // Trava na tela de bloqueio: alarme tem que aparecer.
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
    }
  } catch {
    // Plataforma sem suporte ou falha temporaria; falha silenciosa
    // e aceita: o alarme ainda dispara, apenas sem botoes/canal custom.
  }
}
