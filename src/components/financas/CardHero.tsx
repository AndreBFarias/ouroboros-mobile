// Card hero da Tela 22 (M14). Cabecalho laranja "Gasto da semana",
// valor em cyan tipografia heading-1, periodo de referencia em
// muted, delta textual em muted (ADR-0005: sem cores positivas/
// negativas para delta).
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

interface CardHeroProps {
  gastoSemana: number;
  periodoReferencia: string;
  deltaTextual: string;
}

function formatarBRL(valor: number): string {
  // Intl.NumberFormat 'pt-BR' produz "R$ 1.234,56".
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  } catch {
    // Fallback simples para ambientes sem ICU completo.
    const fixed = valor.toFixed(2).replace('.', ',');
    return `R$ ${fixed}`;
  }
}

export function CardHero({
  gastoSemana,
  periodoReferencia,
  deltaTextual,
}: CardHeroProps): ReactNode {
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.heading2.size,
            lineHeight:
              typography.heading2.size * typography.heading2.lineHeight,
          }}
          accessibilityLabel="gasto da semana"
        >
          Gasto da semana
        </Text>
        <Text
          style={{
            color: colors.cyan,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.heading1.size,
            lineHeight:
              typography.heading1.size * typography.heading1.lineHeight,
          }}
          accessibilityLabel={`valor ${gastoSemana.toFixed(2)}`}
        >
          {formatarBRL(gastoSemana)}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
          }}
        >
          {periodoReferencia}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
            marginTop: spacing.xs,
          }}
          accessibilityLabel={`delta ${deltaTextual}`}
        >
          {deltaTextual}
        </Text>
      </View>
    </Card>
  );
}
