// Notificacao silenciosa de meta diaria de passos atingida.
// R-INT-3-HC-NOTIF-META-PASSOS (2026-05-25).
//
// checarEnotificarMeta(passosHoje, meta) dispara uma notificacao
// SILENCIOSA (sem som) "Meta de passos atingida" / "X passos hoje"
// quando passosHoje >= meta E ainda nao notificou hoje. O guard 1x/dia
// vive em SecureStore: gravamos a data local (YYYY-MM-DD BRT) do ultimo
// aviso; se ja e a data de hoje, nao dispara de novo.
//
// Em web (sem expo-notifications nativo) e' no-op silencioso, igual aos
// outros wrappers de notificacao (alarmesNotificacoes, lembretes).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

// Chave do guard 1x/dia. Guarda a data local (BRT) do ultimo aviso.
const ULTIMO_AVISO_KEY = 'ouroboros.metaPassos.ultimoAviso';

// Identifier da notificacao (sobrescreve a anterior se houver).
const NOTIF_ID = 'ouroboros.metaPassos.atingida';

// Fuso fixo Sao Paulo (UTC-3). Mesmo offset usado no resto do app.
const TZ_SHIFT_MS = -180 * 60_000;

// Data local YYYY-MM-DD (BRT) de um instante. Usado como chave do guard
// diario (vira em 00:00 BRT, alinhado com o resto do app).
function dataLocalYmd(now: Date): string {
  const local = new Date(now.getTime() + TZ_SHIFT_MS);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Le a data do ultimo aviso do SecureStore. Em web ou erro, retorna
// null (trata como "nunca avisou").
async function lerUltimoAviso(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await SecureStore.getItemAsync(ULTIMO_AVISO_KEY);
  } catch {
    return null;
  }
}

// Grava a data do ultimo aviso. Falha silenciosa (pior caso: avisa de
// novo no proximo ciclo, sem duplicar dentro do mesmo render porque o
// caller so chama uma vez por leitura de passos).
async function gravarUltimoAviso(data: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(ULTIMO_AVISO_KEY, data);
  } catch {
    // Ignora: guard best-effort.
  }
}

// Pede permissao de notificacao se ainda nao tiver. Em web retorna
// false silenciosamente. Mesma logica de alarmesNotificacoes.
async function pedirPermissao(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return true;
  if (!status.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// Resultado de checarEnotificarMeta. notificou=true so quando uma
// notificacao foi efetivamente disparada nesta chamada.
export interface ChecarResultado {
  notificou: boolean;
}

// Verifica se a meta foi atingida hoje e, em caso afirmativo, dispara
// uma notificacao silenciosa -- desde que ainda nao tenha avisado hoje.
// Idempotente por dia: chamadas repetidas no mesmo dia apos atingir a
// meta nao geram avisos duplicados.
//
// Retorna { notificou: true } apenas quando o aviso foi disparado nesta
// chamada (util para testes e telemetria local).
export async function checarEnotificarMeta(
  passosHoje: number,
  meta: number
): Promise<ChecarResultado> {
  // Guarda contra entradas invalidas e meta nao atingida.
  if (
    !Number.isFinite(passosHoje) ||
    !Number.isFinite(meta) ||
    meta <= 0 ||
    passosHoje < meta
  ) {
    return { notificou: false };
  }

  if (Platform.OS === 'web') return { notificou: false };

  const now = new Date();
  const hoje = dataLocalYmd(now);

  // Guard 1x/dia: se ja avisou hoje, nao repete.
  const ultimo = await lerUltimoAviso();
  if (ultimo === hoje) {
    return { notificou: false };
  }

  const ok = await pedirPermissao();
  if (!ok) return { notificou: false };

  // Corpo com separador de milhar PT-BR (ponto). Ex: "8.000 passos hoje".
  const corpo = `${formatarMilhar(Math.round(passosHoje))} passos hoje`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title: 'Meta de passos atingida',
        body: corpo,
        // Silenciosa: sem som. Notificacao informativa, nao invasiva.
        sound: false,
      },
      // trigger null => entrega imediata (SDK 54).
      trigger: null,
    });
  } catch {
    // Falha ao agendar (sem permissao real, ambiente sem suporte):
    // nao grava guard, tenta de novo no proximo ciclo.
    return { notificou: false };
  }

  await gravarUltimoAviso(hoje);
  return { notificou: true };
}

// Formata inteiro com ponto de milhar PT-BR. Implementacao manual
// (sem Intl) para previsibilidade em todos os ambientes/testes.
function formatarMilhar(n: number): string {
  const s = String(Math.abs(n));
  const partes: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    partes.unshift(s.slice(Math.max(0, i - 3), i));
  }
  const corpo = partes.join('.');
  return n < 0 ? `-${corpo}` : corpo;
}
