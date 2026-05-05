// Preview estatico de audio gravado (M07.x). Exibe icone Mic, label
// "Áudio", duracao formatada em mm:ss e botao Play/Pause que toca o
// arquivo via expo-av Audio.Sound. Sem barras de waveform animadas:
// no momento do preview ja nao temos amplitudes em memoria, e
// renderizar barras estaticas seria decorativo sem dado real.
//
// Caller fornece o path relativo (assets/<...>.m4a) e o vaultRoot
// resolve a URI absoluta. Em ambientes de teste sem vaultRoot, o
// botao fica inerte.
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Mic, Pause, Play } from '@/lib/icons';
import { Audio } from 'expo-av';
import { colors, radius, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';

export interface WaveformPreviewProps {
  // Path relativo dentro do Vault (ex.: 'assets/2026-04-29-1845-3f2a.m4a').
  path: string;
  // Duracao opcional em segundos. Quando ausente, mostra '--:--'.
  duracaoSeg?: number;
}

// Concatena root SAF e path relativo, normalizando barras. Mesma
// logica usada em recordAudio.ts e saveEvento.ts; mantida inline
// aqui para nao criar dependencia circular.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Formata segundos como mm:ss. Cap em 99:59 para evitar overflow
// visual; o limite real de gravacao e 60s (M06.5).
function formatSeg(seg: number | undefined): string {
  if (typeof seg !== 'number' || !Number.isFinite(seg) || seg < 0) {
    return '--:--';
  }
  const total = Math.floor(seg);
  const min = Math.min(99, Math.floor(total / 60));
  const sec = total % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function WaveformPreview({ path, duracaoSeg }: WaveformPreviewProps) {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [tocando, setTocando] = useState<boolean>(false);

  // Cleanup ao desmontar: descarrega o som para liberar memoria. Se
  // o usuario sair da tela durante playback, o expo-av poderia
  // continuar tocando em background sem isso.
  useEffect(() => {
    return () => {
      const s = soundRef.current;
      if (s) {
        s.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    };
  }, []);

  const toggle = async () => {
    if (!vaultRoot) return;
    if (tocando) {
      const s = soundRef.current;
      if (s) {
        await s.pauseAsync().catch(() => undefined);
      }
      setTocando(false);
      return;
    }
    // Carrega novo Sound se ainda nao existe; reusa se ja foi
    // carregado e usuario apenas pausou.
    let s = soundRef.current;
    if (!s) {
      const uri = joinUri(vaultRoot, path);
      try {
        const { sound } = await Audio.Sound.createAsync({ uri });
        s = sound;
        soundRef.current = sound;
        // Quando a reproducao termina, voltamos para o estado idle
        // automaticamente; sem isso o botao fica travado em pause.
        sound.setOnPlaybackStatusUpdate((status) => {
          if (
            'didJustFinish' in status &&
            status.didJustFinish === true
          ) {
            setTocando(false);
            sound.setPositionAsync(0).catch(() => undefined);
          }
        });
      } catch {
        return;
      }
    }
    await s.playAsync().catch(() => undefined);
    setTocando(true);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
        padding: spacing.base,
        borderRadius: radius.input,
        backgroundColor: colors.bgElev,
      }}
      accessibilityLabel="preview de audio"
    >
      <Mic size={20} color={colors.cyan} strokeWidth={1.5} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 13,
          }}
        >
          Áudio
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
        >
          {formatSeg(duracaoSeg)}
        </Text>
      </View>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={tocando ? 'pausar audio' : 'tocar audio'}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.bgAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {tocando ? (
          <Pause size={16} color={colors.cyan} strokeWidth={2} />
        ) : (
          <Play size={16} color={colors.cyan} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );
}
