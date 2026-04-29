// Slider numerico baseado em @react-native-community/slider. Track 4dp
// bg-elev com fill purple, thumb 24dp purple. Cada step dispara
// haptic selection. Valor numerico em cyan ao lado quando label
// presente. Faixa via min/max/step. Acessibilidade: role adjustable
// com value range.
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import RNSlider from '@react-native-community/slider';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  label?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  disabled = false,
  accessibilityLabel,
}: SliderProps) {
  const [lastTick, setLastTick] = useState<number>(value);

  const handleChange = useCallback(
    (next: number) => {
      const rounded = step > 0 ? Math.round(next / step) * step : next;
      if (rounded !== lastTick) {
        setLastTick(rounded);
        haptics.selection();
      }
      onChange(rounded);
    },
    [lastTick, onChange, step]
  );

  const display = step >= 1 ? Math.round(value).toString() : value.toFixed(2);
  const a11y =
    accessibilityLabel ?? (label ? `slider ${label}` : 'slider');

  return (
    <View
      style={{ width: '100%', gap: spacing.xs }}
      accessibilityRole="adjustable"
      accessibilityLabel={a11y}
      accessibilityValue={{ min, max, now: value }}
    >
      {(label || true) && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {label ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 12,
              }}
            >
              {label}
            </Text>
          ) : (
            <View />
          )}
          <Text
            style={{
              color: colors.cyan,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 14,
            }}
          >
            {display}
          </Text>
        </View>
      )}
      <RNSlider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        disabled={disabled}
        onValueChange={handleChange}
        minimumTrackTintColor={colors.purple}
        maximumTrackTintColor={colors.bgElev}
        thumbTintColor={colors.purple}
        style={{ width: '100%', height: 32, opacity: disabled ? 0.4 : 1 }}
      />
    </View>
  );
}
