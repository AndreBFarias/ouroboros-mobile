// Listener das acoes de botao das notificacoes de alarme (R-ROT-1-A).
//
// Quando o usuario toca "Soneca 5 min" na notificacao de alarme, este
// handler:
//   1. Le o alarme persistido pra descobrir snooze_minutos.
//   2. Registra o snooze no historico_snoozes (alimenta inteligencia
//      temporal do banner em /alarmes/<slug>).
//   3. Agenda o re-disparo one-shot via agendarSnooze.
//
// Quando o usuario toca "Desligar", cancela qualquer snooze pendente.
// AUDIT-P1-7: se o alarme for de recorrencia 'unica', o Desligar
// tambem o encerra no Vault (ativo:false + ultimo_disparo) para que
// ele nao volte a ser agendado no proximo boot.
//
// Por que aqui (e nao em agendarSnooze): a responsabilidade de
// "responder ao usuario" e distinta de "agendar o re-disparo". A funcao
// agendarSnooze foi escrita pra ser chamada por qualquer caller (boot
// re-agendamento, testes), nao apenas pelo handler de Soneca. Isolar o
// handler permite testar tap em botao sem rodar listener real.
//
// Comentarios sem acento (convencao shell/CI).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  SONECA_ACTION_ID,
  DESLIGAR_ACTION_ID,
} from '@/lib/services/notificationActions';
import {
  agendarSnooze,
  cancelarSnooze,
} from '@/lib/services/alarmesNotificacoes';
import { escreverAlarme, lerAlarme, registrarSnooze } from '@/lib/vault/alarmes';

// Shape estavel do tipo de resposta (forma simplificada de
// NotificationResponse do expo-notifications). Mantemos local para
// permitir teste sem importar tipos do native module.
export interface AlarmeNotificationResponse {
  actionIdentifier: string;
  notification: {
    request: {
      content: {
        data?: { slug?: string; [k: string]: unknown } | null;
      };
    };
  };
}

// Handler puro testavel. Retorna void; falhas individuais sao
// silenciadas pra nao quebrar o canal de notificacao.
export async function tratarRespostaNotificacao(
  response: AlarmeNotificationResponse,
  vaultRoot: string | null
): Promise<void> {
  if (!vaultRoot) return;
  const actionId = response.actionIdentifier;
  const slug = response.notification.request.content.data?.slug;
  if (typeof slug !== 'string' || slug.length === 0) return;

  if (actionId === SONECA_ACTION_ID) {
    const alarme = await lerAlarme(vaultRoot, slug);
    if (!alarme) return;
    const minutos = alarme.snooze_minutos;
    // Registra historico ANTES de agendar pra cobrir caso de
    // agendarSnooze falhar (web/sem permissao) - ainda assim aprendeu
    // sobre a intencao do usuario.
    try {
      await registrarSnooze(vaultRoot, slug, minutos);
    } catch {
      // Persistencia parcial: prossegue mesmo assim. Snooze real e
      // mais critico que aprender historico.
    }
    await agendarSnooze(slug, minutos);
    return;
  }

  if (actionId === DESLIGAR_ACTION_ID) {
    await cancelarSnooze(slug);
    // AUDIT-P1-7: alarme 'unica' morre no Desligar. Sem gravar
    // ativo:false o .md continua ativo, a UI segue mostrando o alarme
    // ligado e reagendarAlarmes o devolve para a fila do SO em cada
    // boot. `ultimo_disparo` existe no schema desde M16 ("ISO datetime
    // do ultimo Desligar") e so agora ganha um escritor.
    //
    // Recorrentes (diaria/semanal/mensal) ficam intocados: Desligar
    // encerra a ocorrencia, nao a serie.
    try {
      const alarme = await lerAlarme(vaultRoot, slug);
      if (alarme && alarme.recorrencia === 'unica') {
        await escreverAlarme(vaultRoot, {
          ...alarme,
          ativo: false,
          ultimo_disparo: new Date().toISOString().replace('Z', '+00:00'),
        });
      }
    } catch {
      // Persistencia best-effort: falha de I-O aqui nao pode derrubar
      // o canal de notificacao (mesma politica do ramo de Soneca).
    }
  }
}

// Instala o listener no expo-notifications. Retorna a subscription
// (caller chama .remove() em unmount). Em web vira no-op pq
// addNotificationResponseReceivedListener nao existe na plataforma.
export function instalarResponseListener(
  obterVaultRoot: () => string | null
): { remove: () => void } {
  if (Platform.OS === 'web') {
    return { remove: () => {} };
  }
  const sub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      void tratarRespostaNotificacao(
        response as unknown as AlarmeNotificationResponse,
        obterVaultRoot()
      );
    }
  );
  return sub;
}
