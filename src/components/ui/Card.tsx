// Cartao de superficie. Fundo bg-alt, padding 16, radius 12. Variante
// active marca borda 1.5px purple. Tap leve com scale 0.99 quando
// onPress fornecido; sem onPress, e estatico (so visual).
import { ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

export type CardVariant = 'default' | 'active';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  children,
  variant = 'default',
  onPress,
  accessibilityLabel,
}: CardProps) {
  const [pressed, setPressed] = useState(false);
  const borderClass =
    variant === 'active' ? 'border-[1.5px] border-purple' : '';

  const inner = (
    <MotiView
      animate={{ scale: pressed ? 0.99 : 1 }}
      transition={springs.snappy}
      className={`bg-bg-alt rounded-xl p-4 ${borderClass}`}
    >
      {children}
    </MotiView>
  );

  if (!onPress) {
    return <View accessibilityLabel={accessibilityLabel}>{inner}</View>;
  }

  return (
    <Pressable
      onPressIn={() => {
        setPressed(true);
        haptics.light();
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'card'}
    >
      {inner}
    </Pressable>
  );
}
