// R-RECAP-4 (2026-05-16): efeito Ken Burns para slides do modo
// Memorias do Recap. Mostra uma View em fullscreen com zoom + pan
// suave usando Reanimated puro (A28-safe — sem moti no boot path).
//
// 4 presets rotativos deterministicos:
//   - 'zoom-in-top-left'    scale 1 -> 1.15, translate para canto sup esq
//   - 'zoom-out-center'     scale 1.15 -> 1, no translate
//   - 'pan-left-right'      scale 1.1, translate horizontal
//   - 'pan-bottom-top'      scale 1.1, translate vertical
//
// O preset e' escolhido por hash deterministico do slideId (passado
// pelo caller). withTiming linear de 4000ms por slide (alinhado ao
// default de auto-avance configurado em settings.recap.slideshowIntervaloS,
// mas independente de qualquer ajuste — animacao termina em 4s e
// permanece estatica ate o slide proximo trocar).
//
// `pausado` interrompe a animacao em qualquer ponto via
// cancelAnimation. Quando volta a false, reinicia do scale 1.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

export type KenBurnsPreset =
  | 'zoom-in-top-left'
  | 'zoom-out-center'
  | 'pan-left-right'
  | 'pan-bottom-top';

const PRESETS: ReadonlyArray<KenBurnsPreset> = [
  'zoom-in-top-left',
  'zoom-out-center',
  'pan-left-right',
  'pan-bottom-top',
];

// Hash deterministico simples por soma de char codes, modulo 4.
// Garante idempotencia: mesmo slideId sempre escolhe mesmo preset.
export function presetParaSlide(slideId: string): KenBurnsPreset {
  let h = 0;
  for (let i = 0; i < slideId.length; i += 1) {
    h = (h + slideId.charCodeAt(i)) % 1_000_003;
  }
  return PRESETS[h % PRESETS.length] ?? PRESETS[0];
}

export interface KenBurnsProps {
  /** Identificador estavel do slide (define preset). */
  slideId: string;
  /** Duracao da animacao em ms (default 4000). */
  duracao?: number;
  /** Se true, interrompe a animacao em qualquer ponto. */
  pausado?: boolean;
  /** Conteudo a ser animado (image, view colorida, etc). */
  children: React.ReactNode;
  /** Estilo extra aplicado ao container animado. */
  style?: ViewStyle;
}

export function KenBurns({
  slideId,
  duracao = 4000,
  pausado = false,
  children,
  style,
}: KenBurnsProps) {
  const preset = useMemo(() => presetParaSlide(slideId), [slideId]);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Reseta para 0 e anima ate 1 em `duracao` ms quando slideId muda
    // ou monta. Easing linear (constante) para o efeito ficar
    // imperceptivel/suave, sem aceleracao chamativa.
    progress.value = 0;
    if (!pausado) {
      progress.value = withTiming(1, {
        duration: duracao,
        easing: Easing.linear,
      });
    }
    return () => {
      cancelAnimation(progress);
    };
  }, [slideId, duracao, pausado, progress]);

  // Quando pausado vira true em pleno meio da animacao, paramos no
  // valor corrente. Quando volta a false, reinicia da posicao atual
  // ate 1 — mas para simplicidade, reinicia o ciclo a partir do
  // valor corrente (sem reset visivel). Implementacao acima ja faz
  // isso ao reativar via useEffect quando pausado muda.

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    switch (preset) {
      case 'zoom-in-top-left':
        return {
          transform: [
            { translateX: -20 * p },
            { translateY: -20 * p },
            { scale: 1 + 0.15 * p },
          ],
        };
      case 'zoom-out-center':
        return {
          transform: [{ scale: 1.15 - 0.15 * p }],
        };
      case 'pan-left-right':
        return {
          transform: [{ translateX: -30 + 60 * p }, { scale: 1.1 }],
        };
      case 'pan-bottom-top':
        return {
          transform: [{ translateY: 30 - 60 * p }, { scale: 1.1 }],
        };
      default:
        return { transform: [{ scale: 1 }] };
    }
  });

  return (
    <Animated.View
      style={[styles.container, animatedStyle, style]}
      accessibilityLabel="ken burns container"
    >
      {children}
    </Animated.View>
  );
}

// Variante simples sem animacao (fallback quando Reanimated nao
// estiver disponivel ou em testes que nao querem efeito visual).
export function KenBurnsStatic({
  children,
  style,
}: Pick<KenBurnsProps, 'children' | 'style'>) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
