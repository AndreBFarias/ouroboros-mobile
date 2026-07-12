// Visualizacao ao vivo da amplitude do audio durante a gravacao
// (Tela 18, M06.5). Recebe metering em dB do Audio.Recording e
// renderiza 24 barras verticais com altura proporcional. Sem
// dependencia nova: cada barra e MotiView animando height via
// spring subtle. Quando recording=null, exibe 24 barras minimas
// (estado idle) - util para nao gerar layout shift no enter.
//
// Convencao: o componente e dumb. Caller (MicrofoneButton) cuida
// do listener setOnRecordingStatusUpdate; este modulo so recebe o
// vetor de amplitudes [0..1] como prop.
import { useMemo } from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';

const N_BARRAS = 24;
const ALTURA_MIN = 4;
const ALTURA_MAX = 32;

export interface WaveformProps {
  // Vetor com 24 amplitudes normalizadas [0, 1]. Caller mantem em
  // estado e atualiza a cada update do recording status. Quando
  // ausente ou vazio, renderiza barras minimas (idle).
  amplitudes?: number[];
}

// Garante que o array tem exatamente N_BARRAS posicoes, preenchendo
// com 0 ou truncando. Defensivo contra caller que passa array de
// tamanho variavel (ex.: gravacao recem-iniciada com 1 sample).
function normalizar(input: number[] | undefined): number[] {
  if (!input || input.length === 0) {
    return Array<number>(N_BARRAS).fill(0);
  }
  if (input.length === N_BARRAS) return input;
  if (input.length > N_BARRAS) return input.slice(-N_BARRAS);
  // Pad a esquerda com zeros para a barra mais recente ficar a
  // direita (sensacao de "scroll" natural de waveform).
  const pad = Array<number>(N_BARRAS - input.length).fill(0);
  return [...pad, ...input];
}

export function Waveform({ amplitudes }: WaveformProps) {
  const barras = useMemo(() => normalizar(amplitudes), [amplitudes]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: ALTURA_MAX,
        gap: spacing.xs / 2,
      }}
      accessibilityLabel="visualizacao do audio gravado"
    >
      {barras.map((amp, idx) => {
        const altura =
          ALTURA_MIN +
          Math.max(0, Math.min(1, amp)) * (ALTURA_MAX - ALTURA_MIN);
        return (
          <MotiView
            key={idx}
            animate={{ height: altura }}
            transition={springs.subtle}
            style={{
              width: 3,
              backgroundColor: colors.cyan,
              borderRadius: 1.5,
            }}
          />
        );
      })}
    </View>
  );
}
