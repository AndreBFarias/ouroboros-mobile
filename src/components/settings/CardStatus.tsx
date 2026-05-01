// Card colorido para o bloco "Sync" da Tela 23. Cor de borda lateral
// + ponto indicador correspondem ao status retornado por
// services/syncStatus.ts. Apenas leitura; não tem onPress.
//
// Uso:
//   <CardStatus cor="verde" titulo="Sincronizado" subtitulo="Vault: ~/Protocolo-Ouroboros/" />
import { Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { SyncCor } from '@/lib/services/syncStatus';

interface CardStatusProps {
  cor: SyncCor;
  titulo: string;
  subtitulo?: string;
  // a11y label sem acento. Caller fornece descricao curta tipo
  // "status sync verde".
  accessibilityLabel?: string;
}

const COR_BY_STATUS: Record<SyncCor, string> = {
  verde: colors.green,
  amarelo: colors.yellow,
  vermelho: colors.red,
  desconhecido: colors.mutedDecor,
};

export function CardStatus({
  cor,
  titulo,
  subtitulo,
  accessibilityLabel,
}: CardStatusProps) {
  const tint = COR_BY_STATUS[cor];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={
        accessibilityLabel ?? `card status sync ${cor}`
      }
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        borderLeftWidth: 3,
        borderLeftColor: tint,
        padding: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: tint,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
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
            numberOfLines={2}
          >
            {subtitulo}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
