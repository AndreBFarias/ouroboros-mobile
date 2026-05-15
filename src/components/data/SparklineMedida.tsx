// Sparkline de evolucao de uma medida corporal ao longo do tempo.
// Recebe array de pontos {data: 'YYYY-MM-DD', valor: number} (max 12
// pontos exibidos) e renderiza polyline cyan com fill 30% abaixo
// para dar peso visual leve. Sem cores positivo/negativo (ADR-0005):
// a tonalidade não muda quando o valor sobe ou cai.
//
// Caller fornece largura em pixels. Altura padrao 48dp para caber
// dentro de um Card 2 colunas. Quando ha menos de 2 pontos, mostra
// texto muted "Aguardando mais registros." centralizado.
//
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import Svg, { Polyline, Polygon } from 'react-native-svg';
import { colors } from '@/theme/tokens';

export interface SparklineMedidaPoint {
  // YYYY-MM-DD da medida.
  data: string;
  // Valor numerico. Caller filtra pontos sem valor antes de passar.
  valor: number;
}

export interface SparklineMedidaProps {
  pontos: SparklineMedidaPoint[];
  largura: number;
  altura?: number;
  // Quantos pontos exibir (default 12). Pega os mais recentes.
  maxPontos?: number;
}

const PADDING_X = 4;
const PADDING_Y = 4;

export function SparklineMedida({
  pontos,
  largura,
  altura = 48,
  maxPontos = 12,
}: SparklineMedidaProps) {
  const dados = pontos.slice(-maxPontos);

  // Empty state - menos de 2 pontos não forma sparkline útil.
  if (dados.length < 2) {
    return (
      <View
        style={{
          height: altura,
          width: largura,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="text"
        accessibilityLabel="aguardando mais registros"
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 16,
            textAlign: 'center',
          }}
        >
          Aguardando mais registros.
        </Text>
      </View>
    );
  }

  const valores = dados.map((d) => d.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min === 0 ? 1 : max - min;

  const w = Math.max(0, largura - PADDING_X * 2);
  const h = Math.max(0, altura - PADDING_Y * 2);

  const xs = dados.map((_, i) => PADDING_X + (i / (dados.length - 1)) * w);
  const ys = dados.map((d) => PADDING_Y + h - ((d.valor - min) / range) * h);

  const polyPoints = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  // Polygon de fill: linha + dois cantos inferiores formam area
  // fechada para a opacidade 30% sob a linha.
  const fillPoints = `${polyPoints} ${xs[xs.length - 1]},${altura - PADDING_Y} ${xs[0]},${altura - PADDING_Y}`;

  return (
    <View
      style={{ width: largura, height: altura }}
      accessibilityRole="text"
      accessibilityLabel={`grafico medida ${dados.length} pontos`}
    >
      <Svg width={largura} height={altura}>
        <Polygon points={fillPoints} fill={colors.cyan} fillOpacity={0.18} />
        <Polyline
          points={polyPoints}
          fill="none"
          stroke={colors.cyan}
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  );
}
