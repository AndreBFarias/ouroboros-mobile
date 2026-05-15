// Q24.b (2026-05-13) -- Modo Memorias do Recap (Wrapped). Slideshow
// full-screen com 4-5 slides candidatos, auto-advance 5s, tap-right
// avanca, tap-left volta, tap-hold pausa, swipe-down (back) fecha.
// Paleta exclusiva `colorsMemorias` (gradient roxo->magenta->cyan +
// dourado palido) -- quebra visual intencional vs cotidiano sobrio.
//
// ADR-0005: frases sobrias, sem exclamacao, sem comparativo, sem
// emoji. Tom de testemunha calma.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { X } from '@/lib/icons';
import { useRecap, type PeriodoRange } from '@/lib/hooks/useRecap';
import { useRecapMemorias, type Slide } from '@/lib/hooks/useRecapMemorias';
import { OuroborosLoader } from '@/components/brand';
import { colorsMemorias } from '@/theme/tokens';

const AUTO_ADVANCE_MS = 5000;

function parseDate(raw: string | string[] | undefined, fallback: Date): Date {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string' || v.length === 0) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default function RecapMemoriasTela() {
  const router = useRouter();
  const params = useLocalSearchParams<{ de?: string; ate?: string }>();

  const hoje = new Date();
  const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  const range: PeriodoRange = {
    de: parseDate(params.de, seteDiasAtras),
    ate: parseDate(params.ate, hoje),
  };
  const { data, loading } = useRecap(range);
  const slides = useRecapMemorias({ data });

  const [index, setIndex] = useState(0);
  const [pausado, setPausado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance.
  useEffect(() => {
    if (loading || pausado) return;
    if (index >= slides.length - 1) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, slides.length - 1));
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, pausado, loading, slides.length]);

  const proximo = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else router.back();
  };
  const anterior = () => {
    if (index > 0) setIndex(index - 1);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#1a0d2e' }]}>
        <OuroborosLoader compacto />
      </View>
    );
  }

  const slideAtual = slides[index];

  return (
    <View style={styles.container}>
      <Background />

      {/* Barras de progresso no topo */}
      <View style={styles.barras}>
        {slides.map((_, i) => (
          <View key={i} style={styles.barraSlot}>
            <View
              style={[
                styles.barraInner,
                {
                  width: i < index ? '100%' : i === index ? '50%' : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Botao fechar */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="fechar memorias"
        style={styles.fechar}
        hitSlop={12}
      >
        <X size={24} color={colorsMemorias.fg} strokeWidth={1.6} />
      </Pressable>

      {/* Conteudo do slide */}
      <View style={styles.conteudo}>
        {slideAtual ? <SlideRender slide={slideAtual} /> : null}
      </View>

      {/* Zonas de tap (esquerda volta, direita avanca, longpress pausa) */}
      <Pressable
        onPress={anterior}
        onLongPress={() => setPausado(true)}
        onPressOut={() => setPausado(false)}
        style={styles.zonaEsq}
        accessibilityLabel="anterior"
      />
      <Pressable
        onPress={proximo}
        onLongPress={() => setPausado(true)}
        onPressOut={() => setPausado(false)}
        style={styles.zonaDir}
        accessibilityLabel="proximo"
      />
    </View>
  );
}

function Background() {
  // Animacao lenta entre 3 cores. Reanimated puro (A28-safe).
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 8000 }),
        withTiming(0, { duration: 8000 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(t);
  }, [t]);

  const style = useAnimatedStyle(() => {
    const cor1 = colorsMemorias.bgGradient[0];
    const cor2 = colorsMemorias.bgGradient[1];
    const cor3 = colorsMemorias.bgGradient[2];
    // Oscila linearmente entre cor1 -> cor2 -> cor3 via opacity layers.
    const fase = t.value;
    return {
      backgroundColor: fase < 0.5 ? cor1 : fase < 0.75 ? cor2 : cor3,
    };
  });

  return <Animated.View style={[StyleSheet.absoluteFill, style]} />;
}

function SlideRender({ slide }: { slide: Slide }) {
  switch (slide.id) {
    case 'abertura':
      return (
        <View style={styles.slideCentral}>
          <Text style={styles.tituloGrande}>Olhe o que ficou.</Text>
          <Text style={styles.subTexto}>Dessa semana.</Text>
        </View>
      );
    case 'numeros':
      return (
        <View style={styles.slideCentral}>
          <Text style={styles.numeroEnorme}>{slide.registros}</Text>
          <Text style={styles.rotuloMaiusculo}>Registros</Text>
          <View style={styles.dividerCurto} />
          <Text style={styles.subTexto}>
            {slide.treinos > 0
              ? `${slide.treinos} treino${slide.treinos > 1 ? 's' : ''}.`
              : 'Nenhum treino.'}
          </Text>
          <Text style={styles.subTexto}>
            {slide.tarefas > 0
              ? `${slide.tarefas} tarefa${slide.tarefas > 1 ? 's' : ''} concluída${slide.tarefas > 1 ? 's' : ''}.`
              : 'Nenhuma tarefa concluída.'}
          </Text>
          <Text style={[styles.fraseInferior, { marginTop: 24 }]}>
            Você esteve presente.
          </Text>
        </View>
      );
    case 'vitorias':
      return (
        <View style={styles.slideCentral}>
          <Text style={styles.numeroEnorme}>{slide.contagem}</Text>
          <Text style={styles.rotuloMaiusculo}>
            {
              slide.contagem === 1
                ? 'Vitória' /* anonimato-allow: tipo de conquista do diario */
                : 'Vitórias' /* anonimato-allow: tipo de conquista do diario */
            }
          </Text>
          {slide.frasePrincipal ? (
            <Text style={styles.citacao} numberOfLines={3}>
              {slide.frasePrincipal}
            </Text>
          ) : null}
          <Text style={[styles.fraseInferior, { marginTop: 24 }]}>
            Passaram por aqui.
          </Text>
        </View>
      );
    case 'crises':
      return (
        <View style={styles.slideCentral}>
          <Text style={styles.numeroEnorme}>{slide.contagem}</Text>
          <Text style={styles.rotuloMaiusculo}>
            {slide.contagem === 1 ? 'Trigger' : 'Triggers'}
          </Text>
          <Text style={[styles.fraseInferior, { marginTop: 24 }]}>
            Você seguiu.
          </Text>
        </View>
      );
    case 'encerramento':
      return (
        <View style={styles.slideCentral}>
          <Text style={styles.tituloGrande}>Continue.</Text>
        </View>
      );
    default:
      return null;
  }
}

const SCREEN = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0d2e' },
  barras: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  barraSlot: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(253,246,227,0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  barraInner: {
    height: 2,
    backgroundColor: colorsMemorias.fg,
  },
  fechar: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 20,
    padding: 8,
  },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  zonaEsq: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN.width * 0.4,
  },
  zonaDir: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SCREEN.width * 0.4,
  },
  slideCentral: {
    alignItems: 'center',
    gap: 6,
  },
  tituloGrande: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 32,
    lineHeight: 44,
    textAlign: 'center',
  },
  numeroEnorme: {
    color: colorsMemorias.accent,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 96,
    lineHeight: 110,
  },
  rotuloMaiusculo: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  subTexto: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 16,
    lineHeight: 26,
    opacity: 0.85,
    textAlign: 'center',
  },
  dividerCurto: {
    width: 32,
    height: 1,
    backgroundColor: colorsMemorias.accent,
    marginVertical: 16,
    opacity: 0.6,
  },
  citacao: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
    paddingHorizontal: 24,
    opacity: 0.9,
  },
  fraseInferior: {
    color: colorsMemorias.accent,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
