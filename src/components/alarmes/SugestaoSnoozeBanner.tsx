// Banner de sugestao temporal sobre snooze (R-ROT-1-A).
//
// Exibido em /alarmes/[slug] quando o helper inteligenciaSnooze detecta
// padrao consistente (>=3 snoozes em 30 dias, concordancia >=80%).
// Microcopy + dois CTAs:
//   - Aceitar: caller aplica novaHora no alarme e re-agenda.
//   - Rejeitar: caller silencia sugestao por 30 dias.
//
// Visual: fundo bgAlt, accent purple (mesmo tom da recorrencia).
// Sentence case + acentuacao completa PT-BR. Sem haptic no render -
// haptic so na acao do botao (delegado para Button via variante).
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

interface SugestaoSnoozeBannerProps {
  // Microcopy curto que motiva a sugestao. Ex: "Voce costuma adiar 15
  // minutos." Vindo do helper (calcularSugestaoSnooze).
  motivo: string;
  // Horario atual do alarme (HH:MM 24h). Mostrado para contexto.
  horarioAtual: string;
  // Novo horario proposto (HH:MM 24h). Highlight do banner.
  novaHora: string;
  onAceitar: () => void;
  onRejeitar: () => void;
}

export function SugestaoSnoozeBanner({
  motivo,
  horarioAtual,
  novaHora,
  onAceitar,
  onRejeitar,
}: SugestaoSnoozeBannerProps): ReactNode {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="sugestao de novo horario com base no historico"
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.input,
        borderWidth: 1,
        borderColor: colors.purple,
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 14,
          lineHeight: 14 * 1.6,
        }}
      >
        {motivo}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          lineHeight: 13 * 1.6,
        }}
      >
        Quer mover de {horarioAtual} para {novaHora}?
      </Text>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          marginTop: spacing.xs,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button
            label="Aceitar"
            onPress={onAceitar}
            variant="primary"
            accessibilityLabel="aceitar nova hora sugerida"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Rejeitar"
            onPress={onRejeitar}
            variant="ghost"
            accessibilityLabel="rejeitar e silenciar sugestao"
          />
        </View>
      </View>
    </View>
  );
}
