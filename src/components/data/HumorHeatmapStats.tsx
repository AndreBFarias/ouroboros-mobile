// Stats do MiniHumor (Tela 21). Exibe "Media 30d: X,Y" em cyan e
// "Registros: N / 30" em muted. Em modo sobreposto, mostra duas
// linhas (uma por pessoa). Numeros vem direto do bloco
// estatisticas[pessoa] do cache.
//
// Caption muted abaixo da media documenta a decisao spec §10:
// media calculada apenas em dias com registro (evita penalizar
// hiatos).
//
// Comentarios sem acento (convencao shell/CI).
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import type { HumorHeatmapEstatistica } from '@/lib/schemas/humor_heatmap_cache';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

const NOMES_CURTOS: Record<PessoaAutor, string> = {
  pessoa_a: 'A',
  pessoa_b: 'B',
};

interface LinhaStatsProps {
  rotulo: string;
  stats: HumorHeatmapEstatistica;
}

function LinhaStats({ rotulo, stats }: LinhaStatsProps): ReactNode {
  const mediaTexto =
    stats.registros_30d === 0
      ? '—'
      : stats.media_humor_30d.toFixed(1).replace('.', ',');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.md,
      }}
      accessibilityLabel={`stats humor ${rotulo}`}
    >
      <Text
        style={{
          color: colors.cyan,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {rotulo}Média 30d: {mediaTexto}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        Registros: {stats.registros_30d} / 30
      </Text>
    </View>
  );
}

export interface HumorHeatmapStatsProps {
  // Modo individual: passa estatistica unica.
  // Modo sobreposto: passa as duas (pessoa_a e pessoa_b).
  pessoaA?: HumorHeatmapEstatistica;
  pessoaB?: HumorHeatmapEstatistica;
  modo: PessoaAutor | 'sobreposto';
}

export function HumorHeatmapStats({
  pessoaA,
  pessoaB,
  modo,
}: HumorHeatmapStatsProps): ReactNode {
  return (
    <View style={{ gap: spacing.sm }}>
      {modo === 'pessoa_a' && pessoaA ? (
        <LinhaStats rotulo="" stats={pessoaA} />
      ) : null}
      {modo === 'pessoa_b' && pessoaB ? (
        <LinhaStats rotulo="" stats={pessoaB} />
      ) : null}
      {modo === 'sobreposto' && pessoaA && pessoaB ? (
        <>
          <LinhaStats rotulo={`${NOMES_CURTOS.pessoa_a} · `} stats={pessoaA} />
          <LinhaStats rotulo={`${NOMES_CURTOS.pessoa_b} · `} stats={pessoaB} />
        </>
      ) : null}
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 11,
          lineHeight: 14,
        }}
      >
        Média considera apenas dias com registro.
      </Text>
    </View>
  );
}
