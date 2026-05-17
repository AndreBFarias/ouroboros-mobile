// Q24.b (2026-05-13) -- Modo Memorias do Recap (Wrapped). Slideshow
// full-screen com 4-5 slides candidatos, auto-advance configuravel,
// tap-right avanca, tap-left volta, tap-hold pausa, swipe-down (back)
// fecha.
//
// R-RECAP-4 (2026-05-16) -- v2 do slideshow Memorias:
//   - auto-advance configuravel via settings.recap.slideshowIntervaloS
//     (default 4s, range 2-10s).
//   - botao pausar visivel no overlay (toggle pausa auto-advance,
//     audio ambient e Ken Burns).
//   - audio ambient embutido CC0 quando toggle settings.recapAmbientAudio
//     ligado (default OFF). Loop com fade-in 500ms, fade-out 500ms ao
//     pausar/fechar.
//   - Ken Burns 4 presets rotativos deterministicos (hash do slide id).
//   - frases de transicao sobre o slide (pool de 12 frases).
//
// Paleta exclusiva `colorsMemorias` (gradient roxo->magenta->cyan +
// dourado palido) -- quebra visual intencional vs cotidiano sobrio.
//
// ADR-0005: frases sobrias, sem exclamacao, sem comparativo, sem
// emoji. Tom de testemunha calma.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { Pause, Play, X } from '@/lib/icons';
import { useRecap, type PeriodoRange } from '@/lib/hooks/useRecap';
import { useRecapMemorias, type Slide } from '@/lib/hooks/useRecapMemorias';
import { useSettings } from '@/lib/stores/settings';
import { OuroborosLoader } from '@/components/brand';
import { KenBurns } from '@/components/recap/KenBurns';
import { fraseTransicaoPara } from '@/lib/copy/recap-transicoes';
import { colorsMemorias } from '@/theme/tokens';

// Track ambient CC0 (drone harmonico 60s loop). Require estatico:
// bundler precisa de literal para empacotar.
const AMBIENT_TRACK = require('../assets/sounds/ambient/recap-memorias.mp3');

// Fade-in/out em ms para entrada/saida do audio.
const AUDIO_FADE_MS = 500;

// R-MEDIA-2 (2026-05-16): volume final do ambient apos fade-in.
// Espelha o `5 * 0.05` do loop interno (passo 5 de 5). Centralizado
// como constante para a logica de pausa por audio anexado restaurar
// o volume correto sem reload da instancia.
const AMBIENT_VOLUME_ALVO = 0.25;
// Volume final do audio anexado. Mais alto que o ambient: e' o foco
// da atencao no slide. Ainda nao satura (~70%).
const AUDIO_ANEXADO_VOLUME_ALVO = 0.7;

