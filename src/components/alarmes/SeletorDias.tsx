// Seletor multi de dias da semana (M16). 7 chips redondos 36dp na
// linha, label de 1 char ('D','S','T','Q','Q','S','S'). Estado
// selecionado: fundo purple, texto bg. Estado rest: fundo
// transparente, borda muted-decor, texto fg.
//
// Difere do ChipGroup base porque queremos:
//   - Forma circular (radius = metade do tamanho).
//   - Tamanho compacto (36dp) para caber 7 chips em 1 linha em telas
//     comuns sem wrap.
//   - Acessibilidade que comunica o nome longo do dia ('segunda',
//     'terca', ...).
//
// Comentarios sem acento (convencao shell/CI).
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import {
  DIAS_SEMANA_LABELS,
  DIAS_SEMANA_NOMES,
} from '@/lib/schemas/alarme';

interface SeletorDiasProps {
  // Array de dias selecionados (0-6, 0=domingo).
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}

const SIZE = 36;

interface ChipDiaProps {
  dia: number;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

function ChipDia({ dia, selected, onPress, disabled = false }: ChipDiaProps) {
  const [pressed, setPressed] = useState(false);
  const label = DIAS_SEMANA_LABELS[dia];
  const nome = DIAS_SEMANA_NOMES[dia];

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
      accessibilityRole="checkbox"
      accessibilityLabel={`dia ${nome}`}
      accessibilityState={{ checked: selected, disabled }}
      hitSlop={6}
    >
      <MotiView
        animate={{ scale: pressed ? 0.92 : 1 }}
        transition={springs.subtle}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          backgroundColor: selected ? colors.purple : 'transparent',
          borderColor: selected ? colors.purple : colors.mutedDecor,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Text
          style={{
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 13,
            color: selected ? colors.bg : colors.fg,
          }}
        >
          {label}
        </Text>
      </MotiView>
    </Pressable>
  );
}

export function SeletorDias({
  value,
  onChange,
  disabled = false,
}: SeletorDiasProps) {
  const toggle = (dia: number) => {
    const isSelected = value.includes(dia);
    if (isSelected) {
      onChange(value.filter((d) => d !== dia));
    } else {
      onChange([...value, dia].sort((a, b) => a - b));
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
      }}
      accessibilityLabel="dias da semana"
    >
      {[0, 1, 2, 3, 4, 5, 6].map((dia) => (
        <ChipDia
          key={dia}
          dia={dia}
          selected={value.includes(dia)}
          onPress={() => toggle(dia)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}
