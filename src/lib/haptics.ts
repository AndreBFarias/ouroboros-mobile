// Wrappers tipados sobre expo-haptics. Async para nao bloquear a UI thread.
// Convencao de uso:
//   await haptics.light();      // botao primario, toggle leve
//   await haptics.medium();     // confirmacao de acao destrutiva
//   await haptics.selection();  // tick por step em slider/picker
//   await haptics.success();    // dossie gerado, vitoria registrada
//   await haptics.error();      // falha de validacao, tentativa invalida
import * as ExpoHaptics from 'expo-haptics';

export const haptics = {
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
} as const;

export type HapticName = keyof typeof haptics;
