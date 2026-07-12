// Menu modal contextual disparado por long-press em ItemTarefa (M17).
// Modal transparente (RN nativo) cobre a tela com backdrop escuro
// 85%; centro inferior tem um cartao com acoes empilhadas.
//
// API v1 (M17): props onEditar/onExcluir renderizam "Editar" + "Excluir".
//
// API v2 (M31): nova prop opcional `acoes` permite ao caller injetar
// uma lista de acoes customizadas (ex: "Reabrir" + "Apagar definitivo"
// para tarefas concluidas). Quando `acoes` esta presente, sobrescreve
// o par padrao Editar/Excluir mas mantem semantica visual (label + cor).
// Sem `acoes` (modo M17), o comportamento e identico ao original.
//
// Tap no backdrop fecha sem acao.
//
// Caller controla visibilidade via prop `visible`. Este componente nao
// guarda estado.
//
// Comentarios sem acento (convencao shell/CI).
import { Modal, Pressable, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export interface MenuLongPressAcao {
  label: string;
  // Cor do texto. Use colors.fg para neutro, colors.red para destrutivo.
  corTexto: string;
  onPress: () => void;
  // accessibilityLabel obrigatorio (sem acento, convencao a11y).
  accessibilityLabel: string;
}

export interface MenuLongPressProps {
  visible: boolean;
  // Titulo da tarefa para mostrar no cabecalho do menu.
  tituloAlvo?: string;
  // M17: handlers default. Ignorados quando `acoes` e fornecido.
  onEditar?: () => void;
  onExcluir?: () => void;
  // M31: lista custom de acoes. Quando ausente, renderiza Editar/Excluir
  // a partir dos handlers acima (compat M17).
  acoes?: ReadonlyArray<MenuLongPressAcao>;
  onFechar: () => void;
}

export function MenuLongPress({
  visible,
  tituloAlvo,
  onEditar,
  onExcluir,
  acoes,
  onFechar,
}: MenuLongPressProps) {
  // Resolve a lista efetiva de acoes. Quando acoes nao foi fornecido,
  // monta o par M17 a partir dos handlers default (defesa: ignora se
  // handler ausente para nao crashar).
  const acoesEfetivas: ReadonlyArray<MenuLongPressAcao> = acoes
    ? acoes
    : (() => {
        const padrao: MenuLongPressAcao[] = [];
        if (onEditar) {
          padrao.push({
            label: 'Editar',
            corTexto: colors.fg,
            onPress: onEditar,
            accessibilityLabel: 'editar tarefa',
          });
        }
        if (onExcluir) {
          padrao.push({
            label: 'Excluir',
            corTexto: colors.red,
            onPress: onExcluir,
            accessibilityLabel: 'excluir tarefa',
          });
        }
        return padrao;
      })();

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
            o usuario tocar dentro do cartao.
            R-A11Y-TALKBACK (2026-05-17): role="menu" semantica de
            container de itens (nao e botao acionavel; o onPress noop
            so existe para stop-propagation do tap no overlay). */}
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.bg,
            borderRadius: radius.modal,
            padding: spacing.base,
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
          accessibilityRole="menu"
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

          {acoesEfetivas.map((acao) => (
            <ItemMenu
              key={acao.label}
              label={acao.label}
              corTexto={acao.corTexto}
              onPress={acao.onPress}
              accessibilityLabel={acao.accessibilityLabel}
            />
          ))}
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
