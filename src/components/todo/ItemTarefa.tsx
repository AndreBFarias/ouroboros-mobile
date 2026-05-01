// Item visual de tarefa na lista (M17). Layout horizontal:
//  - Checkbox 24dp a esquerda (border muted-decor quando vazio,
//    fundo green com check 16dp quando feito).
//  - Titulo no meio (sentence case, acentuacao completa). Em
//    feito, fade 60% + risco horizontal opcional pelo caller.
//  - Data muted micro a direita (DD/MM).
//
// Tap simples no item alterna feito (chama onTap). Long-press dispara
// onLongPress (haptic medium fica por conta do caller). Pressao
// rapida com scale 0.97 + spring snappy (mesmo padrao de Button).
//
// Decisao M17 secao 11: tap simples = marcar feito. Sem modal de
// confirmacao. Long-press abre menu Editar/Excluir (gerenciado pela
// tela mae, nao por este componente).
//
// Comentarios sem acento (convencao shell/CI).
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Check } from 'lucide-react-native';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Tarefa } from '@/lib/schemas/tarefa';

export interface ItemTarefaProps {
  tarefa: Tarefa;
  onTap: () => void;
  onLongPress?: () => void;
  // Quando true, desabilita interacoes (durante salvamento).
  disabled?: boolean;
}

const CHECKBOX = 24;
const CHECK_ICON = 16;

// Formata YYYY-MM-DD em DD/MM. Defensivo: string fora do padrao
// volta integral.
function formatarDataCurta(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}`;
}

export function ItemTarefa({
  tarefa,
  onTap,
  onLongPress,
  disabled = false,
}: ItemTarefaProps) {
  const [pressed, setPressed] = useState(false);

  const a11y = `tarefa ${tarefa.titulo}${tarefa.feito ? ' feita' : ' pendente'}`;

  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        setPressed(true);
        haptics.selection();
      }}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (!disabled) onTap();
      }}
      onLongPress={() => {
        if (disabled) return;
        haptics.medium();
        onLongPress?.();
      }}
      delayLongPress={400}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ checked: tarefa.feito, disabled }}
    >
      <MotiView
        animate={{
          scale: pressed ? 0.97 : 1,
          opacity: tarefa.feito ? 0.6 : 1,
        }}
        transition={springs.snappy}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.base,
          backgroundColor: colors.bg,
          borderRadius: radius.card,
        }}
      >
        {/* Checkbox visual. Sem onPress proprio: o tap no item inteiro
            ja alterna o estado (decisao M17). */}
        <View
          style={{
            width: CHECKBOX,
            height: CHECKBOX,
            borderRadius: radius.input,
            borderWidth: tarefa.feito ? 0 : 2,
            borderColor: colors.mutedDecor,
            backgroundColor: tarefa.feito ? colors.green : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {tarefa.feito ? (
            <Check
              size={CHECK_ICON}
              color={colors.bg}
              strokeWidth={3}
              accessibilityLabel="feito"
            />
          ) : null}
        </View>

        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
            textDecorationLine: tarefa.feito ? 'line-through' : 'none',
          }}
        >
          {tarefa.titulo}
        </Text>

        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 14,
            minWidth: 40,
            textAlign: 'right',
          }}
        >
          {formatarDataCurta(tarefa.data)}
        </Text>
      </MotiView>
    </Pressable>
  );
}
