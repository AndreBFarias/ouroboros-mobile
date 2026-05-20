// Toast premium global. Sobe a 80dp do bottom em spring, fica 2,5s e
// some via fade timing 180ms. Border-left 3px na cor semantica do tipo
// (success/error/info/warn). Acessivel via hook `useToast()` em qualquer
// arvore filha de `<ToastProvider>`. Provider deve ficar no `_layout`.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Text, View } from 'react-native';
// N2 (M-MOTI-FIX-CRITICOS): Toast e overlay global montado em
// ToastProvider raiz. Substitui MotiView+AnimatePresence por
// Animated.View com entering/exiting da Reanimated 4. Spring canonico
// no entering (damping 20, stiffness 250 = timings.toastIn). Exit com
// fadeOut + slide de 20dp.
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { springs } from '@/lib/motion';
import { colors, radius, spacing } from '@/theme/tokens';

export type ToastType = 'success' | 'error' | 'info' | 'warn';

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

export interface ToastApi {
  show: (message: string, type?: ToastType) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_DURATION_MS = 2500;

function borderColorFor(type: ToastType): string {
  switch (type) {
    case 'success':
      return colors.green;
    case 'error':
      return colors.red;
    case 'warn':
      return colors.yellow;
    case 'info':
    default:
      return colors.cyan;
  }
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const show = useCallback<ToastApi['show']>(
    (message, type = 'info') => {
      clearTimer();
      const id = Date.now() + Math.random();
      setToast({ message, type, id });
      timer.current = setTimeout(() => {
        setToast((cur) => (cur && cur.id === id ? null : cur));
        timer.current = null;
      }, TOAST_DURATION_MS);
    },
    [clearTimer]
  );

  // Cleanup obrigatorio: cancela timer pendente quando o Provider
  // desmontar. Sem isso, o setTimeout de auto-dismiss fica orfao no
  // event loop apos a arvore React ser destruida (acontece entre
  // testes Jest com fakeTimers reais), causando "Cannot log after
  // tests are done" e leak de handle no worker pool. Fix de
  // R-INFRA-JEST-LEAK-HUNT (handle leak em paralelo).
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
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
        {toast && (
          <Animated.View
            key={toast.id}
            entering={SlideInDown.springify().damping(20).stiffness(250)}
            exiting={SlideOutDown.duration(180)}
            accessibilityRole="alert"
            accessibilityLabel={`toast ${toast.type}`}
            style={{
              position: 'absolute',
              bottom: 80,
              left: spacing.lg,
              right: spacing.lg,
              backgroundColor: colors.bgElev,
              borderLeftWidth: 3,
              borderLeftColor: borderColorFor(toast.type),
              borderRadius: radius.toast,
              paddingVertical: spacing.base,
              paddingHorizontal: spacing.base,
            }}
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {toast.message}
            </Text>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast precisa de ToastProvider acima na arvore');
  }
  return ctx;
}

// Hook seguro para casos onde o Provider pode estar ausente (storybook
// isolado). Retorna no-op em vez de lancar.
export function useOptionalToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      show: () => undefined,
      dismiss: () => undefined,
    }
  );
}

// Spring usado no movimento de entrada (referência para testes que
// queiram inspecionar a animacao). Mantido aqui para evitar import
// circular do Toast pelos testes.
export const TOAST_SPRING = springs.default;

// Re-export interno para componentes que queiram um Toast standalone
// sem provider. Útil em fixtures de teste.
export const __TOAST_INTERNALS__ = {
  borderColorFor,
  TOAST_DURATION_MS,
};
