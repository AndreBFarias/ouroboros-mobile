// FAB Radial: 6 ações em arco semicircular subindo do FAB principal.
// Overlay escuro 50% sobre tela atual. FAB rotaciona 45deg (vira X) ao
// abrir. Cada botao surge em sequência com 60ms delay (springs.bouncy).
// Tap fora fecha. Ações: humor, voz, camera, exercício, vitoria, trigger.
// onSelect recebe a key escolhida e o componente fecha automaticamente.
import { useEffect, useState, type ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
// N2 (M-MOTI-FIX-CRITICOS): linhas 192 (acoes em arco com transform
// + scale + stagger) e 296 (FAB principal rotate) migradas para
// Animated.View. Linha 157 (opacity-only do overlay tap-to-close) e
// risco BAIXO, mantida em moti. Springs canonicos:
//   - bouncy: damping 12, stiffness 180 (acoes em arco com delay)
//   - default: damping 18, stiffness 200 (rotate do FAB principal)
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Camera, Dumbbell, Heart, Mic, Plus, Trophy, Zap } from '@/lib/icons';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';

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

const ARC_RADIUS = 210;
const FAB_SIZE = 72;
const ACTION_SIZE = 64;
const LABEL_GAP = 12;
// Angulos no range matematico 180-270deg (esquerda até cima do FAB).
// Fora desse range os botoes sairiam pela direita da tela ou ficariam
// abaixo do FAB. Aumentamos ARC_RADIUS para 210 para dar mais
// espacamento vertical entre labels (eliminando a sobreposicao
// do checkpoint M01.6.2).

// Ordem visual: humor mais a esquerda, trigger mais perto do FAB.
// Strings visiveis em sentence case + acentuacao PT-BR; labels de a11y
// sem acento (convencao de screen reader).
const ACTIONS: readonly ActionDescriptor[] = [
  {
    key: 'humor',
    label: 'Humor',
    acentLabel: 'botao humor',
    color: colors.pink,
    Icon: Heart,
    angleDeg: 180,
  },
  {
    key: 'voz',
    label: 'Voz',
    acentLabel: 'botao voz',
    color: colors.cyan,
    Icon: Mic,
    angleDeg: 198,
  },
  {
    key: 'camera',
    label: 'Câmera',
    acentLabel: 'botao camera',
    color: colors.orange,
    Icon: Camera,
    angleDeg: 216,
  },
  {
    key: 'exercicio',
    label: 'Exercícios',
    acentLabel: 'botao exercicios',
    color: colors.green,
    Icon: Dumbbell,
    angleDeg: 234,
  },
  {
    key: 'vitoria',
    label: 'Conquista', // anonimato-allow: substantivo (vide ressalva acentuacao)
    acentLabel: 'botao conquista',
    color: colors.yellow,
    Icon: Trophy,
    angleDeg: 252,
  },
  {
    key: 'trigger',
    label: 'Crise',
    acentLabel: 'botao crise',
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

      {/* ações em arco */}
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
        {ACTIONS.map((action, idx) => (
          <ActionRadial
            key={action.key}
            action={action}
            idx={idx}
            open={open}
            onSelect={handleSelect}
          />
        ))}
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
        <FabPrincipalRotate open={open} />
      </Pressable>
    </View>
  );
}

// N2 (M-MOTI-FIX-CRITICOS): cada acao do arco vira sub-componente
// Reanimated puro. Reage a `open` via useEffect: ao abrir, dispara
// withDelay(idx * 60, withSpring(...)) replicando o stagger do moti.
// Ao fechar, withSpring sem delay para colapsar imediatamente. Spring
// canonico bouncy: damping 12, stiffness 180.
interface ActionRadialProps {
  action: ActionDescriptor;
  idx: number;
  open: boolean;
  onSelect: (key: FABRadialKey) => void;
}

function ActionRadial({ action, idx, open, onSelect }: ActionRadialProps) {
  const { dx, dy } = offsetFor(action.angleDeg);

  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    const cfg = { damping: 12, stiffness: 180 };
    if (open) {
      const d = idx * 60;
      opacity.value = withDelay(d, withSpring(1, cfg));
      translateX.value = withDelay(d, withSpring(dx, cfg));
      translateY.value = withDelay(d, withSpring(dy, cfg));
      scale.value = withDelay(d, withSpring(1, cfg));
    } else {
      opacity.value = withSpring(0, cfg);
      translateX.value = withSpring(0, cfg);
      translateY.value = withSpring(0, cfg);
      scale.value = withSpring(0.4, cfg);
    }
  }, [open, idx, dx, dy, opacity, translateX, translateY, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const labelAcima = action.angleDeg >= 240;
  const containerStyle = labelAcima
    ? {
        position: 'absolute' as const,
        bottom: ACTION_SIZE + 6,
        left: (ACTION_SIZE - 160) / 2,
        width: 160,
        height: 28,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        opacity: open ? 1 : 0,
      }
    : {
        position: 'absolute' as const,
        right: ACTION_SIZE + LABEL_GAP,
        top: (ACTION_SIZE - 28) / 2,
        width: 160,
        height: 28,
        alignItems: 'flex-end' as const,
        justifyContent: 'center' as const,
        opacity: open ? 1 : 0,
      };

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: ACTION_SIZE,
          height: ACTION_SIZE,
        },
        animStyle,
      ]}
    >
      <View pointerEvents="none" style={containerStyle}>
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 14,
            lineHeight: 20,
            backgroundColor: colors.bgElev,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {action.label}
        </Text>
      </View>
      <Pressable
        onPress={() => onSelect(action.key)}
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
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <action.Icon size={28} color={colors.bg} strokeWidth={2.2} />
      </Pressable>
    </Animated.View>
  );
}

// N2 (M-MOTI-FIX-CRITICOS): FAB principal rotaciona 45deg quando
// aberto (vira X). Spring canonico default: damping 18, stiffness 200.
// Rotate como string e' o caso classico A28 que crashava no New Arch
// com moti+Reanimated 4. Reanimated puro evita ao gerar string apenas
// no useAnimatedStyle (worklet, pre-formado pelo runtime).
function FabPrincipalRotate({ open }: { open: boolean }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(open ? 45 : 0, {
      damping: 18,
      stiffness: 200,
    });
  }, [open, rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: colors.purple,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        },
        animStyle,
      ]}
    >
      <Plus size={32} color={colors.bg} strokeWidth={2.4} />
    </Animated.View>
  );
}
