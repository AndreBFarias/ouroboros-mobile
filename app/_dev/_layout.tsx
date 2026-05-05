// M-GAUNTLET: layout interno de rotas /_dev/*. Em producao (ou em
// mobile real sem GAUNTLET_ATIVO), redireciona para / antes de
// renderizar children -- garante que rotas dev nao vazem em release.
//
// O frame mobile 412dp e o background cinza fora do frame agora
// vivem no _layout.tsx raiz (FrameMobileGauntlet); este layout so
// adiciona o banner amarelo acima do Stack interno, lembrando o
// orquestrador que esta em rota dev.
//
// Comentarios sem acento.
// M-GAUNTLET-DEAD-CODE-V2: import direto de @/lib/dev/gauntlet vazaria
// markers no bytecode. MODO_DEV_WEB vem do micro-modulo gauntletAtivo
// (zero strings markers). Como expo-router faz require.context que
// inclui app/_dev/* no bundle release, precisamos garantir que esses
// arquivos NAO importem o gauntlet pesado.
import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';
import { colors, spacing, typography } from '@/theme/tokens';

export default function DevLayout() {
  if (!MODO_DEV_WEB) {
    return <Redirect href="/" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <View
        accessibilityRole="alert"
        accessibilityLabel="banner modo gauntlet ativo"
        style={{
          backgroundColor: colors.yellow,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.bgPage,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.caption.size,
            letterSpacing: 1.5,
          }}
        >
          MODO GAUNTLET ATIVO
        </Text>
      </View>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgPage },
        }}
      />
    </View>
  );
}
