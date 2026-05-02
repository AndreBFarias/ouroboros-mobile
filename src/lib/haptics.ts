// Wrappers tipados sobre expo-haptics. Async para não bloquear a UI thread.
//
// Duas camadas:
//
// 1. Genéricos (sempre disparam, independente de toggle): light,
//    medium, selection, success, error. Use quando o haptic for
//    intrínseco da interação (ex.: validação de formulário) e não
//    deva ser silenciado por preferência de som/vibração do usuário.
//
// 2. Contextuais (consultam Settings.somVibracao antes de disparar):
//    humor, vitoria, trigger, fab, alarme. Use nos call sites ligados
//    diretamente aos toggles que o usuário controla em Settings —
//    cada função respeita seu toggle correspondente e cai em no-op
//    silencioso quando desligado.
//
// Convenção de uso:
//   await haptics.light();      // toggle leve generico
//   await haptics.medium();     // confirmacao de acao destrutiva
//   await haptics.selection();  // tick por step em slider/picker
//   await haptics.success();    // dossie gerado, validacao OK
//   await haptics.error();      // falha de validacao, tentativa invalida
//   await haptics.humor();      // ao registrar humor (Tela 16)
//   await haptics.vitoria();    // ao desbloquear conquista/marco
//   await haptics.trigger();    // ao registrar evento negativo
//   await haptics.fab();        // tap no botao flutuante (+)
//   await haptics.alarme();     // pulse ao receber alarme em foreground
import * as ExpoHaptics from 'expo-haptics';
import { useSettings } from '@/lib/stores/settings';

// Snapshot do toggle no momento da chamada. Se o store ainda não
// hidratou (boot inicial), tudo retorna true (default permissivo).
function tomVibracaoLigado(
  chave: 'humor' | 'vitoria' | 'trigger' | 'fab' | 'alarme'
): boolean {
  try {
    return useSettings.getState().somVibracao[chave];
  } catch {
    return true;
  }
}

export const haptics = {
  // Camada 1 — genéricos. Sempre disparam.
  light: (): Promise<void> =>
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  medium: (): Promise<void> =>
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
  selection: (): Promise<void> => ExpoHaptics.selectionAsync(),
  success: (): Promise<void> =>
    ExpoHaptics.notificationAsync(
      ExpoHaptics.NotificationFeedbackType.Success
    ),
  error: (): Promise<void> =>
    ExpoHaptics.notificationAsync(
      ExpoHaptics.NotificationFeedbackType.Error
    ),

  // Camada 2 — contextuais. Cada uma consulta o toggle equivalente
  // em useSettings.somVibracao antes de disparar. Quando o toggle
  // está off, retorna Promise.resolve() — no-op silencioso, mantém
  // a mesma assinatura para callers que fazem `await haptics.fab()`.
  humor: (): Promise<void> =>
    tomVibracaoLigado('humor')
      ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light)
      : Promise.resolve(),
  vitoria: (): Promise<void> =>
    tomVibracaoLigado('vitoria')
      ? ExpoHaptics.notificationAsync(
          ExpoHaptics.NotificationFeedbackType.Success
        )
      : Promise.resolve(),
  trigger: (): Promise<void> =>
    tomVibracaoLigado('trigger')
      ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium)
      : Promise.resolve(),
  fab: (): Promise<void> =>
    tomVibracaoLigado('fab')
      ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium)
      : Promise.resolve(),
  alarme: (): Promise<void> =>
    tomVibracaoLigado('alarme')
      ? ExpoHaptics.notificationAsync(
          ExpoHaptics.NotificationFeedbackType.Warning
        )
      : Promise.resolve(),
} as const;

export type HapticName = keyof typeof haptics;
