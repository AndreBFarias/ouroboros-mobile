// Picker de foto de perfil. Abre galeria via expo-image-picker,
// copia a foto escolhida para documentDirectory/avatars/<pessoa>.jpg
// e persiste a URI em usePessoa.fotos. Renderiza preview circular
// 96dp por padrao com placeholder de camera quando vazio.
//
// Uso (onboarding Frame 0):
//   <AvatarPicker pessoa="pessoa_a" />
import { useState, useCallback } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { usePessoa } from '@/lib/stores/pessoa';
import { corDe, inicialDe } from '@/config/pessoas.config';
import { PersonAvatar } from './PersonAvatar';

interface AvatarPickerProps {
  pessoa: PessoaAutor;
  size?: number;
}

export function AvatarPicker({ pessoa, size = 96 }: AvatarPickerProps) {
  const fotoAtual = usePessoa((s) => s.fotos[pessoa]);
  const setFoto = usePessoa((s) => s.setFoto);
  const [pressed, setPressed] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const escolher = useCallback(async () => {
    setCarregando(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      // SDK 54+ usa array de MediaType ao inves de MediaTypeOptions.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;
      const origem = result.assets[0].uri;

      const destinoDir = `${FileSystem.documentDirectory ?? ''}avatars/`;
      try {
        await FileSystem.makeDirectoryAsync(destinoDir, {
          intermediates: true,
        });
      } catch {
        // Ja existe, ok.
      }

      // Cada nova foto recebe um nome com timestamp para invalidar
      // o cache de Image do RN (que indexa por URI). Apagamos o
      // arquivo antigo se houver, evitando lixo acumulado em
      // documentDirectory.
      if (fotoAtual) {
        try {
          await FileSystem.deleteAsync(fotoAtual, { idempotent: true });
        } catch {
          // Sem foto anterior em disco, ok.
        }
      }
      const destinoPath = `${destinoDir}${pessoa}-${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: origem, to: destinoPath });
      setFoto(pessoa, destinoPath);
      haptics.success();
    } finally {
      setCarregando(false);
    }
  }, [pessoa, setFoto, fotoAtual]);

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={escolher}
        disabled={carregando}
        accessibilityRole="button"
        accessibilityLabel={`escolher foto de ${pessoa}`}
      >
        <MotiView
          animate={{ scale: pressed ? 0.97 : 1 }}
          transition={springs.snappy}
        >
          {fotoAtual ? (
            <PersonAvatarBig pessoa={pessoa} photoUri={fotoAtual} size={size} />
          ) : (
            <PlaceholderCamera pessoa={pessoa} size={size} />
          )}
        </MotiView>
      </Pressable>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {fotoAtual ? 'Trocar foto' : 'Escolher foto (opcional)'}
      </Text>
    </View>
  );
}

interface PersonAvatarBigProps {
  pessoa: PessoaAutor;
  photoUri: string;
  size: number;
}

function PersonAvatarBig({ pessoa, photoUri, size }: PersonAvatarBigProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: corDe(pessoa),
        overflow: 'hidden',
      }}
    >
      <PersonAvatarImage uri={photoUri} size={size} />
    </View>
  );
}

function PersonAvatarImage({ uri, size }: { uri: string; size: number }) {
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      resizeMode="cover"
    />
  );
}

interface PlaceholderProps {
  pessoa: PessoaAutor;
  size: number;
}

function PlaceholderCamera({ pessoa, size }: PlaceholderProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.bgElev,
        borderWidth: 2,
        borderColor: corDe(pessoa),
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Camera size={size * 0.32} color={colors.mutedDecor} strokeWidth={1.6} />
      <Text
        style={{
          color: colors.mutedDecor,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: size * 0.16,
          marginTop: 4,
        }}
      >
        {inicialDe(pessoa)}
      </Text>
    </View>
  );
}

// Re-export para conveniencia: AvatarPicker e o widget interativo,
// mas alguns lugares (storybook) podem querer so o preview sem tap.
export { PersonAvatar };
