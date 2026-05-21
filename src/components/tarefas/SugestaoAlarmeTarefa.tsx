// Banner de sugestao temporal de alarme para tarefa (R-ROT-1-B).
//
// Exibido na lista de tarefas (/todo) quando o helper
// inteligenciaTemporal detecta padrao consistente (>=3 marcacoes de
// uma mesma tarefa-familia em 14 dias, >=80% concentradas em
// cluster +-30min). Microcopy + dois CTAs:
//   - Aceitar: caller cria alarme companion com horario sugerido.
//   - Rejeitar: caller silencia sugestao por 30 dias (campo
//     silenciar_sugestao_ate da tarefa).
//
// Visual: fundo bgAlt, accent purple (mesmo tom do banner de snooze).
// Sentence case + acentuacao completa PT-BR. Sem haptic no render:
// haptic so na acao do botao (delegado para Button via variante).
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

interface SugestaoAlarmeTarefaProps {
  // Titulo da tarefa-familia. Mostrado para contexto do usuario.
  // Ex: "Tomar remédio".
  tituloTarefa: string;
  // Microcopy curto que motiva a sugestao. Ex: "Você costuma marcar
  // essa tarefa por volta das 20:00." Vindo do helper
  // calcularPadraoHorarioTarefa.
  motivo: string;
  // Horario proposto (HH:MM 24h). Highlight do banner.
  hora: string;
  onAceitar: () => void;
  onRejeitar: () => void;
}

export function SugestaoAlarmeTarefa({
  tituloTarefa,
  motivo,
  hora,
  onAceitar,
  onRejeitar,
}: SugestaoAlarmeTarefaProps): ReactNode {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="sugestao de alarme com base no historico de marcacoes"
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
        Quer criar um alarme para {tituloTarefa} às {hora}?
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
            accessibilityLabel="aceitar e criar alarme sugerido"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Agora não"
            onPress={onRejeitar}
            variant="ghost"
            accessibilityLabel="rejeitar e silenciar sugestao"
          />
        </View>
      </View>
    </View>
  );
}
