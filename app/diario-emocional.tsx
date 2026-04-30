// Stub idempotente da rota `/diario-emocional`. A captura real chega
// em M06 (modos `vitoria` e `trigger`) e em M06.5 (modo `audio` com
// ML Kit voice via expo-dev-client). Esta sprint M04 apenas mostra o
// `modo` recebido via query string para validar o contrato de rota
// definido em src/lib/navigation/captureRoutes.ts. Sem estado, sem
// schema, sem chamada a vault.
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState, Header, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

type ModoDiario = 'trigger' | 'vitoria' | 'audio';

const MODOS_VALIDOS: readonly ModoDiario[] = [
  'trigger',
  'vitoria',
  'audio',
] as const;

function isModoDiario(value: unknown): value is ModoDiario {
  return (
    typeof value === 'string' &&
    (MODOS_VALIDOS as readonly string[]).includes(value)
  );
}

export default function DiarioEmocional() {
  const router = useRouter();
  const params = useLocalSearchParams<{ modo?: string }>();
  const modoBruto = Array.isArray(params.modo) ? params.modo[0] : params.modo;
  const modo = isModoDiario(modoBruto) ? modoBruto : null;

  return (
    <Screen>
      <Header title="Diário emocional" onBack={() => router.back()} />
      <View style={{ gap: spacing.md }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 20,
          }}
        >
          {modo
            ? `Modo recebido: ${modo}`
            : 'Modo recebido: nenhum (acessada sem params).'}
        </Text>
        <EmptyState frase="Esta captura chega na M06 / M06.5." />
      </View>
    </Screen>
  );
}
