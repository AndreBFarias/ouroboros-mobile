// Hook pra toast "Desfazer" padrao Material Design (R-HOME-3).
//
// API:
//   const { mostrarUndo, UndoOverlay } = useToastUndo();
//   mostrarUndo('Tarefa concluida', () => reverter(), 5000);
//   ...
//   <UndoOverlay />   // renderiza o overlay no fim da arvore.
//
// Comportamento:
//   - Mostra toast bottom 80dp com label + botao Desfazer.
//   - Timeout default 5000ms; ao expirar, oculta sem chamar onUndo.
//   - Tap em Desfazer: chama onUndo + oculta imediatamente.
//   - Spring de entrada (snappy), timing de saida 180ms (ADR-010).
//   - Chamadas consecutivas substituem o toast anterior (sem fila).
//
// Decisao de design: o hook retorna o JSX (UndoOverlay) em vez de
// usar React Context global, pra evitar tocar Toast.tsx existente e
// manter escopo cirurgico. Cada caller pode ter um overlay proprio
// onde fizer sentido (ex: Tela Hoje monta seu UndoOverlay no fim da
// arvore da tela).
//
// Comentarios sem acento (convencao shell/CI).
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';

const DEFAULT_TIMEOUT_MS = 5000;
const TOAST_BOTTOM_OFFSET = 80;

interface UndoState {
  id: number;
  mensagem: string;
  onUndo: () => void;
}

export interface UseToastUndoApi {
  // Mostra o toast de undo. Substitui qualquer toast anterior.
  mostrarUndo: (
    mensagem: string,
    onUndo: () => void,
    timeoutMs?: number
  ) => void;
  // Forca dismiss imediato (ex: ao desmontar tela).
  dismiss: () => void;
  // JSX do overlay. Renderizar no fim da arvore.
  UndoOverlay: () => ReactElement | null;
}

export function useToastUndo(): UseToastUndoApi {
  const [state, setState] = useState<UndoState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setState(null);
  }, [clearTimer]);

  const mostrarUndo = useCallback<UseToastUndoApi['mostrarUndo']>(
    (mensagem, onUndo, timeoutMs = DEFAULT_TIMEOUT_MS) => {
      clearTimer();
      const id = Date.now() + Math.random();
      setState({ id, mensagem, onUndo });
      timerRef.current = setTimeout(() => {
        setState((cur) => (cur && cur.id === id ? null : cur));
        timerRef.current = null;
      }, timeoutMs);
    },
    [clearTimer]
  );

  // Cleanup ao desmontar pra evitar leak de setTimeout em testes.
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const UndoOverlay = useCallback((): ReactElement | null => {
    if (!state) return null;
    const handleUndo = () => {
      haptics.light();
      state.onUndo();
      dismiss();
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
        <Animated.View
          key={state.id}
          entering={SlideInDown.springify().damping(20).stiffness(250)}
          exiting={SlideOutDown.duration(180)}
          accessibilityRole="alert"
          accessibilityLabel={`toast undo ${state.mensagem}`}
          style={{
            position: 'absolute',
            bottom: TOAST_BOTTOM_OFFSET,
            left: spacing.lg,
            right: spacing.lg,
            backgroundColor: colors.bgElev,
            borderLeftWidth: 3,
            borderLeftColor: colors.cyan,
            borderRadius: radius.toast,
            paddingVertical: spacing.base,
            paddingHorizontal: spacing.base,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: colors.fg,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
            }}
            numberOfLines={2}
          >
            {state.mensagem}
          </Text>
          <Pressable
            onPress={handleUndo}
            accessibilityRole="button"
            accessibilityLabel="desfazer"
            hitSlop={12}
            style={({ pressed }) => ({
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radius.chip,
              backgroundColor: pressed
                ? 'rgba(139,233,253,0.22)'
                : 'rgba(139,233,253,0.12)',
            })}
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              Desfazer
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }, [state, dismiss]);

  return { mostrarUndo, dismiss, UndoOverlay };
}
