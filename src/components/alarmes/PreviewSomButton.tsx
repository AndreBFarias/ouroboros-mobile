// Botao de preview do som de alarme (R-NAV-2). Toca o arquivo .wav
// empacotado em assets/sounds/alarmes/ via expo-av. Mostra Play/Stop
// alternando conforme estado. Usado na tela de criacao/edicao de
// alarme para o usuario verificar o som antes de salvar.
//
// Em Web cai em no-op visual: botao desabilitado (placeholder de
// "preview indisponivel"). Quem usar deve garantir que esta no app
// nativo (Android/iOS).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import { Pause, Play } from '@/lib/icons';
import { springs } from '@/lib/motion';
import { MotiView } from 'moti';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import type { AlarmeSom } from '@/lib/schemas/alarme';

// Map estatico som -> require do .wav. require precisa ser literal
// estatico no RN bundler; nao da pra resolver dinamicamente.
const SOM_REQUIRE: Record<AlarmeSom, number> = {
  gentle: require('../../../assets/sounds/alarmes/gentle.wav'),
  normal: require('../../../assets/sounds/alarmes/normal.wav'),
  forte: require('../../../assets/sounds/alarmes/forte.wav'),
  chime: require('../../../assets/sounds/alarmes/chime.wav'),
  marimba: require('../../../assets/sounds/alarmes/marimba.wav'),
};

interface PreviewSomButtonProps {
  som: AlarmeSom;
  label?: string;
}

export function PreviewSomButton({
  som,
  label = 'Ouvir',
}: PreviewSomButtonProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [tocando, setTocando] = useState(false);
  const disponivel = Platform.OS !== 'web';

  // Cleanup ao desmontar ou ao trocar de som: descarrega para liberar
  // memoria. Sem isso, ate 5 sons consecutivos podem ficar carregados.
  useEffect(() => {
    return () => {
      const s = soundRef.current;
      if (s) {
        s.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    };
  }, []);

  // Quando muda o som selecionado, descarrega o anterior. Garante que
  // o proximo play carregue o novo .wav fresh.
  useEffect(() => {
    const s = soundRef.current;
    if (s) {
      s.unloadAsync().catch(() => undefined);
      soundRef.current = null;
      setTocando(false);
    }
  }, [som]);

  const tocar = useCallback(async () => {
    if (!disponivel) return;
    try {
      // Cleanup anterior se existir.
      const old = soundRef.current;
      if (old) {
        await old.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(SOM_REQUIRE[som], {
        shouldPlay: true,
      });
      soundRef.current = sound;
      setTocando(true);
      void haptics.selection();

      // Auto-reset quando termina (didJustFinish).
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setTocando(false);
          sound.unloadAsync().catch(() => undefined);
          soundRef.current = null;
        }
      });
    } catch {
      // Falha silenciosa - botao volta para Play.
      setTocando(false);
    }
  }, [som, disponivel]);

  const parar = useCallback(async () => {
    const s = soundRef.current;
    if (s) {
      await s.stopAsync().catch(() => undefined);
      await s.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }
    setTocando(false);
  }, []);

  const handlePress = useCallback(() => {
    if (tocando) {
      void parar();
    } else {
      void tocar();
    }
  }, [tocando, tocar, parar]);

  const Icon = tocando ? Pause : Play;

  return (
    <Pressable
      onPress={handlePress}
      disabled={!disponivel}
      accessibilityRole="button"
      accessibilityLabel={
        tocando ? `parar preview do som ${som}` : `ouvir preview do som ${som}`
      }
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: tocando ? colors.purple : colors.bgAlt,
        borderRadius: radius.input,
        borderWidth: 1,
        borderColor: tocando ? colors.purple : colors.bgElev,
        paddingVertical: 10,
        paddingHorizontal: 14,
        opacity: disponivel ? 1 : 0.5,
        alignSelf: 'flex-start',
      }}
    >
      <MotiView
        from={{ scale: 1 }}
        animate={{ scale: tocando ? 1.05 : 1 }}
        transition={springs.snappy}
      >
        <Icon
          size={16}
          color={tocando ? colors.bg : colors.fg}
        />
      </MotiView>
      <Text
        style={{
          color: tocando ? colors.bg : colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        {tocando ? 'Tocando...' : label}
      </Text>
    </Pressable>
  );
}
