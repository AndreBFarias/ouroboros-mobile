// Sparkline de evolucao de carga (kg) ao longo do tempo. Recebe
// array de HistoricoExecucao (max 12 pontos exibidos) e renderiza
// linha cyan com pontos. Tap em um ponto exibe pill cyan acima com
// "<DD/MM>: <carga> kg, <series>x<reps>". Pill some apos 2s.
//
// Caller fornece largura em pixels (rolar com a tela). Altura fixa
// 56dp para alinhar com cards padroes do projeto.
//
// Empty state quando lista vazia: linha pontilhada muted-decor com
// label "Sem histórico" centralizada.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import type { HistoricoExecucao } from '@/lib/schemas/exercicio';

interface HistoricoSparklineProps {
  historico: HistoricoExecucao[];
  largura: number;
  altura?: number;
  // Quantos pontos exibir (default 12). Caller geralmente passa mais
  // dados e o componente corta ao final.
  maxPontos?: number;
}

const PADDING_X = 6;
const PADDING_Y = 8;

// Formata data ISO em DD/MM (curto para tooltip pill).
function formatDM(iso: string): string {
  // Pula validacao defensiva: caller passa string valida do schema.
  // Captura YYYY-MM-DD prefixo.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}`;
}

export function HistoricoSparkline({
  historico,
  largura,
  altura = 56,
  maxPontos = 12,
}: HistoricoSparklineProps) {
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  // Esconde tooltip apos 2s. Reset a cada novo tap.
  useEffect(() => {
    if (tooltipIdx === null) return;
    const t = setTimeout(() => setTooltipIdx(null), 2000);
    return () => clearTimeout(t);
  }, [tooltipIdx]);

  // Pega os ultimos N pontos (mais recentes).
  const dados = historico.slice(-maxPontos);
  const semDados = dados.length === 0;

  if (semDados) {
    return (
      <View
        style={{
          height: altura,
          width: largura,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="text"
        accessibilityLabel="sem historico"
      >
        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          Sem histórico
        </Text>
      </View>
    );
  }

  // Calcula min/max de carga para normalizar y. Se todos iguais,
  // mantem linha no meio.
  const valores = dados.map((d) => d.carga);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min === 0 ? 1 : max - min;

  // Largura util (descontando padding lateral).
  const w = Math.max(0, largura - PADDING_X * 2);
  const h = Math.max(0, altura - PADDING_Y * 2);

  // Mapeia indice -> coordenada x. Quando ha 1 ponto so, fixa no meio.
  const xs = dados.map((_, i) =>
    dados.length === 1
      ? PADDING_X + w / 2
      : PADDING_X + (i / (dados.length - 1)) * w
  );
  const ys = dados.map((d) => PADDING_Y + h - ((d.carga - min) / range) * h);

  const polyPoints = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  const tooltipText =
    tooltipIdx !== null && dados[tooltipIdx]
      ? `${formatDM(dados[tooltipIdx].data)}: ${dados[tooltipIdx].carga} kg, ${dados[tooltipIdx].series}x${dados[tooltipIdx].reps}`
      : '';

  // Posicao do tooltip: tenta centralizar no ponto. Garante que nao
  // estoure os limites laterais.
  const tooltipX =
    tooltipIdx !== null
      ? Math.max(PADDING_X, Math.min(largura - 120 - PADDING_X, xs[tooltipIdx] - 60))
      : 0;

  return (
    <View
      style={{ width: largura, height: altura + 28 }}
      accessibilityRole="text"
      accessibilityLabel={`grafico historico ${dados.length} pontos`}
    >
      {/* Tooltip pill */}
      {tooltipIdx !== null ? (
        <MotiView
          from={{ opacity: 0, translateY: 4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={springs.subtle}
          style={{
            position: 'absolute',
            top: 0,
            left: tooltipX,
            backgroundColor: colors.cyan,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 14,
            zIndex: 2,
          }}
        >
          <Text
            style={{
              color: colors.bg,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 11,
              lineHeight: 16,
            }}
          >
            {tooltipText}
          </Text>
        </MotiView>
      ) : null}

      {/* Sparkline */}
      <View style={{ marginTop: 22 }}>
        <Svg width={largura} height={altura}>
          {/* Linha de base muted-decor para referencia. */}
          <Line
            x1={PADDING_X}
            x2={largura - PADDING_X}
            y1={altura - PADDING_Y}
            y2={altura - PADDING_Y}
            stroke={colors.bgElev}
            strokeWidth={1}
            strokeDasharray="2,3"
          />
          <Polyline
            points={polyPoints}
            fill="none"
            stroke={colors.cyan}
            strokeWidth={1.5}
          />
          {xs.map((x, i) => (
            <Circle
              key={i}
              cx={x}
              cy={ys[i]}
              r={3}
              fill={colors.cyan}
            />
          ))}
        </Svg>
        {/* Pontos toucaveis em camada superior. Usa View porque
            React Native Svg nao expoe onPress de forma confiavel
            cross-platform. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: largura,
            height: altura,
            flexDirection: 'row',
          }}
        >
          {xs.map((x, i) => (
            <Pressable
              key={i}
              onPress={() => {
                haptics.selection();
                setTooltipIdx(i);
              }}
              accessibilityRole="button"
              accessibilityLabel={`ponto ${i + 1}`}
              style={{
                position: 'absolute',
                left: x - 12,
                top: ys[i] - 12,
                width: 24,
                height: 24,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
