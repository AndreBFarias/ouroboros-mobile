// Bloco "Fotos" opcional da Tela 20. Botao "Adicionar foto" abre o
// expo-image-picker (mediaTypes=['images'], A4 do BRIEF). Cada foto
// escolhida vira um thumbnail 80dp em grid 3 colunas com pequeno
// botao 'X' overlay para remover. Cap interno de 6 fotos: ao
// atingir, o botao fica disabled.
//
// O componente não copia a foto pra documentDirectory aqui; isso
// acontece em saveEvento ao gravar, alinhando os arquivos de assets
// com o ciclo do .md (rollback simples se o save falhar). O estado
// fica como lista de URIs locais (file://... ou content://...).
import { useCallback } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { X } from '@/lib/icons';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';

const CAP_FOTOS = 6;
const THUMB_SIZE = 80;

export interface FotosBlockProps {
  fotos: string[];
  onChangeFotos: (next: string[]) => void;
  disabled?: boolean;
}

export function FotosBlock({
  fotos,
  onChangeFotos,
  disabled = false,
}: FotosBlockProps) {
  const cheio = fotos.length >= CAP_FOTOS;

  const adicionar = useCallback(async () => {
    if (disabled || cheio) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    // SDK 54+ usa array de MediaType (A4 do BRIEF). MediaTypeOptions
    // foi deprecado e some no SDK 55.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;
    const novaUri = result.assets[0].uri;
    haptics.light();
    onChangeFotos([...fotos, novaUri]);
  }, [cheio, disabled, fotos, onChangeFotos]);

  const remover = useCallback(
    (idx: number) => {
      if (disabled) return;
      haptics.selection();
      const next = fotos.filter((_, i) => i !== idx);
      onChangeFotos(next);
    },
    [disabled, fotos, onChangeFotos]
  );

  return (
    <View style={{ gap: spacing.sm }} accessibilityLabel="bloco fotos">
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        Fotos
      </Text>

      {fotos.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
        >
          {fotos.map((uri, idx) => (
            <View
              key={`${uri}-${idx}`}
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: radius.input,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: colors.bgElev,
              }}
            >
              <Image
                source={{ uri }}
                style={{
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                }}
                resizeMode="cover"
                accessibilityLabel={`thumbnail foto ${idx + 1}`}
              />
              <Pressable
                onPress={() => remover(idx)}
                accessibilityRole="button"
                accessibilityLabel={`remover foto ${idx + 1}`}
                hitSlop={6}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: colors.red,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} color={colors.bg} strokeWidth={2.4} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Button
        variant="ghost"
        label={cheio ? 'Limite de 6 fotos atingido' : 'Adicionar foto'}
        onPress={adicionar}
        disabled={disabled || cheio}
      />
    </View>
  );
}
