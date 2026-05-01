// Modal central de confirmacao destrutiva para reset de contador
// (M18). Texto canonico: "Marcar reset hoje? O contador volta para
// 0.". Botoes: "Sim, resetei" red text (destructive variante), e
// "Cancelar" muted (ghost variante).
//
// Sem celebracao visual: nao ha animacao de saida triunfal. Usa a
// transicao padrao de fade do RN Modal. Pos-confirmacao, o caller
// dispara haptic medium + toast "Reset registrado." (textos sem
// julgamento, conforme ADR-0005).
//
// Comentarios sem acento (convencao shell/CI).
import { Modal, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

interface ModalConfirmaResetProps {
  visible: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  // Confirmando em progresso bloqueia o botao para evitar double-tap.
  enviando?: boolean;
}

export function ModalConfirmaReset({
  visible,
  onConfirmar,
  onCancelar,
  enviando = false,
}: ModalConfirmaResetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancelar}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(20, 21, 26, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: colors.bg,
            borderRadius: radius.modal,
            padding: spacing.lg,
            gap: spacing.base,
            width: '100%',
            maxWidth: 360,
          }}
          accessibilityLabel="modal confirmar reset contador"
        >
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 16,
              lineHeight: 24,
            }}
          >
            Marcar reset hoje? O contador volta para 0.
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Button
              label="Sim, resetei"
              onPress={onConfirmar}
              variant="destructive"
              disabled={enviando}
            />
            <Button
              label="Cancelar"
              onPress={onCancelar}
              variant="ghost"
              disabled={enviando}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
