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
// R-AUDIT-A11Y-MOVIMENTO (2026-07-13): fonte unica "posso animar?".
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

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
  // R-AUDIT-A11Y-MOVIMENTO: com reduce-motion (sistema OU toggle), o
  // Ken Burns vira estatico. Os hooks de Reanimated seguem declarados
  // (regra dos hooks) -- so o effect nao arma a animacao e o estilo
  // aplicado passa a ser o estatico (scale 1).
  const reduzir = useReduceMotion();

  useEffect(() => {
    // Reseta para 0 e anima ate 1 em `duracao` ms quando slideId muda
    // ou monta. Easing linear (constante) para o efeito ficar
    // imperceptivel/suave, sem aceleracao chamativa. Com reduce-motion
    // NAO arma: progress fica em 0 (e o estilo aplicado e' o estatico).
    progress.value = 0;
    if (!pausado && !reduzir) {
      progress.value = withTiming(1, {
        duration: duracao,
        easing: Easing.linear,
      });
    }
    return () => {
      cancelAnimation(progress);
    };
  }, [slideId, duracao, pausado, reduzir, progress]);

  // Quando pausado vira true, o cleanup cancela a animacao (para no
  // valor corrente). Quando volta a false, o effect re-roda e RESETA
  // progress a 0 antes de animar de novo — reinicio do ciclo, nao
  // continuacao. E' o comportamento correto: o timer de auto-advance
  // tambem rearma do zero, entao barra/zoom ficam sincronizados.

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
      // R-AUDIT-A11Y-MOVIMENTO: com reduce-motion aplica o estilo
      // estatico (scale 1) em vez do animado -- sem zoom/pan.
      style={[styles.container, reduzir ? styles.estatico : animatedStyle, style]}
      // R-AUDIT-A11Y-MOVIMENTO (achado 24): remove o jargao ingles
      // "ken burns container" que vazava no TalkBack. Este container so
      // envolve a tinta decorativa do slide (titulo/numero/frase sao
      // renderizados fora, no overlay), entao esconder seus descendentes
      // do leitor de tela nao esconde texto util. Mesmo par usado em
      // ItemTarefa.tsx e CheckboxTarefaInline.tsx.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
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
  // R-AUDIT-A11Y-MOVIMENTO: estilo estatico aplicado sob reduce-motion
  // (sem zoom nem pan -- foto de fundo em repouso).
  estatico: {
    transform: [{ scale: 1 }],
  },
});
