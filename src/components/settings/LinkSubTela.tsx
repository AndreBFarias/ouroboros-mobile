// Linha clicavel que navega para sub-tela. Mostra titulo a esquerda,
// chevron a direita. Pressed em scale 0.99 com spring snappy + haptic
// light. Uso:
//   <LinkSubTela
//     titulo="Editar nomes e fotos"
//     onPress={() => router.push('/settings/editar-pessoa')}
//   />
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { ChevronRight } from 'lucide-react-native';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface LinkSubTelaProps {
  titulo: string;
  onPress: () => void;
  subtitulo?: string;
  // a11y label sem acento.
  accessibilityLabel?: string;
}

export function LinkSubTela({
  titulo,
  onPress,
  subtitulo,
  accessibilityLabel,
}: LinkSubTelaProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPressIn={() => {
        setPressed(true);
        haptics.light();
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo.toLowerCase()}
    >
      <MotiView
        animate={{ scale: pressed ? 0.99 : 1 }}
        transition={springs.snappy}
        style={{
          backgroundColor: colors.bgAlt,
          borderRadius: radius.card,
          padding: spacing.base,
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.body.size,
              lineHeight: typography.body.size * typography.body.lineHeight,
            }}
          >
            {titulo}
          </Text>
          {subtitulo ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: typography.caption.size,
                lineHeight:
                  typography.caption.size * typography.caption.lineHeight,
                marginTop: 2,
              }}
            >
              {subtitulo}
            </Text>
          ) : null}
        </View>
        <ChevronRight
          size={20}
          color={colors.mutedDecor}
          strokeWidth={1.6}
        />
      </MotiView>
    </Pressable>
  );
}
