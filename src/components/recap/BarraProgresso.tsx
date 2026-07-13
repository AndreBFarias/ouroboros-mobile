// R-RECAP-9c (2026-07-13): barra de progresso do slideshow Memorias do
// Recap. Antes a largura da barra ATIVA era o literal estatico '50%'
// (placeholder que nunca animava -- bug B2). Agora a barra ativa e'
// preenchida por um shared value (0 -> 1) controlado pela tela pai,
// sincronizado com o auto-advance e o Ken Burns.
//
// Preenchimento via scaleX (ancorado a esquerda) em vez de largura
// percentual: roda na UI thread (Reanimated puro, A28-safe), fica liso
// no Fabric/New Arch e evita relayout por frame. Easing.linear e' quem
// decide a suavidade no lado da tela pai; aqui so' mapeamos progresso
// -> escala. Movimento previsivel, sem estroboscopico (ADR-010, ethos
// §2 -- publico autista/TDAH).
//
// Comentarios sem acento (convencao shell/CI).
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { colorsMemorias } from '@/theme/tokens';

export type EstadoBarra = 'preenchido' | 'ativo' | 'vazio';

// Mapeia (estado, progresso 0..1) para a escala horizontal 0..1.
//   - 'preenchido' (slide ja passado): 1 (cheia), progresso ignorado.
//   - 'vazio' (slide futuro): 0.
//   - 'ativo' (slide corrente): progresso clampado a [0, 1].
// Funcao pura + worklet: usada tanto no UI thread (dentro do
// useAnimatedStyle) quanto em teste unit deterministico (Reanimated e'
// mockado no Jest, entao roda como funcao comum).
export function escalaDe(estado: EstadoBarra, progresso: number): number {
  'worklet';
  if (estado === 'preenchido') return 1;
  if (estado === 'vazio') return 0;
  return Math.max(0, Math.min(1, progresso));
}

export interface BarraProgressoProps {
  /** Posicao da barra no slideshow (0-based). */
  indice: number;
  /** Estado da barra relativo ao slide corrente. */
  estado: EstadoBarra;
  /** Progresso (0 -> 1) do slide ativo. So' e' lido quando estado='ativo'. */
  progresso: SharedValue<number>;
}

export function BarraProgresso({
  indice,
  estado,
  progresso,
}: BarraProgressoProps) {
  const animado = useAnimatedStyle(() => {
    // Le o shared value SO' na barra ativa: barras preenchidas/vazias
    // nao assinam o progresso e ficam estaticas (sem re-run por frame).
    const bruto = estado === 'ativo' ? progresso.value : 0;
    return { transform: [{ scaleX: escalaDe(estado, bruto) }] };
  });

  return (
    <View
      style={styles.slot}
      accessibilityRole="progressbar"
      accessibilityLabel={`progresso slide ${indice + 1}`}
      testID={`barra-progresso-${indice}`}
    >
      <Animated.View
        style={[styles.inner, animado]}
        testID={`barra-inner-${indice}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(253,246,227,0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  inner: {
    width: '100%',
    height: 2,
    backgroundColor: colorsMemorias.fg,
    // Ancora a escala a esquerda: a barra cresce da esquerda para a
    // direita, como um relogio de progresso.
    transformOrigin: 'left',
  },
});
