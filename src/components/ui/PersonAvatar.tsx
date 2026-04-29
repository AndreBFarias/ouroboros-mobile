// Avatar circular tipado por PessoaId. Cor e inicial vem de
// pessoas.config (corDe, inicialDe). Sizes sm 28 / md 32 / lg 56.
// Quando onPress fornecido, comporta-se como botao com scale 0.96 e
// haptic selection. Quando photoUri fornecido, renderiza Image
// cobrindo o circulo (override do fallback colorido).
import { useState } from 'react';
import { Image, Pressable, Text } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import type { PessoaId } from '@/lib/schemas/pessoa';
import { inicialDe, corDe } from '@/config/pessoas.config';

export type AvatarSize = 'sm' | 'md' | 'lg';

interface PersonAvatarProps {
  pessoa: PessoaId;
  onPress?: () => void;
  size?: AvatarSize;
  // URI local de foto persistida. Se presente, sobrepoe a inicial
  // colorida com a imagem do usuario.
  photoUri?: string | null;
}

const SIZE_PX: Record<AvatarSize, number> = { sm: 28, md: 32, lg: 56 };
const SIZE_TEXT: Record<AvatarSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
};

export function PersonAvatar({
  pessoa,
  onPress,
  size = 'md',
  photoUri,
}: PersonAvatarProps) {
  const [pressed, setPressed] = useState(false);
  const px = SIZE_PX[size];

  const handle = () => {
    if (!onPress) return;
    haptics.selection();
    onPress();
  };

  const hasPhoto = typeof photoUri === 'string' && photoUri.length > 0;

  return (
    <Pressable
      onPressIn={() => onPress && setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={handle}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={`avatar pessoa ${pessoa}`}
    >
      <MotiView
        animate={{ scale: pressed ? 0.96 : 1 }}
        transition={springs.snappy}
        style={{
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: corDe(pessoa),
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {hasPhoto ? (
          <Image
            source={{ uri: photoUri as string }}
            style={{ width: px, height: px }}
            resizeMode="cover"
          />
        ) : (
          <Text className={`${SIZE_TEXT[size]} font-mono-medium text-bg`}>
            {inicialDe(pessoa)}
          </Text>
        )}
      </MotiView>
    </Pressable>
  );
}
