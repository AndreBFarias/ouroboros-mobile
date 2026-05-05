// Item visual de tarefa na lista (M17 + M31). Layout horizontal:
//  - Checkbox 24dp a esquerda (border muted-decor quando vazio,
//    fundo green com check 16dp quando feito).
//  - Bloco central: linha 1 com icone categoria 14dp + titulo;
//    linha 2 (M31, opcional) com chip micro do destino quando != mim.
//  - Data muted micro a direita (DD/MM).
//
// Tap simples no item alterna feito (chama onTap). Long-press dispara
// onLongPress (haptic medium fica por conta do caller). Pressao
// rapida com scale 0.97 + spring snappy (mesmo padrao de Button).
//
// Decisão M17 seção 11: tap simples = marcar feito. Sem modal de
// confirmacao. Long-press abre menu Editar/Excluir (gerenciado pela
// tela mae, não por este componente).
//
// M31: tarefa concluida nao some - vai para secao Concluidas. Long-press
// em concluida abre menu Reabrir/Apagar definitivo (caller cuida).
// Item concluido tem opacity 60% + line-through no titulo (preservado
// do M17).
//
// Comentarios sem acento (convencao shell/CI).
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import {
  Briefcase,
  Check,
  Heart,
  HelpCircle,
  Home,
  Repeat,
  Scale,
  Sparkles,
  Wallet,
  type LucideIcon,
} from '@/lib/icons';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import { useNomeDe } from '@/lib/stores/pessoa';
import type { Tarefa, TarefaCategoria } from '@/lib/schemas/tarefa';

export interface ItemTarefaProps {
  tarefa: Tarefa;
  onTap: () => void;
  onLongPress?: () => void;
  // Quando true, desabilita interacoes (durante salvamento).
  disabled?: boolean;
}

const CHECKBOX = 24;
const CHECK_ICON = 16;
const CATEGORIA_ICON_SIZE = 14;

// Mesmo mapeamento usado em SheetNovaTarefa. Mantido inline aqui para
// evitar dependencia cruzada de UI privada.
const CATEGORIA_ICON: Record<TarefaCategoria, LucideIcon> = {
  trabalho: Briefcase,
  casa: Home,
  rotina: Repeat,
  financas: Wallet,
  desenvolvimento_pessoal: Sparkles,
  obrigacoes: Scale,
  saude: Heart,
  outro: HelpCircle,
};

// Formata YYYY-MM-DD em DD/MM. Defensivo: string fora do padrao
// volta integral.
function formatarDataCurta(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}`;
}

// Resolve um label curto para o destino da tarefa. 'mim' nao mostra
// chip (default implicito). Demais retornam string compacta.
function useLabelDestino(tarefa: Tarefa): string | null {
  // Hook sempre chamado para respeitar regras dos hooks; resultado
  // condicional via switch fora do bloco.
  const destino = tarefa.pessoa_destino;
  const nomeOutra = useNomeDe(
    destino.tipo === 'outra' ? destino.pessoa : 'pessoa_a'
  );
  switch (destino.tipo) {
    case 'mim':
      return null;
    case 'casal':
      return 'Casal';
    case 'outra':
      return nomeOutra;
    case 'terceiro':
      return destino.nome;
  }
}

export function ItemTarefa({
  tarefa,
  onTap,
  onLongPress,
  disabled = false,
}: ItemTarefaProps) {
  const [pressed, setPressed] = useState(false);
  const labelDestino = useLabelDestino(tarefa);
  const IconeCategoria = CATEGORIA_ICON[tarefa.categoria];

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
            já alterna o estado (decisão M17). */}
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

        <View style={{ flex: 1, gap: spacing.xs }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <IconeCategoria
              size={CATEGORIA_ICON_SIZE}
              color={colors.mutedDecor}
              strokeWidth={2}
              accessibilityLabel={`categoria ${tarefa.categoria}`}
            />
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
          </View>
          {labelDestino ? (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.bgElev,
                borderRadius: radius.chip,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 10,
                  lineHeight: 14,
                }}
              >
                {`Para ${labelDestino}`}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={{
            color: colors.muted,
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
