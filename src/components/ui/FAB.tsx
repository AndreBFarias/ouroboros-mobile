// Floating Action Button: 56dp absoluto canto inferior direito. Sombra
// blur 16dp offset (0,4) opacity 30%. Icone Plus da lucide-react-native
// por default, override via prop `icon`. Press dispara haptic medium e
// scale 0.97 com spring snappy. Sem texto: acessibilidade via label
// explicito ("ação rapida" ou override).
//
// Q22.D (2026-05-13): bottom usa useSafeBottomMargin pra alinhar
// verticalmente com FABMenu (canto inferior esquerdo) e MenuCapturaVerde
// (verde). Antes usava `spacing.xl` fixo (=24dp) que deixava o FAB
// muito mais perto da borda inferior que o FABMenu (240dp + insets),
// formando degrau visual feio: o "+" ficava abaixo do hamburguer.
import { useState, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from '@/lib/icons';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import { useSafeBottomMargin } from '@/components/chrome/safeBottom';

export interface FABProps {
  onPress: () => void;
  icon?: ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
}

const SIZE = 56;

export function FAB({
  onPress,
  icon,
  accessibilityLabel = 'acao rapida',
  disabled = false,
}: FABProps) {
  const [pressed, setPressed] = useState(false);
  const insets = useSafeAreaInsets();
  // Q22.D: bottom canonico igual ao FABMenu e MenuCapturaVerde
  // (max(24dp, 10% altura) + inset.bottom).
  const bottomCanonico = useSafeBottomMargin(insets.bottom);

  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        setPressed(true);
        // Camada contextual: respeita Settings.somVibracao.fab. Quando
        // o usuário desliga vibração do FAB em Settings, esta função
        // cai em no-op silencioso.
        haptics.fab();
      }}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (!disabled) onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        position: 'absolute',
        right: spacing.lg,
        bottom: bottomCanonico,
      }}
    >
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1 }}
        transition={springs.snappy}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: radius.fab,
          backgroundColor: colors.purple,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon ?? <Plus size={24} color={colors.bg} strokeWidth={2} />}
      </MotiView>
    </Pressable>
  );
}
