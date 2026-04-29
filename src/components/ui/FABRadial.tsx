// FAB Radial: 6 acoes em arco semicircular subindo do FAB principal.
// Overlay escuro 50% sobre tela atual. FAB rotaciona 45deg (vira X) ao
// abrir. Cada botao surge em sequencia com 60ms delay (springs.bouncy).
// Tap fora fecha. Acoes: humor, voz, camera, exercicio, vitoria, trigger.
// onSelect recebe a key escolhida e o componente fecha automaticamente.
import { useState, type ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import {
  Camera,
  Dumbbell,
  Heart,
  Mic,
  Plus,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';

export type FABRadialKey =
  | 'humor'
  | 'voz'
  | 'camera'
  | 'exercicio'
  | 'vitoria'
  | 'trigger';

export interface FABRadialProps {
  onSelect: (key: FABRadialKey) => void;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
}

interface ActionDescriptor {
  key: FABRadialKey;
  label: string;
  acentLabel: string;
  color: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  // angulo em graus medido a partir do eixo horizontal (esquerda),
  // distribuido em arco de 180 graus (de 180 a 360).
  angleDeg: number;
}

const ARC_RADIUS = 110;
const FAB_SIZE = 56;
const ACTION_SIZE = 48;

// Ordem visual: humor mais a esquerda, trigger mais perto do FAB.
// Strings em PT-BR com acento; labels de a11y sem acento.
const ACTIONS: readonly ActionDescriptor[] = [
  {
    key: 'humor',
    label: 'humor',
    acentLabel: 'botao humor',
    color: colors.pink,
    Icon: Heart,
    angleDeg: 180,
  },
  {
    key: 'voz',
    label: 'voz',
    acentLabel: 'botao voz',
    color: colors.cyan,
    Icon: Mic,
    angleDeg: 198,
  },
  {
    key: 'camera',
    label: 'câmera',
    acentLabel: 'botao camera',
    color: colors.orange,
    Icon: Camera,
    angleDeg: 216,
  },
  {
    key: 'exercicio',
    label: 'exercício',
    acentLabel: 'botao exercicio',
    color: colors.green,
    Icon: Dumbbell,
    angleDeg: 234,
  },
  {
    key: 'vitoria',
    label: 'vitória',
    acentLabel: 'botao vitoria',
    color: colors.yellow,
    Icon: Trophy,
    angleDeg: 252,
  },
  {
    key: 'trigger',
    label: 'trigger',
    acentLabel: 'botao trigger',
    color: colors.red,
    Icon: Zap,
    angleDeg: 270,
  },
] as const;

function offsetFor(angleDeg: number): { dx: number; dy: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    dx: Math.cos(rad) * ARC_RADIUS,
    dy: Math.sin(rad) * ARC_RADIUS,
  };
}

export function FABRadial({
  onSelect,
  open: openProp,
  onOpenChange,
}: FABRadialProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;

  const setOpen = (next: boolean) => {
    if (openProp === undefined) {
      setOpenInternal(next);
    }
    onOpenChange?.(next);
  };

  const toggle = () => {
    haptics.medium();
    setOpen(!open);
  };

  const handleSelect = (key: FABRadialKey) => {
    haptics.light();
    onSelect(key);
    setOpen(false);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      }}
    >
      {/* overlay escuro tap-to-close */}
      <MotiView
        animate={{ opacity: open ? 0.5 : 0 }}
        transition={springs.default}
        pointerEvents={open ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: '#000',
        }}
      >
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="fechar menu radial"
          style={{ flex: 1 }}
        />
      </MotiView>

      {/* acoes em arco */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: spacing.lg + (FAB_SIZE - ACTION_SIZE) / 2,
          bottom: spacing.xl + (FAB_SIZE - ACTION_SIZE) / 2,
          width: ACTION_SIZE,
          height: ACTION_SIZE,
        }}
      >
        {ACTIONS.map((action, idx) => {
          const { dx, dy } = offsetFor(action.angleDeg);
          return (
            <MotiView
              key={action.key}
              animate={{
                opacity: open ? 1 : 0,
                translateX: open ? dx : 0,
                translateY: open ? dy : 0,
                scale: open ? 1 : 0.4,
              }}
              transition={{ ...springs.bouncy, delay: open ? idx * 60 : 0 }}
              pointerEvents={open ? 'auto' : 'none'}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: ACTION_SIZE,
                height: ACTION_SIZE,
              }}
            >
              <Pressable
                onPress={() => handleSelect(action.key)}
                accessibilityRole="button"
                accessibilityLabel={action.acentLabel}
                style={{
                  width: ACTION_SIZE,
                  height: ACTION_SIZE,
                  borderRadius: ACTION_SIZE / 2,
                  backgroundColor: action.color,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <action.Icon size={20} color={colors.bg} strokeWidth={2} />
              </Pressable>
              <Text
                style={{
                  position: 'absolute',
                  top: ACTION_SIZE + 2,
                  left: -8,
                  width: ACTION_SIZE + 16,
                  textAlign: 'center',
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 10,
                  opacity: open ? 1 : 0,
                }}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </MotiView>
          );
        })}
      </View>

      {/* FAB principal: rotaciona 45deg quando aberto (vira X) */}
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={open ? 'fechar acoes' : 'abrir acoes'}
        style={{
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.xl,
        }}
      >
        <MotiView
          animate={{ rotate: open ? '45deg' : '0deg' }}
          transition={springs.default}
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: radius.fab,
            backgroundColor: colors.purple,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Plus size={24} color={colors.bg} strokeWidth={2} />
        </MotiView>
      </Pressable>
    </View>
  );
}
