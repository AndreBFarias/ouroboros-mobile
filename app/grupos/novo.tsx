// Stub de criacao de Grupo de Treino (Q19, sprint follow-up).
// MVP esqueleto: redireciona para /grupos com toast informativo.
// Implementacao completa (form + multi-select de rotinas) entra em
// Q19.b dedicada.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Header, Screen, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

export default function GruposNovo() {
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    toast.show('Em desenvolvimento — Q19.b.', 'info');
  }, [toast]);

  return (
    <Screen>
      <Header title="Novo grupo" onBack={() => router.back()} />
      <View
        style={{
          flex: 1,
          paddingTop: spacing.huge,
          alignItems: 'center',
          gap: spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
            textAlign: 'center',
          }}
        >
          Esta tela ainda está sendo construída. Por enquanto, crie
          rotinas individuais em /rotinas; quando o form de grupos
          ficar pronto, suas rotinas existentes poderão ser agrupadas.
        </Text>
        <Button label="Voltar" onPress={() => router.back()} variant="ghost" />
      </View>
    </Screen>
  );
}
