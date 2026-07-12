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
// R-RECAP-6 (2026-05-16) -- botao Compartilhar (Share2) no header
// ao lado do Pausar. Tap pausa, captura slide visivel como PNG
// 1080x1920 (formato Instagram Stories) via react-native-view-shot,
// dispara share intent nativo via expo-sharing. Export efemero
// (cacheDirectory), nao persiste no Vault.
//
// R-RECAP-7 (2026-05-26) -- escolha de formato antes do capture.
// Tap em Compartilhar pausa e abre um overlay com dois botoes:
// "Stories" (1080x1920) e "Post quadrado" (1080x1080). O formato
// escolhido e' repassado a exportarSlideMemorias. Overlay com RN
// puro (sem dependencia de sheet nativo), A28/A44-safe.
//
// R-RECAP-9 (2026-07-11) -- trilha animada estilo Google Fotos. O drone
// ambient fixo (AMBIENT_TRACK) da lugar a uma faixa alegre sorteada de
// um pool de 16 (src/lib/recap/musicaFundo.ts) a cada abertura do
// slideshow; toca em loop com fade-in/out. Botao de som no header
// (Volume2/VolumeX) muta/desmuta, persistindo no toggle
// settings.featureToggles.recapMusicaFundo (default ON). Quando um slide
// tem audio anexado (memoria gravada), a musica de fundo abaixa (duck
// para MUSICA_DUCK_VOLUME) em vez de mutar, e restaura ao sair do slide.
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
import { Pause, Play, Share2, Volume2, VolumeX, X } from '@/lib/icons';
import { useRecap, type PeriodoRange } from '@/lib/hooks/useRecap';
import { useRecapMemorias, type Slide } from '@/lib/hooks/useRecapMemorias';
import { useSettings } from '@/lib/stores/settings';
import { OuroborosLoader } from '@/components/brand';
// R-RECAP-6: useOptionalToast (nao useToast) para nao explodir em
// rotas/testes que renderizam sem ToastProvider acima. Fallback
// no-op silencioso quando o provider esta ausente.
import { useOptionalToast } from '@/components/ui';
import { KenBurns } from '@/components/recap/KenBurns';
// R-RECAP-8 (2026-07-10): card estatico off-screen usado como alvo da
// captura do share (evita o NPE de child null da arvore Reanimated no
// Fabric -- armadilha A46).
import { ShareCardMemoria } from '@/components/recap/ShareCardMemoria';
import { fraseTransicaoPara } from '@/lib/copy/recap-transicoes';
import { colorsMemorias } from '@/theme/tokens';
// R-RECAP-6: export PNG + share intent. Export efemero
// (cacheDirectory), nao persiste no Vault.
// R-RECAP-7: FormatoShare ('stories' | 'quadrado') escolhido na UI.
import {
  exportarSlideMemorias,
  compartilharSlidePng,
  removerSlidePngTemp,
  type FormatoShare,
} from '@/lib/midia/exportarSlideMemorias';
import { haptics } from '@/lib/haptics';
// R-RECAP-9: pool de trilhas + seletor deterministico. A faixa da sessao
// e' sorteada na abertura (uma por slideshow, modelo Google Fotos).
import {
  MUSICAS_FUNDO,
  sortearMusica,
  registrarMusicaTocada,
} from '@/lib/recap/musicaFundo';

// Fade-in/out em ms para entrada/saida do audio.
const AUDIO_FADE_MS = 500;

