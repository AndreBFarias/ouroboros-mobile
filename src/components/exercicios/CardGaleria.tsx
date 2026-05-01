// Card 1:1 da galeria de exercicios (Tela 07). Quadrado com GIF
// preview no topo (estatico em web; anima no nativo via expo-image
// se estiver instalado, fallback para Image). Nome em laranja
// abaixo da preview, em sentence case com acentuacao PT-BR completa.
//
// Quando o exercicio nao tem GIF, mostra placeholder Dumbbell
// muted-decor 48dp + label "Sem mídia" em muted micro.
//
// Long-press abre menu rapido (Editar / Excluir). Tap navega para
// /(tabs)/exercicios/[slug].
//
// Comentarios sem acento (convencao shell/CI).
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Dumbbell } from 'lucide-react-native';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius } from '@/theme/tokens';
import type { Exercicio } from '@/lib/schemas/exercicio';

interface CardGaleriaProps {
  exercicio: Exercicio;
  // URI absoluto do GIF resolvido para SAF (vaultRoot + exercicio.gif)
  // ou null quando nao ha GIF cadastrado. Caller resolve pra simplificar
  // o componente (nao precisa conhecer vaultRoot).
  gifUri: string | null;
  onPress: () => void;
  onLongPress?: () => void;
}

export function CardGaleria({
  exercicio,
  gifUri,
  onPress,
  onLongPress,
}: CardGaleriaProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPressIn={() => {
        setPressed(true);
        haptics.light();
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      onLongPress={() => {
        if (!onLongPress) return;
        haptics.medium();
        onLongPress();
      }}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`abrir exercicio ${exercicio.slug}`}
      style={{ flex: 1 }}
    >
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1 }}
        transition={springs.snappy}
        style={{
          backgroundColor: colors.bgAlt,
          borderRadius: radius.card,
          padding: 12,
          gap: 8,
        }}
      >
        <View
          style={{
            aspectRatio: 1,
            backgroundColor: colors.bg,
            borderRadius: radius.input,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {gifUri ? (
            <Image
              source={{ uri: gifUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              accessibilityLabel={`gif ${exercicio.slug}`}
            />
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Dumbbell
                size={48}
                color={colors.mutedDecor}
                strokeWidth={1.5}
              />
              <Text
                style={{
                  color: colors.mutedDecor,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 14,
                }}
              >
                Sem mídia
              </Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={2}
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {exercicio.nome}
        </Text>
      </MotiView>
    </Pressable>
  );
}