function parseDate(raw: string | string[] | undefined, fallback: Date): Date {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string' || v.length === 0) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default function RecapMemoriasTela() {
  const router = useRouter();
  const params = useLocalSearchParams<{ de?: string; ate?: string }>();
  const intervaloS = useSettings((s) => s.recap.slideshowIntervaloS);
  const ambientLigado = useSettings(
    (s) => s.featureToggles.recapAmbientAudio
  );
  // R-MEDIA-2 (2026-05-16): toggle de autoplay do audio anexado ao
  // item (Conquista/Crise/Reflexao). Default ON. Off silencia
  // somente o audio anexado; ambient e' controlado pelo toggle
  // proprio acima.
  const audioAnexadoLigado = useSettings(
    (s) => s.featureToggles.recapAudioAnexadoAutoplay
  );

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

  // R-MEDIA-2: audio anexado do slide corrente (se houver). Slides
  // 'vitorias' e 'crises' carregam audioPath?: string | null derivado
  // de useRecap. Slides sem audio (abertura, numeros, midias,
  // encerramento) ficam null. Recalculado a cada troca de slide.
  // Memoizado com getter raw (slides[index]?.audioPath) — sem
  // useMemo: a propria mudanca de index e' dep estavel.
  const slideAtualRef = slides[index] ?? null;
  const audioAnexadoUri =
    slideAtualRef && 'audioPath' in slideAtualRef
      ? slideAtualRef.audioPath ?? null
      : null;

  // Audio ambient: instancia uma vez quando toggle ligado. Loop +
  // fade-in/out. Cleanup ao desmontar ou ao toggle desligar.
  const ambientSoundRef = useRef<Audio.Sound | null>(null);
  // R-MEDIA-2: segunda instancia paralela para audio anexado ao item.
  // Carrega/descarrega a cada troca de slide quando o slide tem
  // audioPath e autoplay esta ligado. Fade-in/out simetrico (500ms).
  const audioAnexadoRef = useRef<Audio.Sound | null>(null);
  const audioDisponivel = Platform.OS !== 'web';

  // Helper: descarrega audio com fade-out suave antes de unloadAsync.
  const descarregarAmbient = useCallback(async () => {
    const s = ambientSoundRef.current;
    if (!s) return;
    try {
      // Fade-out manual em ~5 passos (500ms total).
      for (let i = 4; i >= 0; i -= 1) {
        await s.setVolumeAsync(i * 0.05).catch(() => undefined);
        await new Promise((r) => setTimeout(r, AUDIO_FADE_MS / 5));
      }
      await s.stopAsync().catch(() => undefined);
      await s.unloadAsync().catch(() => undefined);
    } catch {
      // Best-effort cleanup.
    }
    ambientSoundRef.current = null;
  }, []);

  // R-MEDIA-2: descarrega audio anexado com fade-out simetrico.
  const descarregarAudioAnexado = useCallback(async () => {
    const s = audioAnexadoRef.current;
    if (!s) return;
    try {
      const passos = 5;
      const volIni = AUDIO_ANEXADO_VOLUME_ALVO;
      // Fade-out linear em 5 passos (500ms total) espelhando ambient.
      for (let i = passos - 1; i >= 0; i -= 1) {
        await s
          .setVolumeAsync((volIni * i) / passos)
          .catch(() => undefined);
        await new Promise((r) => setTimeout(r, AUDIO_FADE_MS / passos));
      }
      await s.stopAsync().catch(() => undefined);
      await s.unloadAsync().catch(() => undefined);
    } catch {
      // Best-effort cleanup.
    }
    audioAnexadoRef.current = null;
  }, []);

  // Carrega ambient quando toggle liga + slideshow nao pausado +
  // nao em loading. Descarrega quando qualquer condicao deixa de
  // valer ou ao desmontar.
  useEffect(() => {
    if (!audioDisponivel) return;
    if (!ambientLigado || pausado || loading) {
      // Garantir descarregamento se ja havia instancia.
      void descarregarAmbient();
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(AMBIENT_TRACK, {
          shouldPlay: false,
          isLooping: true,
          volume: 0,
        });
        if (cancelado) {
          await sound.unloadAsync().catch(() => undefined);
          return;
        }
        ambientSoundRef.current = sound;
        await sound.playAsync().catch(() => undefined);
        // Fade-in em 5 passos.
        for (let i = 1; i <= 5; i += 1) {
          if (cancelado) break;
          await sound
            .setVolumeAsync(i * 0.05)
            .catch(() => undefined);
          await new Promise((r) => setTimeout(r, AUDIO_FADE_MS / 5));
        }
      } catch {
        // Falha de load (asset corrompido ou sem audio nativo):
        // ignora silenciosamente — slideshow continua sem som.
      }
    })();

    return () => {
      cancelado = true;
      void descarregarAmbient();
    };
  }, [ambientLigado, pausado, loading, audioDisponivel, descarregarAmbient]);

  // R-MEDIA-2: carrega audio anexado quando slide muda para um que
  // tem audioPath + toggle ligado + nao pausado + nao em loading.
  // Cross-fade com ambient: enquanto anexado toca, ambient e' levado
  // a volume 0 (sem unload — mantemos a instancia para retomada
  // imediata quando proximo slide nao tiver audio). Quando anexado
  // descarrega, ambient volta ao volume alvo.
  useEffect(() => {
    if (!audioDisponivel) return;
    if (!audioAnexadoLigado || pausado || loading || !audioAnexadoUri) {
      // Sem audio anexado neste slide: descarrega instancia se houver
      // e devolve volume do ambient (se ambient ja tem instancia).
      void (async () => {
        await descarregarAudioAnexado();
        const amb = ambientSoundRef.current;
        if (amb && ambientLigado && !pausado) {
          // Restaura volume alvo do ambient suavemente (sem reload).
          for (let i = 1; i <= 5; i += 1) {
            await amb
              .setVolumeAsync((AMBIENT_VOLUME_ALVO * i) / 5)
              .catch(() => undefined);
            await new Promise((r) => setTimeout(r, AUDIO_FADE_MS / 5));
          }
        }
      })();
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        // Antes de carregar o novo, baixa o ambient para 0 (cross-fade).
        const amb = ambientSoundRef.current;
        if (amb) {
          for (let i = 4; i >= 0; i -= 1) {
            if (cancelado) break;
            await amb
              .setVolumeAsync((AMBIENT_VOLUME_ALVO * i) / 5)
              .catch(() => undefined);
            await new Promise((r) => setTimeout(r, AUDIO_FADE_MS / 5));
          }
        }
        if (cancelado) return;

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioAnexadoUri },
          {
            shouldPlay: false,
            isLooping: false,
            volume: 0,
          }
        );
        if (cancelado) {
          await sound.unloadAsync().catch(() => undefined);
          return;
        }
        audioAnexadoRef.current = sound;
        await sound.playAsync().catch(() => undefined);
        // Fade-in em 5 passos espelhando ambient.
        for (let i = 1; i <= 5; i += 1) {
          if (cancelado) break;
          await sound
            .setVolumeAsync((AUDIO_ANEXADO_VOLUME_ALVO * i) / 5)
            .catch(() => undefined);
          await new Promise((r) => setTimeout(r, AUDIO_FADE_MS / 5));
        }
      } catch {
        // Falha de load (uri invalida, arquivo inacessivel): ignora.
        // Slide continua sem som; ambient retoma via branch acima na
        // proxima troca de slide.
      }
    })();

    return () => {
      cancelado = true;
      void descarregarAudioAnexado();
    };
  }, [
    audioAnexadoUri,
    audioAnexadoLigado,
    audioDisponivel,
    pausado,
    loading,
    ambientLigado,
    descarregarAudioAnexado,
  ]);

  // Cleanup absoluto ao desmontar a tela.
  useEffect(() => {
    return () => {
      void descarregarAmbient();
      void descarregarAudioAnexado();
    };
  }, [descarregarAmbient, descarregarAudioAnexado]);

  // Auto-advance configuravel.
  useEffect(() => {
    if (loading || pausado) return;
    if (index >= slides.length - 1) return;
    const intervaloMs = Math.max(2, Math.min(10, intervaloS)) * 1000;
    timerRef.current = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, slides.length - 1));
    }, intervaloMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, pausado, loading, slides.length, intervaloS]);

  const proximo = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else router.back();
  };
  const anterior = () => {
    if (index > 0) setIndex(index - 1);
  };

  // IMPORTANTE: hooks abaixo (useMemo) DEVEM rodar antes do early return
  // de loading. Senao react quebra a contagem de hooks entre renders
  // (Minified React error #300/#310: "Rendered fewer hooks than expected").
  const slideAtual = slides[index];
  const slideId = slideAtual?.id ?? `idx-${index}`;
  const fraseTransicao = useMemoFraseTransicao(
    slideId,
    range.de.toISOString().slice(0, 10)
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#1a0d2e' }]}>
        <OuroborosLoader compacto />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Background />

      {/* Ken Burns no fundo do slide. Re-anima a cada troca de slide
          (key forca re-mount do KenBurns). */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <KenBurns
          key={`kb-${slideId}-${index}`}
          slideId={slideId}
          duracao={Math.max(2000, intervaloS * 1000)}
          pausado={pausado}
        >
          <View style={styles.kenBurnsTinta} />
        </KenBurns>
      </View>

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

      {/* Botoes do header: fechar (direita) e pausar (esquerda). */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="fechar memorias"
        style={styles.fechar}
        hitSlop={12}
      >
        <X size={24} color={colorsMemorias.fg} strokeWidth={1.6} />
      </Pressable>

      <Pressable
        onPress={() => setPausado((p) => !p)}
        accessibilityRole="button"
        accessibilityLabel={
          pausado ? 'retomar memorias' : 'pausar memorias'
        }
        style={styles.pausar}
        hitSlop={12}
      >
        {pausado ? (
          <Play size={22} color={colorsMemorias.fg} strokeWidth={1.6} />
        ) : (
          <Pause size={22} color={colorsMemorias.fg} strokeWidth={1.6} />
        )}
      </Pressable>

      {/* Conteudo do slide */}
      <View style={styles.conteudo}>
        {slideAtual ? <SlideRender slide={slideAtual} /> : null}
      </View>

      {/* Frase de transicao sobre o slide. Pequena, opacity baixa,
          rotativa por slide id. */}
      {slideAtual && slideAtual.id !== 'abertura' && slideAtual.id !== 'encerramento' ? (
        <Text
          style={styles.fraseTransicao}
          accessibilityLabel={`transicao ${fraseTransicao}`}
        >
          {fraseTransicao}
        </Text>
      ) : null}

      {/* Zonas de tap (esquerda volta, direita avanca, longpress pausa).
          z-index acima do Ken Burns mas abaixo dos botoes. */}
      <Pressable
        onPress={anterior}
        onLongPress={() => setPausado(true)}
        onPressOut={() => {
          // Se o usuario soltou o long-press, retoma. Distingue do
          // botao pausar pelo fato de pausado ter sido setado dentro
          // de onLongPress, e o release sempre volta a tocar.
          if (pausado) setPausado(false);
        }}
        style={styles.zonaEsq}
        accessibilityLabel="anterior"
      />
      <Pressable
        onPress={proximo}
        onLongPress={() => setPausado(true)}
        onPressOut={() => {
          if (pausado) setPausado(false);
        }}
        style={styles.zonaDir}
        accessibilityLabel="proximo"
      />
    </View>
  );
}

// Hook interno trivial: memoiza a frase de transicao do slide por
// (slideId + seed do periodo). useMemo direto, mas extraido para
// ficar legivel no JSX e ter nome descritivo.
function useMemoFraseTransicao(slideId: string, seed: string): string {
  return useMemo(
    () => fraseTransicaoPara(`${slideId}:${seed}`),
    [slideId, seed]
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
    case 'midias': {
      // R-CRIT-3 (2026-05-16): slide das midias capturadas no periodo.
      // Numero grande = total foto+audio+video; linhas auxiliares
      // detalham por tipo apenas quando >0 (evita mostrar "0 vídeos").
      const total = slide.fotos + slide.audios + slide.videos;
      return (
        <View style={styles.slideCentral}>
          <Text style={styles.numeroEnorme}>{total}</Text>
          <Text style={styles.rotuloMaiusculo}>
            {total === 1 ? 'Mídia' : 'Mídias'}
          </Text>
          <View style={styles.dividerCurto} />
          {slide.fotos > 0 ? (
            <Text style={styles.subTexto}>
              {`${slide.fotos} foto${slide.fotos > 1 ? 's' : ''}.`}
            </Text>
          ) : null}
          {slide.audios > 0 ? (
            <Text style={styles.subTexto}>
              {`${slide.audios} áudio${slide.audios > 1 ? 's' : ''}.`}
            </Text>
          ) : null}
          {slide.videos > 0 ? (
            <Text style={styles.subTexto}>
              {`${slide.videos} vídeo${slide.videos > 1 ? 's' : ''}.`}
            </Text>
          ) : null}
          <Text style={[styles.fraseInferior, { marginTop: 24 }]}>
            Ficou registrado.
          </Text>
        </View>
      );
    }
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
  pausar: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 20,
    padding: 8,
  },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 5,
  },
  fraseTransicao: {
    position: 'absolute',
    bottom: 60,
    left: 32,
    right: 32,
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.55,
    letterSpacing: 2,
    textTransform: 'lowercase',
    zIndex: 6,
  },
  kenBurnsTinta: {
    flex: 1,
    backgroundColor: 'rgba(189,147,249,0.04)',
  },
  zonaEsq: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN.width * 0.4,
    zIndex: 4,
  },
  zonaDir: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SCREEN.width * 0.4,
    zIndex: 4,
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
