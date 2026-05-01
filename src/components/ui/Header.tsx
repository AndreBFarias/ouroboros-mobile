// Barra de topo 56dp. Esquerda chevron de voltar (opcional), centro
// titulo orange mono em sentence case, direita slot livre (avatar, ação).
import { ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { ChevronLeft } from 'lucide-react-native';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function Header({ title, onBack, right }: HeaderProps) {
  const [pressed, setPressed] = useState(false);

  const handleBack = () => {
    if (!onBack) return;
    haptics.light();
    onBack();
  };

  return (
    <View
      className="flex-row items-center justify-between"
      style={{ height: 56 }}
    >
      <View className="w-10 items-start justify-center">
        {onBack ? (
          <Pressable
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            onPress={handleBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="voltar"
          >
            <MotiView
              animate={{ scale: pressed ? 0.92 : 1 }}
              transition={springs.snappy}
              style={{ width: 32, height: 32, justifyContent: 'center' }}
            >
              <ChevronLeft size={28} color={colors.fg} strokeWidth={1.5} />
            </MotiView>
          </Pressable>
        ) : null}
      </View>

      <Text
        className="font-mono-medium text-orange text-base"
        numberOfLines={1}
      >
        {title}
      </Text>

      <View className="w-10 items-end justify-center">{right}</View>
    </View>
  );
}
