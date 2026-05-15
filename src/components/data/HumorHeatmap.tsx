// HumorHeatmap (Tela 21). Grid 13 colunas x 7 linhas representando os
// ultimos 91 dias. Diferente do HeatmapBase de treinos (intensidade
// 0..3), aqui cada celula carrega o nivel de humor 1..5 declarado
// pelo usuario; sem registro = bg-elev. Stagger de entrada igual ao
// padrao M11 (50ms entre celulas, max 600ms).
//
// Suporta modo 'sobreposto' (M10): caller passa duas listas de
// celulas (uma por pessoa) e o componente renderiza ambas com 50%
// opacity em layers absolutos sobrepostos.
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { colors, spacing } from '@/theme/tokens';

// Nivel de humor 0 = sem registro, 1..5 = sliders do schema humor.
export type NivelHumor = 0 | 1 | 2 | 3 | 4 | 5;

export interface HumorCelulaVisual {
  // ISO YYYY-MM-DD da celula. Usado como callback key.
  data: string;
  nivel: NivelHumor;
  hoje?: boolean;
}

const NUM_COLUNAS = 13;
const NUM_LINHAS = 7;
const TOTAL_CELULAS = NUM_COLUNAS * NUM_LINHAS; // 91
const STAGGER_MS = 50;
const STAGGER_CAP_MS = 600;
const TZ_OFFSET_MIN = -180; // UTC-3 fixo (Sao Paulo)

// Mapa de cores conforme spec M10 (BRIEFING §6 D). Sem registro fica
// no token bg-elev solido. Demais niveis aplicam opacidade direta no
// canal alpha do RGBA derivado do hex Dracula.
//
// Implementacao: rgba(<r>,<g>,<b>,<a>) computado uma vez em modulo.
function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${r},${g},${b},${a})`;
}

export const HUMOR_COLOR_MAP: Record<NivelHumor, string> = {
  0: colors.bgElev,
  1: hexToRgba(colors.red, 0.7),
  2: hexToRgba(colors.orange, 0.6),
  3: hexToRgba(colors.yellow, 0.6),
  4: hexToRgba(colors.cyan, 0.7),
  5: colors.green,
};

function delayParaIndice(idx: number): number {
  const d = idx * STAGGER_MS;
  return d > STAGGER_CAP_MS ? STAGGER_CAP_MS : d;
}

// Helper de uso publico: dado o array de celulas do cache (com
// {data, autor, humor, ...}), agrupa por dia tomando a media inteira
// de humor por data e devolve 91 celulas em ordem cronologica de
// hoje-90 ate hoje. Caller que esta em modo individual ja filtrou
// pessoa antes (via filtrarCelulasPorPessoa do hook).
export function montarCelulasHumor91Dias(
  registros: ReadonlyArray<{ data: string; humor: number }>,
  hoje: Date = new Date()
): HumorCelulaVisual[] {
  // Agrega por dia. Quando ha mais de um registro na mesma data,
  // usa a media arredondada (mantem nivel 1..5).
  const somaPorDia: Record<string, { soma: number; n: number }> = {};
  for (const r of registros) {
    const acc = somaPorDia[r.data] ?? { soma: 0, n: 0 };
    acc.soma += r.humor;
    acc.n += 1;
    somaPorDia[r.data] = acc;
  }

  const hojeLocal = new Date(hoje.getTime() + TZ_OFFSET_MIN * 60_000);
  const ymdHoje = `${hojeLocal.getUTCFullYear()}-${String(
    hojeLocal.getUTCMonth() + 1
  ).padStart(2, '0')}-${String(hojeLocal.getUTCDate()).padStart(2, '0')}`;

  const out: HumorCelulaVisual[] = [];
  for (let i = TOTAL_CELULAS - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const local = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
    const ymd = `${local.getUTCFullYear()}-${String(
      local.getUTCMonth() + 1
    ).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;
    const agg = somaPorDia[ymd];
    let nivel: NivelHumor = 0;
    if (agg && agg.n > 0) {
      const media = Math.round(agg.soma / agg.n);
      // Garante 1..5 para nivel positivo; clamp defensivo.
      nivel = Math.max(1, Math.min(5, media)) as NivelHumor;
    }
    out.push({ data: ymd, nivel, hoje: ymd === ymdHoje });
  }
  return out;
}

export interface HumorHeatmapProps {
  // Lista esperada de 91 celulas em ordem cronologica. Caller
  // preenche dias sem registro com nivel 0.
  celulas: HumorCelulaVisual[];
  onCelulaPress?: (cel: HumorCelulaVisual) => void;
  accessibilityLabel?: string;
  // Tamanho lateral de cada celula em dp. Default 14.
  cellSize?: number;
  // Opacidade global aplicada ao layer (modo sobreposto pede 0.5).
  opacity?: number;
  // Quando true, desabilita stagger inicial (caller ja anima parent).
  semStagger?: boolean;
}

export function HumorHeatmap({
  celulas,
  onCelulaPress,
  accessibilityLabel = 'heatmap de humor',
  cellSize = 14,
  opacity = 1,
  semStagger = false,
}: HumorHeatmapProps): ReactNode {
  // Garante exatamente 91 celulas mesmo se caller fornecer a menos.
  const lista = useMemo(() => {
    if (celulas.length === TOTAL_CELULAS) return celulas;
    const padded: HumorCelulaVisual[] = [...celulas];
    while (padded.length < TOTAL_CELULAS) {
      padded.push({ data: '', nivel: 0 });
    }
    return padded.slice(0, TOTAL_CELULAS);
  }, [celulas]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'column',
        gap: spacing.xs,
        opacity,
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
            const cor = HUMOR_COLOR_MAP[cel.nivel];
            const handle = onCelulaPress ? () => onCelulaPress(cel) : undefined;
            const labelA11y = cel.data
              ? `celula ${cel.data} humor ${cel.nivel}`
              : 'celula vazia';
            const inner = (
              <MotiView
                from={semStagger ? undefined : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  ...springs.default,
                  delay: semStagger ? 0 : delayParaIndice(idx),
                }}
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

// Layer composto para modo sobreposto. Renderiza dois HumorHeatmap
// empilhados (pessoa_a por baixo, pessoa_b por cima) com 50%
// opacity cada. Tap em qualquer ponto delega ao callback unico
// passando a celula da camada superior; consumer resolve dia.
export interface HumorHeatmapSobrepostoProps {
  celulasA: HumorCelulaVisual[];
  celulasB: HumorCelulaVisual[];
  onCelulaPress?: (data: string) => void;
  cellSize?: number;
}

export function HumorHeatmapSobreposto({
  celulasA,
  celulasB,
  onCelulaPress,
  cellSize = 14,
}: HumorHeatmapSobrepostoProps): ReactNode {
  // Layer A (pessoa_a) por baixo, sem onPress proprio. Layer B
  // (pessoa_b) por cima, recebe taps e devolve a data. cellSize
  // mantido igual para alinhamento exato dos quadrados.
  return (
    <View accessibilityLabel="heatmap sobreposto pessoa a e b">
      <HumorHeatmap
        celulas={celulasA}
        accessibilityLabel="layer pessoa a"
        cellSize={cellSize}
        opacity={0.5}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
        }}
      >
        <HumorHeatmap
          celulas={celulasB}
          accessibilityLabel="layer pessoa b"
          cellSize={cellSize}
          opacity={0.5}
          semStagger
          onCelulaPress={
            onCelulaPress
              ? (cel) => {
                  if (cel.data) onCelulaPress(cel.data);
                }
              : undefined
          }
        />
      </View>
    </View>
  );
}
