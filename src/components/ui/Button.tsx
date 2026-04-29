// Botao premium: variantes primary | success | ghost | destructive.
// Altura minima 56dp. Press in dispara haptic light e scale 0.97 com
// spring snappy. Disabled = opacity 0.4 e bloqueio de eventos.
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

export type ButtonVariant = 'primary' | 'success' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

interface VariantClasses {
  bg: string;
  text: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, VariantClasses> = {
  primary: { bg: 'bg-purple', text: 'text-bg' },
  success: { bg: 'bg-green', text: 'text-bg' },
  ghost: { bg: 'bg-transparent border border-bg-elev', text: 'text-fg' },
  destructive: { bg: 'bg-red', text: 'text-fg' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const v = VARIANT_CLASSES[variant];

  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        setPressed(true);
        haptics.light();
      }}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (!disabled) onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1 }}
        transition={springs.snappy}
        className={`${v.bg} rounded-xl py-4 items-center justify-center`}
        style={{ minHeight: 56, opacity: disabled ? 0.4 : 1 }}
      >
        <Text className={`${v.text} font-mono-medium text-base`}>
          {label}
        </Text>
      </MotiView>
    </Pressable>
  );
}
