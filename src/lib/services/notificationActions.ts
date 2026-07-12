// Registro de categorias e canal de notificação para alarmes (M16).
// Uma categoria 'alarme' com 2 botoes (Soneca/Desligar) + 1 canal
// Android dedicado para isolar do canal default dos lembretes.
// Plugado em app/_layout.tsx no boot; idempotente, seguro rodar
// varias vezes.
//
// Observacoes:
//   - expo-notifications mantem categorias em memória do SO; chamar
//     setNotificationCategoryAsync com mesmo ID sobrescreve.
//   - O canal Android (importance HIGH) e criado uma vez por instalacao;
//     setNotificationChannelAsync e idempotente.
//   - Web não suporta categorias nem canais; cai em no-op.
//   - O handler dos botoes (clique no usuario) chega via
//     addNotificationResponseReceivedListener no boot. Esta função
//     so REGISTRA a categoria; o listener vai numa sprint futura.
//
// Comentarios sem acento (convencao shell/CI).
//
// R-NAV-2 (2026-05-15) - alarmes mudos:
//   Bug raiz: canal 'ouroboros-default-v2' nao tinha campo `sound`
//   em setNotificationChannelAsync. Android Oreo+ trata o canal
//   como fonte unica de verdade do som; content.sound vira nominal
//   apenas. Solucao: 1 canal por som (canalIdParaSom), cada um com
//   sound apontando para o resource raw correspondente.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  SONS_CANONICOS,
  type AlarmeSom,
} from '@/lib/schemas/alarme';

export const ALARME_CATEGORY_ID = 'alarme';
// Channel id legado (M30 v2). Mantido como fallback nominal e como
// identifier para limpeza one-shot em devices upgradados. Novos
// schedules usam canalIdParaSom() baseado em alarme.som.
export const ALARME_CHANNEL_ID = 'ouroboros-default-v2';
// Channel ids legados que devem ser apagados na primeira execucao
// pos-M30/R-NAV-2 (one-shot). Idempotente: apagar channel inexistente
// nao falha. Ordem nao importa.
//
// R-NAV-2: 'ouroboros-default-v2' entra na limpeza porque foi criado
// sem `sound` em devices upgradados (Android trava configuracao do
// canal apos primeira criacao). Sem deletar+recriar, som nunca
// dispara nesses devices.
export const CHANNEL_IDS_LEGADOS = [
  'default',
  'alarmes',
  'ouroboros-default-v2',
] as const;
// M30: padrao de vibracao canonico [0, 250, 500, 250]. 250ms de
// pulse, 500ms pausa, 250ms pulse. Nem invasivo nem fraco (decisao
// §9 do M30-spec).
export const ALARME_VIBRATION_PATTERN: readonly number[] = [0, 250, 500, 250];
export const SONECA_ACTION_ID = 'alarme.soneca';
export const DESLIGAR_ACTION_ID = 'alarme.desligar';

// R-NAV-2: nome do canal por som. Sufixo do som vira identifier
// estavel ('ouroboros-alarme-gentle'). Mantemos prefixo distinto
// dos legados para limpeza retroativa quando precisar recriar.
export function canalIdParaSom(som: AlarmeSom): string {
  return `ouroboros-alarme-${som}`;
}

// R-NAV-2: nome do recurso raw que Android resolve.
// expo-notifications no Android aceita string sem extensao em
// channel.sound; ele resolve para R.raw.<nome>. Os arquivos .wav
// sao copiados via plugin (app.json sounds:[]).
function nomeResourceSom(som: AlarmeSom): string {
  return som;
}

// Registra a categoria 'alarme' (action buttons) e N canais Android
// (1 por som canonico). Em Web vira no-op silencioso.
export async function registrarCategoriasAlarme(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // Categoria com 2 botoes. Idempotente.
    await Notifications.setNotificationCategoryAsync(ALARME_CATEGORY_ID, [
      {
        identifier: SONECA_ACTION_ID,
        buttonTitle: 'Soneca 5 min',
        options: {
          // Não abre o app; o servico processa o snooze em background.
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
      // R-NAV-2: 1 canal por som. Som no canal e IMUTAVEL apos
      // setNotificationChannelAsync. Sem isso o alarme dispara sem
      // audio (bug raiz que motivou a refundacao v1.0).
      // vibrationPattern + enableVibrate + lightColor purple Dracula
      // (--purple #bd93f9) preservados em todos os canais.
      for (const som of SONS_CANONICOS) {
        await Notifications.setNotificationChannelAsync(
          canalIdParaSom(som),
          {
            name: `Ouroboros (${som})`,
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [...ALARME_VIBRATION_PATTERN],
            enableVibrate: true,
            lightColor: '#bd93f9',
            // Trava na tela de bloqueio: alarme tem que aparecer.
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: false,
            // Audio: nome do resource raw correspondente ao som.
            // Sem este campo o canal cai em "Sem som" pelo SO.
            sound: nomeResourceSom(som),
          }
        );
      }
    }
  } catch {
    // Plataforma sem suporte ou falha temporaria; falha silenciosa
    // e aceita: o alarme ainda dispara, apenas sem botoes/canal custom.
  }
}

// M30: apaga channels Android legados (criados em v1.0-rc1 sem
// vibrationPattern explicito). Roda uma unica vez por instalacao,
// guardado por useSessao.flags.canalV1Deletado. Idempotente:
// deleteNotificationChannelAsync com id inexistente nao falha. Em web
// e iOS, no-op. Em testes a flag fica false (mock zustand sem
// hidratacao), entao o helper sempre roda - testes especificos validam
// que apenas os ids legados foram apagados.
export async function apagarChannelsLegadosUmaVez(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (Platform.OS !== 'android') return;
  // Lazy import para evitar ciclo entre services e stores em runtime
  // de modulo. require dinamico tambem facilita mock em testes.
  let useSessaoStore:
    | typeof import('@/lib/stores/sessao').useSessao
    | undefined;
  try {
    useSessaoStore = (await import('@/lib/stores/sessao')).useSessao;
  } catch {
    return;
  }
  if (!useSessaoStore) return;
  const flag = useSessaoStore.getState().flags?.canalV1Deletado;
  if (flag) return;
  for (const id of CHANNEL_IDS_LEGADOS) {
    try {
      await Notifications.deleteNotificationChannelAsync(id);
    } catch {
      // Channel inexistente; ok.
    }
  }
  try {
    useSessaoStore.getState().marcarFlagBoot('canalV1Deletado');
  } catch {
    // Store nao hidratada; deixa para proximo boot.
  }
}
