// Wrappers tipados sobre expo-haptics. Async para nao bloquear a UI thread.
//
// Duas camadas:
//
// 1. Genericos (sempre disparam, independente de toggle): light,
//    medium, selection, success, error. Use quando o haptic for
//    intrinseco da interacao (ex.: validacao de formulario) e nao
//    deva ser silenciado por preferencia de som/vibracao do usuario.
//
// 2. Contextuais (consultam Settings.somVibracao antes de disparar):
//    humor, vitoria, trigger, fab, alarme. Mapeamento sprint M29:
//      humor   -> botoes
//      vitoria -> conquista
//      trigger -> botoes
//      fab     -> botoes
//      alarme  -> despertar
//    Quando o mestre `geral` esta off, todos os contextuais ficam
//    silenciosos independente da chave (UX simples: 1 mestre desliga
//    tudo de uma vez).
//
// Convencao de uso:
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

// Snapshot do toggle no momento da chamada. Mestre `geral` off
// desabilita tudo. Se o store ainda nao hidratou (boot inicial), o
// default permissivo (true) prevalece via try/catch.
export function tomVibracaoLigado(
  chave: 'despertar' | 'conquista' | 'botoes'
): boolean {
  try {
    const sv = useSettings.getState().somVibracao;
    if (!sv.geral) return false;
    return sv[chave];
  } catch {
    return true;
  }
}

export const haptics = {
  // Camada 1 — genericos. Sempre disparam.
  light: (): Promise<void> =>
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  medium: (): Promise<void> =>
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
  selection: (): Promise<void> => ExpoHaptics.selectionAsync(),
  success: (): Promise<void> =>
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
  error: (): Promise<void> =>
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error),

  // Camada 2 — contextuais. Cada uma consulta o toggle agrupado
  // (sprint M29: humor/trigger/fab -> botoes, vitoria -> conquista,
  // alarme -> despertar). Quando o toggle esta off, retorna
  // Promise.resolve() (no-op silencioso) preservando a assinatura
  // para callers que fazem `await haptics.fab()`.
  humor: (): Promise<void> =>
    tomVibracaoLigado('botoes')
      ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light)
      : Promise.resolve(),
  // R0 lexical: 'vitoria' e 'trigger' permanecem como nomes de
  // metodo (estaveis para callers existentes; renomear quebraria 30+
  // pontos de uso sem ganho). Aliases canonicos 'conquista' e 'gatilho'
  // foram adicionados abaixo apontando para a mesma implementacao.
  vitoria: (): Promise<void> =>
    tomVibracaoLigado('conquista')
      ? ExpoHaptics.notificationAsync(
          ExpoHaptics.NotificationFeedbackType.Success
        )
      : Promise.resolve(),
  trigger: (): Promise<void> =>
    tomVibracaoLigado('botoes')
      ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium)
      : Promise.resolve(),
  /**
   * Alias canonico (R0) de `vitoria`. Use este nome em codigo novo;
   * `vitoria` permanece compativel mas marcado @deprecated.
   */
  conquista: (): Promise<void> =>
    tomVibracaoLigado('conquista')
      ? ExpoHaptics.notificationAsync(
          ExpoHaptics.NotificationFeedbackType.Success
        )
      : Promise.resolve(),
  /**
   * Alias canonico (R0) de `trigger`. Use este nome em codigo novo.
   */
  gatilho: (): Promise<void> =>
    tomVibracaoLigado('botoes')
      ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium)
      : Promise.resolve(),
  fab: (): Promise<void> =>
    tomVibracaoLigado('botoes')
      ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium)
      : Promise.resolve(),
  alarme: (): Promise<void> =>
    tomVibracaoLigado('despertar')
      ? ExpoHaptics.notificationAsync(
          ExpoHaptics.NotificationFeedbackType.Warning
        )
      : Promise.resolve(),
} as const;

export type HapticName = keyof typeof haptics;
