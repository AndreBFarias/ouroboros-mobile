// Checkbox inline 32dp pra marcar tarefa concluida na Tela Hoje
// (R-HOME-3). Premissas:
//
//  - Tap = check instantaneo (estado otimista <16ms perceived).
//  - Animacao Moti spring (ADR-010): sem timing linear no toggle.
//  - Strike-through no texto da tarefa apos check.
//  - hitSlop 16 cresce a area de toque pra 64dp (WCAG AAA).
//  - accessibilityRole 'checkbox' + accessibilityLabel sem acento
//    ('marcar tarefa <titulo>' = convencao screen reader).
//  - accessibilityState { checked } reflete estado otimista.
//
// O save real (vault write) e responsabilidade do caller via prop
// onCheck(id). O componente apenas:
//   1) atualiza UI otimista (state interno),
//   2) chama onCheck pra disparar persistencia,
//   3) sincroniza de volta caso prop `tarefa.feito` mude.
//
// Caller responde por toast undo + rollback em erro. Decisao tomada
// pra manter o componente puramente visual; a Tela Hoje orquestra o
// fluxo de "marcou -> save + undo -> reverte se preciso" via hook
// useToastUndo. Mantem o checkbox reutilizavel em outros lugares
// (ex: /todo no futuro) sem acoplar a um sistema de toast especifico.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Check } from '@/lib/icons';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Tarefa } from '@/lib/schemas/tarefa';

const CHECKBOX_SIZE = 32;
const CHECK_ICON_SIZE = 18;

export interface CheckboxTarefaInlineProps {
  // O id estavel da tarefa (path relativo no vault, ex:
  // 'markdown/tarefa-compra-pao.md'). Repassado em onCheck.
  id: string;
  // Meta canonico da tarefa. So usa `titulo` e `feito`.
  tarefa: Pick<Tarefa, 'titulo' | 'feito'>;
  // Callback otimista: dispara apos a UI mudar de estado. Caller
  // persiste no vault e cuida do rollback via prop atualizada.
  onCheck?: (id: string, novoEstado: boolean) => void;
  // Long-press opcional. Util pra abrir /todo com edicao detalhada.
  onLongPress?: () => void;
  // Desabilita o tap quando ja em meio a outro save (caller controla).
  disabled?: boolean;
}

export function CheckboxTarefaInline({
  id,
  tarefa,
  onCheck,
  onLongPress,
  disabled = false,
}: CheckboxTarefaInlineProps) {
  // Estado otimista local. Inicia espelhando o feito do prop;
  // sincroniza via useEffect se o caller atualizar (rollback).
  const [checked, setChecked] = useState<boolean>(tarefa.feito);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    setChecked(tarefa.feito);
  }, [tarefa.feito]);

  const handlePress = () => {
    if (disabled) return;
    const novo = !checked;
    // Otimista: muda UI antes do save.
    setChecked(novo);
    haptics.selection();
    onCheck?.(id, novo);
  };

  const handleLongPress = () => {
    if (disabled || !onLongPress) return;
    haptics.medium();
    onLongPress();
  };

  // Label de screen reader sem acento (convencao A11y).
  const a11y = `marcar tarefa ${tarefa.titulo}`;

  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) setPressed(true);
      }}
      onPressOut={() => setPressed(false)}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      disabled={disabled}
      hitSlop={16}
      accessibilityRole="checkbox"
      accessibilityLabel={a11y}
      accessibilityState={{ checked, disabled }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
        backgroundColor: colors.bg,
        borderRadius: radius.card,
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <MotiView
        animate={{
          scale: checked ? 1 : 1,
          backgroundColor: checked ? colors.green : 'transparent',
        }}
        transition={springs.snappy}
        style={{
          width: CHECKBOX_SIZE,
          height: CHECKBOX_SIZE,
          borderRadius: radius.input,
          borderWidth: checked ? 0 : 2,
          borderColor: colors.mutedDecor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MotiView
          animate={{
            scale: checked ? 1 : 0,
            opacity: checked ? 1 : 0,
          }}
          transition={springs.snappy}
        >
          <Check
            size={CHECK_ICON_SIZE}
            color={colors.bg}
            strokeWidth={3}
            accessibilityLabel="feito"
          />
        </MotiView>
      </MotiView>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={2}
          style={{
            color: checked ? colors.muted : colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
            textDecorationLine: checked ? 'line-through' : 'none',
          }}
        >
          {tarefa.titulo}
        </Text>
      </View>
    </Pressable>
  );
}
