// Switch material-like. Track bg-elev rest e purple ativo, thumb muted
// rest e fg ativo. Tap alterna estado; gesture de arrasto e tratado de
// forma simples via PanResponder leve para honrar requisito do spec
// sem pesar runtime. Spring default no movimento do thumb.
import { useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  View,
  PanResponder,
} from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

export interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const TRACK_W = 48;
const TRACK_H = 28;
const THUMB = 22;
const TRAVEL = TRACK_W - THUMB - 4;

export function Toggle({
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: ToggleProps) {
  const [dragging, setDragging] = useState(false);
  const startValue = useRef(value);

  const set = (next: boolean) => {
    if (disabled) return;
    if (next !== value) {
      haptics.light();
      onChange(next);
    }
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_e, g) => !disabled && Math.abs(g.dx) > 4,
      onPanResponderGrant: () => {
        startValue.current = value;
        setDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        const next = startValue.current
          ? g.dx > -TRAVEL / 2
          : g.dx > TRAVEL / 2;
        if (next !== value) set(next);
      },
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    })
  ).current;

  const handleTap = (_e: GestureResponderEvent) => {
    if (dragging) return;
    set(!value);
  };

  return (
    <Pressable
      onPress={handleTap}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? 'alternar'}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={10}
    >
      <View
        {...responder.panHandlers}
        style={{
          width: TRACK_W,
          height: TRACK_H,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <MotiView
          animate={{ backgroundColor: value ? colors.purple : colors.bgElev }}
          transition={springs.subtle}
          style={{
            width: TRACK_W,
            height: TRACK_H,
            borderRadius: TRACK_H / 2,
            justifyContent: 'center',
          }}
        >
          <MotiView
            animate={{
              translateX: value ? TRAVEL : 0,
              backgroundColor: value ? colors.fg : colors.muted,
            }}
            transition={springs.default}
            style={{
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              marginLeft: 3,
            }}
          />
        </MotiView>
      </View>
    </Pressable>
  );
}
