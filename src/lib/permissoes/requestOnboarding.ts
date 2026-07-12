// Helpers de permissao usados pelo Frame "Permissoes" do onboarding
// (sprint J1). Cada funcao roda o request nativo de uma permissao
// especifica (camera, microfone, notificacoes, localizacao) e devolve
// boolean (true se concedida, false se negada ou indisponivel).
//
// Em web ou em qualquer falha (modulo nativo ausente, exception),
// retorna false silenciosamente para nao bloquear o fluxo de
// onboarding nem o E2E Gauntlet. Caller registra o resultado em
// useOnboarding.permissoes.
//
// As permissoes sao pedidas em sequencia (camera -> microfone ->
// notificacoes -> localizacao) para evitar varios prompts nativos
// disputando atencao na primeira execucao.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

export type ChavePermissao =
  | 'camera'
  | 'microfone'
  | 'notificacoes'
  | 'localizacao';

// Resultado canonico do request: true se concedida, false caso
// contrario (incluindo plataforma sem suporte).
export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const res = await ImagePicker.requestCameraPermissionsAsync();
    return res.granted === true;
  } catch {
    return false;
  }
}

export async function requestMicrofonePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const res = await Audio.requestPermissionsAsync();
    return res.granted === true;
  } catch {
    return false;
  }
}

export async function requestNotificacoesPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const res = await Notifications.requestPermissionsAsync();
    return res.granted === true;
  } catch {
    return false;
  }
}

export async function requestLocalizacaoPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const res = await Location.requestForegroundPermissionsAsync();
    return res.granted === true;
  } catch {
    return false;
  }
}

// Retorna status atual sem pedir (para sub-tela de settings).
// Categorias possiveis: 'concedida' | 'negada' | 'nao-pedida'.
export type StatusPermissao = 'concedida' | 'negada' | 'nao-pedida';

export async function getCameraStatus(): Promise<StatusPermissao> {
  if (Platform.OS === 'web') return 'nao-pedida';
  try {
    const res = await ImagePicker.getCameraPermissionsAsync();
    if (res.granted) return 'concedida';
    if (res.canAskAgain === false) return 'negada';
    return 'nao-pedida';
  } catch {
    return 'nao-pedida';
  }
}

export async function getMicrofoneStatus(): Promise<StatusPermissao> {
  if (Platform.OS === 'web') return 'nao-pedida';
  try {
    const res = await Audio.getPermissionsAsync();
    if (res.granted) return 'concedida';
    if (res.canAskAgain === false) return 'negada';
    return 'nao-pedida';
  } catch {
    return 'nao-pedida';
  }
}

export async function getNotificacoesStatus(): Promise<StatusPermissao> {
  if (Platform.OS === 'web') return 'nao-pedida';
  try {
    const res = await Notifications.getPermissionsAsync();
    if (res.granted) return 'concedida';
    if (res.canAskAgain === false) return 'negada';
    return 'nao-pedida';
  } catch {
    return 'nao-pedida';
  }
}

export async function getLocalizacaoStatus(): Promise<StatusPermissao> {
  if (Platform.OS === 'web') return 'nao-pedida';
  try {
    const res = await Location.getForegroundPermissionsAsync();
    if (res.granted) return 'concedida';
    if (res.canAskAgain === false) return 'negada';
    return 'nao-pedida';
  } catch {
    return 'nao-pedida';
  }
}

// V4.0.2: status de MANAGE_EXTERNAL_STORAGE (Android 11+) via probe
// write em /sdcard/Documents/. Probe e a unica fonte de verdade
// confiavel; PermissionsAndroid.check nao reflete state desta
// permissao especial. Idempotente.
export async function getStorageStatus(): Promise<StatusPermissao> {
  if (Platform.OS !== 'android') return 'concedida';
  // Lazy import para evitar ciclo (vault/permissions importa este modulo).
  const FileSystem = await import('expo-file-system/legacy');
  // V4.0.2: probe em /sdcard/ raiz (universalmente gravavel com MANAGE).
  const probeUri = `file:///sdcard/.ouroboros-permcheck-${Date.now()}`;
  try {
    await FileSystem.writeAsStringAsync(probeUri, 'ok');
    await FileSystem.deleteAsync(probeUri, { idempotent: true });
    return 'concedida';
  } catch {
    return 'negada';
  }
}

// V4.0.2: status de SCHEDULE_EXACT_ALARM (Android 14+) via expo-
// notifications. Apps em Android 14+ precisam de grant explicito
// pelo usuario nas configuracoes do sistema; sem isso, alarmes
// pre-cadastrados disparam em janelas de tempo aproximadas (ate +/-
// 15min) ou nao disparam. Pre-Android 14: sempre concedida.
export async function getAlarmeExatoStatus(): Promise<StatusPermissao> {
  if (Platform.OS !== 'android') return 'concedida';
  const apiLevel =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10) || 0;
  if (apiLevel < 31) return 'concedida'; // <Android 12: nao requer grant
  try {
    // expo-notifications expoe Notifications.getPermissionsAsync
    // mas para SCHEDULE_EXACT_ALARM nao temos API direta. A unica
    // forma confiavel e tentar agendar e ver se cai em "exact" ou
    // janela aproximada. Por simplicidade, em API >=31 retornamos
    // 'nao-pedida' para o usuario poder tocar "Abrir configuracoes"
    // e habilitar manualmente. UI deixa claro que e opcional.
    return 'nao-pedida';
  } catch {
    return 'nao-pedida';
  }
}
