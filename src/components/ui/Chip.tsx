// Chip pill 20dp radius. Estados rest (borda muted-decor, fundo
// transparente, texto muted) e selected (fundo da cor de acento e
// texto bg). Spring subtle ao alternar selecao. ChipGroup orquestra
// single ou multi select.
import { ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

// 'ghost' = chip neutro/genérico (categoria "outro", filtros sem
// destaque). Selected vira fundo muted-decor com texto bg, em vez de
// hex saturado. Mantém affordance de seleção sem competir visualmente
// com chips de cor semantica. Convencao ADR-010 hierarquia por
// contraste.
export type ChipAccent =
  | 'purple'
  | 'pink'
  | 'cyan'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'ghost';

const ACCENT_HEX: Record<ChipAccent, string> = {
  purple: colors.purple,
  pink: colors.pink,
  cyan: colors.cyan,
  green: colors.green,
  yellow: colors.yellow,
  orange: colors.orange,
  red: colors.red,
  ghost: colors.mutedDecor,
};

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: ChipAccent;
  disabled?: boolean;
}

export function Chip({
  label,
  selected,
  onPress,
  accent = 'purple',
  disabled = false,
}: ChipProps) {
  const [pressed, setPressed] = useState(false);
  const accentHex = ACCENT_HEX[accent];

  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        setPressed(true);
      }}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (disabled) return;
        haptics.selection();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`chip ${label}`}
      accessibilityState={{ selected, disabled }}
    >
      <MotiView
        animate={{
          scale: pressed ? 0.97 : 1,
        }}
        transition={springs.subtle}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          paddingVertical: 8,
          paddingHorizontal: 14,
          opacity: disabled ? 0.4 : 1,
          // Background e borda como style direto (não via Moti animate
          // porque o RN tem bug com transitar 'transparent' -> hex
          // sem `from` correspondente, deixando o chip selecionado sem
          // fundo preenchido e o texto colors.bg invisivel).
          backgroundColor: selected ? accentHex : 'transparent',
          borderColor: selected ? accentHex : colors.mutedDecor,
        }}
      >
        <Text
          className="font-mono text-sm"
          style={{ color: selected ? colors.bg : colors.fg }}
        >
          {label}
        </Text>
      </MotiView>
    </Pressable>
  );
}

// ChipGroup: lista horizontal de chips com selecao gerenciada.
// Modo 'single' retorna string | null; modo 'multi' retorna string[].
// Para evitar uniao discriminada complexa no consumidor, expomos dois
// componentes nomeados: ChipGroupSingle e ChipGroupMulti via wrapper.

export interface ChipOption {
  value: string;
  label: string;
  accent?: ChipAccent;
}

interface ChipGroupBaseProps {
  options: ChipOption[];
  disabled?: boolean;
}

interface ChipGroupSingleProps extends ChipGroupBaseProps {
  mode: 'single';
  value: string | null;
  onChange: (next: string | null) => void;
}

interface ChipGroupMultiProps extends ChipGroupBaseProps {
  mode: 'multi';
  value: string[];
  onChange: (next: string[]) => void;
}

export type ChipGroupProps = ChipGroupSingleProps | ChipGroupMultiProps;

export function ChipGroup(props: ChipGroupProps): ReactNode {
  const { options, disabled = false } = props;

  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((opt) => {
        const isSelected =
          props.mode === 'single'
            ? props.value === opt.value
            : props.value.includes(opt.value);

        const handle = () => {
          if (props.mode === 'single') {
            props.onChange(isSelected ? null : opt.value);
          } else {
            const next = isSelected
              ? props.value.filter((v) => v !== opt.value)
              : [...props.value, opt.value];
            props.onChange(next);
          }
        };

        return (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={isSelected}
            onPress={handle}
            accent={opt.accent}
            disabled={disabled}
          />
        );
      })}
    </View>
  );
}
