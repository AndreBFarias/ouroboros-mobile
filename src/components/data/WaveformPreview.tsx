// Waveform decorativo para cover de áudio (M11.5). Não toca o
// arquivo — uso meramente visual. Recebe o path da mídia e gera 28
// barras retangulares com altura determinística por hash do path:
// dois cards com o mesmo áudio mostram o mesmo desenho, e mídia
// órfã (path inválido) ainda renderiza algo coerente. Cor cyan
// sobre fundo bg-elev (paleta Drácula).
//
// Comentários em PT-BR com acentuação correta.
import { View } from 'react-native';
import { colors } from '@/theme/tokens';

interface WaveformPreviewProps {
  uri: string;
  // Quantidade de barras (default 28, suficiente para 160dp de
  // largura sem sobrecarregar o render).
  bars?: number;
  // Altura total do componente (default 100% do container).
  height?: number;
}

// Hash 32 bits estilo FNV-1a — determinístico, rápido, sem lib.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Gera valor pseudo-aleatório no range [0,1) determinístico a partir
// de seed numérica. Usa LCG simples (Numerical Recipes).
function lcg(seed: number): number {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return next / 0xffffffff;
}

export function WaveformPreview({
  uri,
  bars = 28,
  height,
}: WaveformPreviewProps) {
  const seedBase = hashStr(uri || 'audio-default');

  // Gera alturas determinísticas. Mínimo 18% para não desaparecer;
  // máximo 100% para chegar até a borda.
  const alturas: number[] = [];
  let seed = seedBase;
  for (let i = 0; i < bars; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const r = lcg(seed);
    const pct = 0.18 + r * 0.82;
    alturas.push(pct);
  }

  return (
    <View
      style={{
        flex: height ? undefined : 1,
        height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bgElev,
        paddingHorizontal: 8,
      }}
      accessibilityRole="image"
      accessibilityLabel="waveform preview"
    >
      {alturas.map((h, idx) => (
        <View
          key={idx}
          style={{
            width: 2,
            height: `${h * 100}%`,
            backgroundColor: colors.cyan,
            borderRadius: 1,
            opacity: 0.85,
          }}
        />
      ))}
    </View>
  );
}
