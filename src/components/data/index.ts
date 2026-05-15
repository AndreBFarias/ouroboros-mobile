// Barrel de componentes data (visualizacoes). Importar via
// '@/components/data'.
export {
  HeatmapBase,
  PALETA_TREINOS,
  PALETA_HUMOR,
  montarCelulasUltimos91Dias,
} from './HeatmapBase';
export type {
  HeatmapBaseProps,
  HeatmapCell,
  HeatmapPaleta,
} from './HeatmapBase';
export { SparklineMedida } from './SparklineMedida';
export type {
  SparklineMedidaPoint,
  SparklineMedidaProps,
} from './SparklineMedida';
export {
  HumorHeatmap,
  HumorHeatmapSobreposto,
  HUMOR_COLOR_MAP,
  montarCelulasHumor91Dias,
} from './HumorHeatmap';
export type {
  HumorHeatmapProps,
  HumorHeatmapSobrepostoProps,
  HumorCelulaVisual,
  NivelHumor,
} from './HumorHeatmap';
export { HumorHeatmapStats } from './HumorHeatmapStats';
export type { HumorHeatmapStatsProps } from './HumorHeatmapStats';
