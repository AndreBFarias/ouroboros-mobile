// R-BRAND-2-ANIMACOES (2026-07-13) — C1 "Fechamento do ciclo". Micro-
// overlay de ~350ms exibido no save de humor/diario ANTES do
// router.back(): a boca da cobra fecha na cauda (arco completa), um
// leve scale + fade faz o wordmark surgir, e ao fim o `onConcluir`
// dispara a navegacao. E' o "momento de marca" de conclusao calma —
// NAO gamificacao: zero confete, zero streak, zero exclamacao (Regra
// de Tom). O haptic ja e' disparado pelo caller (haptics.humor()/
// .vitoria()); aqui e' SO' o visual.
//
// Por que o caller controla a montagem (e nao um Toast global): mexer
// no Toast afetaria todos os toasts do app. Este overlay so' vive nos
// 2 saves, montado por estado local da tela.
//
// Reduce-motion (obrigatorio, consome useReduceMotion): sem cascata/
// flash — `onConcluir` dispara IMEDIATO no mount (sem atrasar o
// dismiss) e o glifo renderiza em estado final estatico (corte). O
// hook e' chamado no topo INCONDICIONAL; so o corpo do effect ramifica
// (regra dos hooks), igual ao padrao KenBurns/OuroborosLoader.
//
// Stack JS pura (Reanimated 4), zero dep nativa nova. A animacao e'
// one-shot (withTiming, sem loop). O checkpoint de C1 e' Nivel C no
// device (haptic nativo no save); em web/Gauntlet o timing de 350ms
// vale mesmo que o rn-svg-web nao propague cada frame do arco.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useRef } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '@/theme/tokens';
// R-AUDIT-A11Y-MOVIMENTO: fonte unica "posso animar?".
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Duracao do fechamento. 350ms nao e' friccao para o publico ansioso —
// e' feedback de conclusao (decisao travada do dono, spec §3.6 item 2).
const DURACAO_PADRAO_MS = 350;

const PIVOT = 50;
const RAIO = 40;
// Perimetro do anel: base do strokeDasharray/offset que "fecha" o arco.
const PERIMETRO = 2 * Math.PI * RAIO;
// Abertura inicial do arco (a boca antes de morder a cauda): ~28% do
// anel. progresso 0 -> 1 leva o offset a 0 (circulo completo).
const ABERTURA = PERIMETRO * 0.28;

export interface OuroborosFechamentoProps {
  // Disparado ao fim da cascata (~duracaoMs) ou IMEDIATO com reduce-
  // motion. E' quem chama o router.back()/goBackOnce() do caller.
  onConcluir: () => void;
  // Duracao do fechamento em ms (default 350).
  duracaoMs?: number;
  // Tamanho do glifo em pixels.
  tamanho?: number;
  // Rotulo de leitor de tela (sem acento — convencao screen reader).
  accessibilityLabel?: string;
}

export function OuroborosFechamento({
  onConcluir,
  duracaoMs = DURACAO_PADRAO_MS,
  tamanho = 132,
  accessibilityLabel = 'concluindo',
}: OuroborosFechamentoProps) {
  const reduzir = useReduceMotion();
  const progresso = useSharedValue(0);

  // Ref do callback para nao re-armar o effect a cada render do caller
  // (o caller re-renderiza ao setar o estado que monta este overlay).
  const onConcluirRef = useRef(onConcluir);
  onConcluirRef.current = onConcluir;

  useEffect(() => {
    // Reduce-motion: sem cascata. Navega imediato, sem atrasar o
    // dismiss (spec §6). O glifo abaixo ja renderiza em estado final.
    if (reduzir) {
      onConcluirRef.current();
      return;
    }
    // Fechamento one-shot: arco completa em duracaoMs; ao fim, navega.
    progresso.value = withTiming(1, {
      duration: duracaoMs,
      easing: Easing.out(Easing.cubic),
    });
    const timer = setTimeout(() => onConcluirRef.current(), duracaoMs);
    return () => {
      clearTimeout(timer);
      cancelAnimation(progresso);
    };
  }, [reduzir, duracaoMs, progresso]);

  // Container: leve scale + fade — o wordmark "surge". Com reduce-motion
  // aplica o estado final estatico (sem transicao).
  const estiloContainer = useAnimatedStyle(() => ({
    opacity: reduzir ? 1 : 0.82 + 0.18 * progresso.value,
    transform: [{ scale: reduzir ? 1 : 0.94 + 0.06 * progresso.value }],
  }));

  // Arco fecha: offset ABERTURA -> 0 (mordida alcancando a cauda). Com
  // reduce-motion, offset 0 direto (circulo fechado, estado final).
  const propsArco = useAnimatedProps(() => ({
    strokeDashoffset: reduzir ? 0 : ABERTURA * (1 - progresso.value),
  }));

  return (
    <Animated.View
      style={[{ width: tamanho, height: tamanho }, estiloContainer]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="fechamento-grad" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0%" stopColor={colors.purple} />
            <Stop offset="100%" stopColor={colors.pink} />
          </LinearGradient>
        </Defs>
        {/* anel que fecha (a cobra mordendo a cauda) */}
        <AnimatedCircle
          cx={PIVOT}
          cy={PIVOT}
          r={RAIO}
          fill="none"
          stroke="url(#fechamento-grad)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={PERIMETRO}
          animatedProps={propsArco}
        />
        {/* wordmark central que surge com o container */}
        <SvgText
          x={PIVOT}
          y={53}
          textAnchor="middle"
          fontFamily="monospace"
          fontSize={9}
          fontWeight="500"
          letterSpacing={2}
          fill={colors.purple}
        >
          OUROBOROS
        </SvgText>
      </Svg>
    </Animated.View>
  );
}
