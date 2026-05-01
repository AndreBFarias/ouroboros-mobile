// Wrapper visual de agrupamento da Tela 23 (Settings). Header em
// orange mono micro + lista vertical de filhos com gap consistente.
// Cada filho assume layout proprio (Toggle, LinkSubTela, CardStatus,
// Button etc); SecaoLista so cuida do espacamento e do titulo.
import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

interface SecaoListaProps {
  titulo: string;
  children: ReactNode;
  // a11y label sem acento (convencao do projeto). Default: derivado
  // do titulo via lowercase. Caller pode customizar para nomes
  // multi-palavra ou abreviados.
  accessibilityLabel?: string;
}

export function SecaoLista({
  titulo,
  children,
  accessibilityLabel,
}: SecaoListaProps) {
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={accessibilityLabel ?? `secao ${titulo.toLowerCase()}`}
      style={{ marginTop: spacing.xl }}
    >
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.caption.size,
          lineHeight: typography.caption.size * typography.caption.lineHeight,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.xs,
        }}
      >
        {titulo}
      </Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}
