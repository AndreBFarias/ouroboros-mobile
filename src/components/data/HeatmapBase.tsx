// HeatmapBase - grid 13 colunas x 7 linhas (91 dias) renderizando
// celulas com cor variavel por nível. Componente abstrato com prop
// `paleta` (intensidade -> hex) para que tabs especificas (treinos,
// humor) injetem suas cores. Hoje destacado em outline purple 2px.
//
// Stagger de entrada: 50ms entre celulas, max 600ms total. Spring
// default para o scale de aparicao.
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { colors, spacing } from '@/theme/tokens';

export interface HeatmapCell {
  // ISO YYYY-MM-DD da celula. Útil para tap callback.
  data: string;
  // Intensidade 0..3 (0 = vazio, 1 = baixo, 2 = medio, 3 = alto).
  // Caller agrega contagem por dia e mapeia.
  intensidade: 0 | 1 | 2 | 3;
  // True quando data === hoje. Recebe outline purple.
  hoje?: boolean;
}

// Mapa intensidade -> hex. Indices 0..3.
export type HeatmapPaleta = readonly [string, string, string, string];

// Paleta verde (treinos). Intensidade 0 = bg-elev (sem treino),
// 1 = green 30%, 2 = green 60%, 3 = green 100%.
export const PALETA_TREINOS: HeatmapPaleta = [
  '#44475a',
  '#1e3a25',
  '#2c8a4a',
  colors.green,
] as const;

// Paleta humor (escala emocional). Intensidade 0 = bg-elev, demais
// graduam de amarelo claro -> verde forte para humor positivo. Spec
// futura M10 pode refinar.
export const PALETA_HUMOR: HeatmapPaleta = [
  '#44475a',
  '#5a4a3c',
  '#a07e4c',
  colors.green,
] as const;

const NUM_COLUNAS = 13;
const NUM_LINHAS = 7;
const TOTAL_CELULAS = NUM_COLUNAS * NUM_LINHAS; // 91

// Stagger maximo total para não demorar demais no boot da tela.
const STAGGER_MS = 50;
const STAGGER_CAP_MS = 600;

export interface HeatmapBaseProps {
  // Lista esperada com 91 celulas em ordem cronologica (mais antigo
  // primeiro). Caller preenche dias sem dado com intensidade 0.
  celulas: HeatmapCell[];
  paleta: HeatmapPaleta;
  // Callback opcional. Caller recebe a celula clicada (data + valor).
  onCelulaPress?: (cel: HeatmapCell) => void;
  // accessibilityLabel gerado a partir da paleta para distinguir
  // treinos / humor. Default 'heatmap'.
  accessibilityLabel?: string;
  // Tamanho lateral de cada celula em dp. Default 14.
  cellSize?: number;
}

function delayParaIndice(idx: number): number {
  const d = idx * STAGGER_MS;
  return d > STAGGER_CAP_MS ? STAGGER_CAP_MS : d;
}

export function HeatmapBase({
  celulas,
  paleta,
  onCelulaPress,
  accessibilityLabel = 'heatmap',
  cellSize = 14,
}: HeatmapBaseProps): ReactNode {
  // Garante exatamente 91 celulas mesmo se caller fornecer a menos.
  const lista = useMemo(() => {
    if (celulas.length === TOTAL_CELULAS) return celulas;
    const padded: HeatmapCell[] = [...celulas];
    while (padded.length < TOTAL_CELULAS) {
      padded.push({ data: '', intensidade: 0 });
    }
    return padded.slice(0, TOTAL_CELULAS);
  }, [celulas]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'column',
        gap: spacing.xs,
      }}
    >
      {Array.from({ length: NUM_LINHAS }).map((_, linha) => (
        <View
          key={`linha-${linha}`}
          style={{ flexDirection: 'row', gap: spacing.xs }}
        >
          {Array.from({ length: NUM_COLUNAS }).map((__, col) => {
            const idx = linha * NUM_COLUNAS + col;
            const cel = lista[idx];
            const cor = paleta[cel.intensidade];
            const handle = onCelulaPress ? () => onCelulaPress(cel) : undefined;
            const labelA11y = cel.data
              ? `celula ${cel.data} intensidade ${cel.intensidade}`
              : 'celula vazia';
            const inner = (
              <MotiView
                from={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...springs.default, delay: delayParaIndice(idx) }}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 3,
                  backgroundColor: cor,
                  borderWidth: cel.hoje ? 2 : 0,
                  borderColor: cel.hoje ? colors.purple : 'transparent',
                }}
              />
            );

            if (!handle) {
              return (
                <View
                  key={`cel-${idx}`}
                  accessibilityRole="none"
                  accessibilityLabel={labelA11y}
                >
                  {inner}
                </View>
              );
            }
            return (
              <Pressable
                key={`cel-${idx}`}
                onPress={handle}
                accessibilityRole="button"
                accessibilityLabel={labelA11y}
                hitSlop={4}
              >
                {inner}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Helper: dado um conjunto de datas YYYY-MM-DD com contagem, devolve
// 91 celulas em ordem cronologica de hoje-90 até hoje. Caller passa o
// mapa { 'YYYY-MM-DD': count } e o mapeamento count -> intensidade.
//
// Mapeamento default: 0 -> 0, 1 -> 1, 2 -> 2, 3+ -> 3.
export function montarCelulasUltimos91Dias(
  contagensPorDia: Record<string, number>,
  hoje: Date = new Date()
): HeatmapCell[] {
  const out: HeatmapCell[] = [];
  const TZ_OFFSET_MIN = -180;
  const hojeLocal = new Date(hoje.getTime() + TZ_OFFSET_MIN * 60_000);
  const ymdHoje = `${hojeLocal.getUTCFullYear()}-${String(
    hojeLocal.getUTCMonth() + 1
  ).padStart(2, '0')}-${String(hojeLocal.getUTCDate()).padStart(2, '0')}`;

  for (let i = TOTAL_CELULAS - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const local = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
    const ymd = `${local.getUTCFullYear()}-${String(
      local.getUTCMonth() + 1
    ).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;
    const count = contagensPorDia[ymd] ?? 0;
    const intensidade: 0 | 1 | 2 | 3 =
      count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
    out.push({
      data: ymd,
      intensidade,
      hoje: ymd === ymdHoje,
    });
  }
  return out;
}
