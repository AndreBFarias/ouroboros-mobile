// R-NAV-3-V2 -- Componente reutilizavel para confirmacao de exclusao.
// Modal Dracula canonico (NAO Alert nativo, viola ADR-010). Substitui
// Modais inline duplicados em 5 telas: alarmes/novo, contadores/[slug],
// rotinas (FormRotina), exercicios/[slug], grupos (FormGrupo).
//
// Layout:
//   - Backdrop rgba(20, 21, 26, 0.85) (token canonico de overlay).
//   - Card central maxWidth 360, padding lg, gap base.
//   - Titulo (heading) + descricao opcional (muted).
//   - 2 botoes: Excluir destructive (acima) + Cancelar ghost (abaixo).
//
// Texto do titulo segue Sentence case PT-BR com acentuacao completa
// (ex: "Excluir contador?"). accessibilityLabel sem acento, convencao
// screen reader (BRIEF §1.4).
//
// Comentarios sem acento (convencao shell/CI).
import { Modal, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, radius, spacing } from '@/theme/tokens';

export interface ConfirmarExclusaoProps {
  visible: boolean;
  titulo: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  descricao?: string;
  // Permite desabilitar botoes durante operacao assincrona em curso.
  excluindo?: boolean;
}

export function ConfirmarExclusao({
  visible,
  titulo,
  onConfirmar,
  onCancelar,
  descricao,
  excluindo = false,
}: ConfirmarExclusaoProps) {
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
          accessibilityLabel="modal confirmar exclusao"
        >
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 16,
              lineHeight: 24,
            }}
          >
            {titulo}
          </Text>
          {descricao ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {descricao}
            </Text>
          ) : null}
          <View style={{ gap: spacing.sm }}>
            <Button
              label="Excluir"
              accessibilityLabel="excluir"
              onPress={onConfirmar}
              variant="destructive"
              disabled={excluindo}
            />
            <Button
              label="Cancelar"
              accessibilityLabel="cancelar"
              onPress={onCancelar}
              variant="ghost"
              disabled={excluindo}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
