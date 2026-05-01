// Menu modal contextual disparado por long-press em ItemTarefa (M17).
// Modal transparente (RN nativo) cobre a tela com backdrop escuro
// 85%; centro inferior tem um cartao com 2 acoes empilhadas:
//  - Editar (text fg)
//  - Excluir (text red)
// Tap no backdrop fecha sem acao.
//
// Caller controla visibilidade via prop `visible`. Este componente nao
// guarda estado.
//
// Comentarios sem acento (convencao shell/CI).
import { Modal, Pressable, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export interface MenuLongPressProps {
  visible: boolean;
  // Titulo da tarefa para mostrar no cabecalho do menu.
  tituloAlvo?: string;
  onEditar: () => void;
  onExcluir: () => void;
  onFechar: () => void;
}

export function MenuLongPress({
  visible,
  tituloAlvo,
  onEditar,
  onExcluir,
  onFechar,
}: MenuLongPressProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onFechar}
    >
      <Pressable
        onPress={onFechar}
        style={{
          flex: 1,
          backgroundColor: 'rgba(20, 21, 26, 0.85)',
          justifyContent: 'flex-end',
          padding: spacing.lg,
        }}
        accessibilityRole="button"
        accessibilityLabel="fechar menu"
      >
        {/* Pressable interno bloqueia propagacao para nao fechar quando
            o usuario tocar dentro do cartao. */}
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.bg,
            borderRadius: radius.modal,
            padding: spacing.base,
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
          accessibilityLabel="menu de acoes"
        >
          {tituloAlvo ? (
            <Text
              numberOfLines={1}
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 12,
                lineHeight: 18,
                paddingHorizontal: spacing.sm,
                paddingTop: spacing.xs,
              }}
            >
              {tituloAlvo}
            </Text>
          ) : null}

          <ItemMenu
            label="Editar"
            corTexto={colors.fg}
            onPress={onEditar}
            accessibilityLabel="editar tarefa"
          />
          <ItemMenu
            label="Excluir"
            corTexto={colors.red}
            onPress={onExcluir}
            accessibilityLabel="excluir tarefa"
          />
        </Pressable>

        <View
          style={{
            backgroundColor: colors.bg,
            borderRadius: radius.modal,
          }}
        >
          <ItemMenu
            label="Cancelar"
            corTexto={colors.muted}
            onPress={onFechar}
            accessibilityLabel="cancelar menu"
          />
        </View>
      </Pressable>
    </Modal>
  );
}

// Helper interno para uma linha do menu. Hit area 56dp.
function ItemMenu({
  label,
  corTexto,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  corTexto: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: 56,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: corTexto,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 14,
          lineHeight: 22,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
