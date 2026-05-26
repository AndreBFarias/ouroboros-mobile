// R-INT-3-HC-INSIGHT-SEMANAL (2026-05-25) -- Card de insight no topo do
// Recap. Componente puro: recebe o InsightSaude (ou null) por prop e
// renderiza uma frase factual e sobria. Oculto quando insight e' null.
//
// ADR-0005 (regra de tom): o insight chega aqui ja garantido como
// positivo (a logica POSITIVE ONLY vive em calcularInsightSaude). Este
// componente so apresenta — sem emoji, sem exclamacao, sem juizo de
// valor adicional. Copy sobria no mesmo registro das secoes Recap.
//
// Estilo: card Dracula sobrio (Card padrao), texto fg, acento cyan
// discreto no detalhe percentual nao e' usado — a frase ja carrega o
// numero. Mantem o registro visual das RecapSecao* (titulo + Card).
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { type InsightSaude } from '@/lib/recap/insights';

interface Props {
  // null = sem insight positivo no periodo (ou ainda carregando). O
  // card se oculta. Nunca chega aqui um insight negativo (garantido em
  // calcularInsightSaude — POSITIVE ONLY).
  insight: InsightSaude | null;
}

export function CardInsightSaude({ insight }: Props) {
  if (!insight) return null;

  return (
    <View accessibilityLabel="insight saude">
      <Card>
        <Text
          style={{
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 15,
            color: colors.fg,
            lineHeight: 24,
          }}
        >
          {insight.texto}
        </Text>
      </Card>
    </View>
  );
}
