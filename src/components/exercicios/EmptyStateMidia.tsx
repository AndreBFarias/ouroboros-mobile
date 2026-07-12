// Placeholder reutilizavel para midia de execucao indisponivel
// (R-SF-2). Renderizado pelo MidiaExecucaoPlayer quando o <Image>
// ou <Video> dispara onError (URI invalida, arquivo corrompido,
// formato nao suportado). Tambem pode ser usado standalone por
// quem quiser exibir o mesmo placeholder.
//
// UI: card com aspectRatio 16:10 (lg) ou quadrado 96x96 (sm) +
// radius 12. Icone ImageOff centralizado. Texto "Midia indisponivel"
// aparece apenas no tamanho `lg`; no `sm` so o icone cabe sem virar
// ruido visual.
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ImageOff } from '@/lib/icons';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface EmptyStateMidiaProps {
  size?: 'sm' | 'lg';
  accessibilityLabel?: string;
}

export function EmptyStateMidia({
  size = 'lg',
  accessibilityLabel = 'midia indisponivel',
}: EmptyStateMidiaProps): ReactNode {
  const dimensoes =
    size === 'sm'
      ? { width: 96, height: 96 }
      : { width: '100%' as const, aspectRatio: 16 / 10 };

  return (
    <View
      style={{
        ...dimensoes,
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.bgElev,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
      }}
      accessibilityLabel={accessibilityLabel}
    >
      <ImageOff
        size={size === 'sm' ? 28 : 36}
        color={colors.mutedDecor}
        strokeWidth={1.5}
      />
      {size === 'lg' ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: typography.caption.size,
            lineHeight:
              typography.caption.size * typography.caption.lineHeight,
            marginTop: spacing.sm,
            textAlign: 'center',
          }}
        >
          Mídia indisponível
        </Text>
      ) : null}
    </View>
  );
}
