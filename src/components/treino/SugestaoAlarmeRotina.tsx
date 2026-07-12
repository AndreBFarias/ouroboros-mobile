// Banner de sugestao temporal de alarme para rotina de treino (R-ROT-1-D).
//
// Exibido na tela /rotinas/[slug] quando o helper
// inteligenciaTemporal de treino detecta padrao consistente
// (>=4 execucoes da mesma rotina em 30 dias, >=80% concentradas em
// cluster +-60min). Microcopy + dois CTAs:
//   - Aceitar: caller cria alarme via writer canonico `escreverAlarme`.
//   - Rejeitar: caller silencia sugestao por 30 dias (campo
//     silenciar_sugestao_ate da rotina via silenciarSugestaoRotina).
//
// Visual: fundo bgAlt, accent purple (paridade com banner de snooze
// R-ROT-1-A e SugestaoAlarmeTarefa R-ROT-1-B). Sentence case +
// acentuacao completa PT-BR. Sem haptic no render: haptic so na
// acao do botao (delegado para Button via variante).
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

interface SugestaoAlarmeRotinaProps {
  // Nome da rotina (visivel ao usuario, com acentuacao). Ex:
  // "Rotina A — peito e triceps".
  nomeRotina: string;
  // Microcopy curto que motiva a sugestao. Ex: "Você costuma treinar
  // essa rotina por volta das 18:00." Vindo do helper
  // detectarPadraoHorarioRotina.
  motivo: string;
  // Horario proposto (HH:MM 24h). Highlight do banner.
  hora: string;
  onAceitar: () => void;
  onRejeitar: () => void;
}

export function SugestaoAlarmeRotina({
  nomeRotina,
  motivo,
  hora,
  onAceitar,
  onRejeitar,
}: SugestaoAlarmeRotinaProps): ReactNode {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="sugestao de alarme com base no historico de execucoes da rotina"
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
        Quer criar um alarme para {nomeRotina} às {hora}?
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
            label="Criar alarme"
            onPress={onAceitar}
            variant="primary"
            accessibilityLabel="aceitar e criar alarme sugerido para rotina"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Agora não"
            onPress={onRejeitar}
            variant="ghost"
            accessibilityLabel="rejeitar e silenciar sugestao da rotina"
          />
        </View>
      </View>
    </View>
  );
}