// R-MEDIA-2 (2026-05-16): volume final da musica de fundo apos fade-in.
// Espelha o `5 * 0.05` do loop interno (passo 5 de 5). Centralizado
// como constante para a logica de duck por audio anexado restaurar
// o volume correto sem reload da instancia.
const AMBIENT_VOLUME_ALVO = 0.25;
// R-RECAP-9: volume da musica de fundo enquanto um audio anexado toca.
// "Duck" (abaixa, nao muta) para o audio gravado ficar em primeiro plano
// sem cortar a trilha -- decisao da spec (§3: "abaixa para ~0.1 e
// restaura"). Restaura a AMBIENT_VOLUME_ALVO ao sair do slide.
const MUSICA_DUCK_VOLUME = 0.1;
// Volume final do audio anexado. Mais alto que a musica de fundo: e' o
// foco da atencao no slide. Ainda nao satura (~70%).
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
  // R-RECAP-9: gate da trilha animada de fundo (default ON). Substitui
  // o antigo recapAmbientAudio como controle do slideshow. Mutado/
  // desmutado pelo botao de som no header (persiste no toggle).
  const musicaLigada = useSettings((s) => s.featureToggles.recapMusicaFundo);
  const setFeatureToggle = useSettings((s) => s.setFeatureToggle);
  // R-MEDIA-2 (2026-05-16): toggle de autoplay do audio anexado ao
  // item (Conquista/Crise/Reflexao). Default ON. Off silencia
  // somente o audio anexado; a musica de fundo segue o toggle proprio.
  const audioAnexadoLigado = useSettings(
    (s) => s.featureToggles.recapAudioAnexadoAutoplay
  );

  // R-RECAP-9: faixa da sessao. Sorteada UMA vez na montagem (modelo
  // Google Fotos: uma musica por slideshow inteiro). useState com
  // initializer garante estabilidade entre re-renders; Date.now como
  // seed + estado de sessao do modulo evitam repetir a mesma 2x
  // seguidas. registrarMusicaTocada marca a escolha para o proximo
  // slideshow variar.
  const [musicaIdx] = useState(() => sortearMusica(Date.now()));
  useEffect(() => {
    registrarMusicaTocada(musicaIdx);
  }, [musicaIdx]);
  const musicaFundo = MUSICAS_FUNDO[musicaIdx];

  // R-RECAP-FIX-LOOP (2026-05-17): estabilizar `range` para nao
  // disparar Maximum update depth no useRecap. Antes, `hoje =
  // new Date()` e `seteDiasAtras = new Date(...)` eram recalculados
  // a cada render com Date.now() ligeiramente diferente, o que fazia
  // `range.de.getTime()` mudar entre renders e re-disparar o
  // useEffect interno do useRecap (setLoading -> re-render -> loop).
  // Solucao: memoizar via strings primitivas params.de/params.ate;
  // fallbacks (hoje/seteDiasAtras) so' sao calculados quando o param
  // correspondente esta ausente, e ficam estaveis enquanto as strings
  // de entrada nao mudarem.
  const deString = Array.isArray(params.de) ? params.de[0] : params.de;
  const ateString = Array.isArray(params.ate) ? params.ate[0] : params.ate;
  const range: PeriodoRange = useMemo(() => {
    const hoje = new Date();
    const seteDiasAtras = new Date(
      hoje.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    return {
      de: parseDate(deString, seteDiasAtras),
      ate: parseDate(ateString, hoje),
    };
  }, [deString, ateString]);
  const { data, loading } = useRecap(range);
  const slides = useRecapMemorias({ data });

  const [index, setIndex] = useState(0);
  const [pausado, setPausado] = useState(false);
  // R-RECAP-6: estado de captura em andamento. Habilita guard contra
  // double-tap durante a captura/share (caller seta true ao iniciar,
  // false no finally).
  const [compartilhando, setCompartilhando] = useState(false);
  // R-RECAP-7: overlay de escolha de formato aberto. Quando true,
  // mostra dois botoes (Stories / Post quadrado). Tap no Compartilhar
  // abre; escolher um formato ou cancelar fecha.
  const [escolhendoFormato, setEscolhendoFormato] = useState(false);
  // R-RECAP-7: memoriza se o slide ja estava pausado manualmente
  // ANTES de abrir o overlay de escolha. A retomada (no finally do
  // capture, ou no cancelar) so acontece se estava ativo. Ref porque
  // o valor e' lido em callbacks assincronos sem virar dependencia.
  const estavaPausadoAntesShareRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // R-RECAP-8 (2026-07-10): refs dos cards de share ESTATICOS (um por
  // formato). Substituem o antigo slideViewRef que apontava para o
  // container raiz da tela -- essa raiz inclui o Background animado e o
  // Ken Burns (Reanimated), cuja arvore reciclava child Views durante o
  // draw e fazia captureRef ler mViewFlags de um child null -> NPE no
  // Fabric (A46). Capturamos um card chapado, isolado da animacao.
  //
  // Dois refs (nao um so' + state) para eliminar a corrida entre
  // setState(formato) e captureRef: ambos os cards ficam montados
  // enquanto o overlay de escolha esta aberto, entao o ref do formato
  // escolhido ja esta populado no instante da captura.
  const shareCardStoriesRef = useRef<View | null>(null);
  const shareCardQuadradoRef = useRef<View | null>(null);
  const toast = useOptionalToast();

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

  // R-RECAP-9: carrega a musica de fundo da sessao quando o toggle liga
  // + slideshow nao pausado + nao em loading. Descarrega quando qualquer
  // condicao deixa de valer ou ao desmontar. A faixa (musicaFundo.asset)
  // e' fixa por sessao (sorteada na montagem).
  useEffect(() => {
    if (!audioDisponivel) return;
    if (!musicaLigada || pausado || loading) {
      // Garantir descarregamento se ja havia instancia.
      void descarregarAmbient();
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(musicaFundo.asset, {
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
  }, [
    musicaLigada,
    pausado,
    loading,
    audioDisponivel,
    musicaFundo.asset,
    descarregarAmbient,
  ]);

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
      // e restaura o volume da musica de fundo (se ja tem instancia).
      void (async () => {
        await descarregarAudioAnexado();
        const amb = ambientSoundRef.current;
        if (amb && musicaLigada && !pausado) {
          // R-RECAP-9: restaura suavemente do duck (MUSICA_DUCK_VOLUME)
          // de volta ao volume alvo, sem reload da instancia.
          for (let i = 1; i <= 5; i += 1) {
            const v =
              MUSICA_DUCK_VOLUME +
              ((AMBIENT_VOLUME_ALVO - MUSICA_DUCK_VOLUME) * i) / 5;
            await amb.setVolumeAsync(v).catch(() => undefined);
            await new Promise((r) => setTimeout(r, AUDIO_FADE_MS / 5));
          }
        }
      })();
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        // R-RECAP-9: antes de carregar o audio anexado, faz duck da
        // musica de fundo para MUSICA_DUCK_VOLUME (abaixa, nao muta) --
        // a memoria gravada fica em primeiro plano sem cortar a trilha.
        const amb = ambientSoundRef.current;
        if (amb) {
          for (let i = 1; i <= 5; i += 1) {
            if (cancelado) break;
            const v =
              AMBIENT_VOLUME_ALVO +
              ((MUSICA_DUCK_VOLUME - AMBIENT_VOLUME_ALVO) * i) / 5;
            await amb.setVolumeAsync(v).catch(() => undefined);
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
    musicaLigada,
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

  // R-RECAP-9: alterna mudo da musica de fundo. Persiste no toggle
  // recapMusicaFundo -- o effect de carga reage ao novo valor (liga toca
  // com fade-in, desliga descarrega com fade-out). Haptic leve.
  const toggleMusica = useCallback(() => {
    void haptics.light();
    setFeatureToggle('recapMusicaFundo', !musicaLigada);
  }, [setFeatureToggle, musicaLigada]);

  // R-RECAP-7: tap em Compartilhar abre o overlay de escolha de
  // formato. Pausa o slideshow enquanto o overlay esta aberto e
  // memoriza se ja estava pausado manualmente (para a retomada
  // posterior so acontecer se estava ativo). Guard contra reabrir
  // durante captura em andamento.
  const abrirEscolhaFormato = useCallback(() => {
    if (compartilhando || escolhendoFormato) return;
    estavaPausadoAntesShareRef.current = pausado;
    setPausado(true);
    setEscolhendoFormato(true);
  }, [compartilhando, escolhendoFormato, pausado]);

  // R-RECAP-7: fecha o overlay sem compartilhar. Retoma o slideshow
  // se nao estava pausado manualmente antes.
  const cancelarEscolhaFormato = useCallback(() => {
    setEscolhendoFormato(false);
    if (!estavaPausadoAntesShareRef.current) {
      setPausado(false);
    }
  }, []);

  // R-RECAP-6/7: captura o slide visivel via captureRef no formato
  // escolhido, dispara share intent, e ao final retoma se nao estava
  // pausado por outro motivo. Guard contra double-tap via
  // `compartilhando`. Erros sao toast-feedback (nao trava UI).
  const executarShare = useCallback(
    async (formato: FormatoShare) => {
      if (compartilhando) return;
      const slideId = slides[index]?.id ?? `idx-${index}`;
      const estavaPausado = estavaPausadoAntesShareRef.current;
      setEscolhendoFormato(false);
      setCompartilhando(true);
      setPausado(true);
      toast.show('Preparando…', 'info');
      try {
        // R-RECAP-8: alvo da captura e' o card estatico do formato
        // escolhido (nao mais a raiz animada). Ref ja populado porque o
        // card montou junto com o overlay de escolha.
        const slideRef =
          formato === 'quadrado' ? shareCardQuadradoRef : shareCardStoriesRef;
        const res = await exportarSlideMemorias({
          slideRef,
          slideId,
          formato,
        });
        if (!res.uri) {
          if (res.motivo === 'web') {
            toast.show('Compartilhamento indisponível.', 'warn');
          } else {
            toast.show('Não foi possível gerar a imagem.', 'error');
          }
          return;
        }
        const ok = await compartilharSlidePng(res.uri);
        if (!ok) {
          toast.show('Compartilhamento cancelado.', 'info');
        }
        // Cleanup best-effort do PNG temporario (apos share sheet
        // fechar). Falha silenciosa: o OS pode limpar cache sozinho.
        await removerSlidePngTemp(res.uri);
      } catch {
        toast.show('Não foi possível gerar a imagem.', 'error');
      } finally {
        setCompartilhando(false);
        if (!estavaPausado) {
          setPausado(false);
        }
      }
    },
    [compartilhando, slides, index, toast]
  );

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
    <View collapsable={false} style={styles.container}>
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

      {/* Botoes do header: fechar (direita), pausar e compartilhar
          (esquerda). R-RECAP-6: Share2 ao lado do Pausar. */}
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

      <Pressable
        onPress={abrirEscolhaFormato}
        disabled={compartilhando}
        accessibilityRole="button"
        accessibilityLabel="compartilhar slide"
        style={styles.compartilhar}
        hitSlop={12}
      >
        <Share2 size={22} color={colorsMemorias.fg} strokeWidth={1.6} />
      </Pressable>

      {/* R-RECAP-9: botao de som. Alterna mudo da musica de fundo
          (Volume2 = tocando, VolumeX = mudo) e persiste em
          recapMusicaFundo. Ao lado direito do compartilhar. */}
      <Pressable
        onPress={toggleMusica}
        accessibilityRole="button"
        accessibilityLabel={musicaLigada ? 'silenciar musica' : 'ativar musica'}
        accessibilityState={{ selected: musicaLigada }}
        style={styles.som}
        hitSlop={12}
      >
        {musicaLigada ? (
          <Volume2 size={22} color={colorsMemorias.fg} strokeWidth={1.6} />
        ) : (
          <VolumeX size={22} color={colorsMemorias.fg} strokeWidth={1.6} />
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

      {/* R-RECAP-7: overlay de escolha de formato. Aparece sobre tudo
          (zIndex 30 > header 20) quando o usuario toca Compartilhar.
          Backdrop tappable cancela. Dois botoes: Stories (9:16) e
          Post quadrado (1:1). Tom ADR-0005 (sem exclamacao). RN puro
          (sem sheet nativo), A28/A44-safe. */}
      {escolhendoFormato ? (
        <View style={styles.formatoOverlay}>
          <Pressable
            onPress={cancelarEscolhaFormato}
            accessibilityRole="button"
            accessibilityLabel="cancelar escolha de formato"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.formatoSheet}>
            <Text style={styles.formatoTitulo}>Escolha o formato</Text>
            <Pressable
              onPress={() => executarShare('stories')}
              disabled={compartilhando}
              accessibilityRole="button"
              accessibilityLabel="compartilhar como stories"
              style={styles.formatoBotao}
              hitSlop={8}
            >
              <Text style={styles.formatoBotaoTitulo}>Stories</Text>
              <Text style={styles.formatoBotaoSub}>Vertical, 9:16</Text>
            </Pressable>
            <Pressable
              onPress={() => executarShare('quadrado')}
              disabled={compartilhando}
              accessibilityRole="button"
              accessibilityLabel="compartilhar como post quadrado"
              style={styles.formatoBotao}
              hitSlop={8}
            >
              <Text style={styles.formatoBotaoTitulo}>Post quadrado</Text>
              <Text style={styles.formatoBotaoSub}>Feed, 1:1</Text>
            </Pressable>
            <Pressable
              onPress={cancelarEscolhaFormato}
              accessibilityRole="button"
              accessibilityLabel="cancelar"
              style={styles.formatoCancelar}
              hitSlop={8}
            >
              <Text style={styles.formatoCancelarTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Zonas de tap (esquerda volta, direita avanca, longpress pausa).
          z-index acima do Ken Burns mas abaixo dos botoes.
          R-A11Y-TALKBACK (2026-05-17): role="button" explicito mais
          accessibilityHint para anunciar o long-press (gesto nao obvio
          em TalkBack). */}
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
        accessibilityRole="button"
        accessibilityLabel="anterior"
        accessibilityHint="press-and-hold pausa a reproducao"
      />
      <Pressable
        onPress={proximo}
        onLongPress={() => setPausado(true)}
        onPressOut={() => {
          if (pausado) setPausado(false);
        }}
        style={styles.zonaDir}
        accessibilityRole="button"
        accessibilityLabel="proximo"
        accessibilityHint="press-and-hold pausa a reproducao"
      />

      {/* R-RECAP-8: cards de share estaticos, montados OFF-SCREEN apenas
          durante a escolha/captura de formato. Sem Reanimated e sem Ken
          Burns -> captureRef nao encontra child null no Fabric (A46). Um
          card por formato para o ref do formato escolhido ja estar
          populado no instante da captura (sem corrida com setState).
          pointerEvents none: nao intercepta toque; left negativo tira da
          viewport sem afetar a captura (captureRef desenha via ref). */}
      {(escolhendoFormato || compartilhando) && slideAtual ? (
        <View
          pointerEvents="none"
          style={styles.shareCardOffscreen}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ShareCardMemoria
            ref={shareCardStoriesRef}
            slide={slideAtual}
            formato="stories"
          />
          <ShareCardMemoria
            ref={shareCardQuadradoRef}
            slide={slideAtual}
            formato="quadrado"
          />
        </View>
      ) : null}
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
  // R-RECAP-8: container off-screen dos cards de share. left negativo
  // tira da area visivel; width fixa (SCREEN.width) para o aspectRatio
  // dos cards resolver o layout. captureRef desenha a view pelo ref,
  // independente de estar no viewport.
  shareCardOffscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: SCREEN.width,
    zIndex: -1,
  },
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
  // R-RECAP-6: compartilhar fica ao lado direito do pausar. Pausar
  // ocupa left=16 com padding=8 + icone 22 = ~46dp de largura util.
  // Compartilhar comeca em left=64 (46 + 8 de gap + 10 de respiro).
  // Mesmo top do pausar para alinhamento visual no header.
  compartilhar: {
    position: 'absolute',
    top: 60,
    left: 64,
    zIndex: 20,
    padding: 8,
  },
  // R-RECAP-9: botao de som ao lado direito do compartilhar. Compartilhar
  // ocupa left=64 (padding 8 + icone 22 ~= 46dp util); som comeca em
  // left=112 preservando a mesma folga de respiro do header.
  som: {
    position: 'absolute',
    top: 60,
    left: 112,
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
  // R-RECAP-7: overlay de escolha de formato. Backdrop escuro
  // translucido cobre toda a tela; sheet ancorado embaixo.
  formatoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,7,28,0.72)',
    justifyContent: 'flex-end',
    zIndex: 30,
  },
  // Hierarquia por contraste (fundo sobreposto), sem borda dura.
  // Respiracao generosa (padding 24, gap entre botoes).
  formatoSheet: {
    backgroundColor: 'rgba(26,13,46,0.98)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 12,
  },
  formatoTitulo: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  formatoBotao: {
    backgroundColor: 'rgba(189,147,249,0.12)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
  },
  formatoBotaoTitulo: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 17,
    lineHeight: 26,
  },
  formatoBotaoSub: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.7,
  },
  formatoCancelar: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  formatoCancelarTexto: {
    color: colorsMemorias.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.65,
  },
});
