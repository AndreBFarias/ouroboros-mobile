// SecaoDiariosEventosAgrupado (M40). Substitui as duas listas
// separadas (Diario emocional + Eventos) por uma timeline cronologica
// unica, ordenada por hora descendente. Cor da borda esquerda
// diferencia o registro:
//   - diario.modo === 'trigger'   -> red
//   - diario.modo === 'reflexao'  -> cyan (G2.1, anotacao contemplativa)
//   - diario.modo === 'vitoria'   -> green (anonimato-allow: substantivo)
//   - evento.modo === 'positivo'  -> green
//   - evento.modo !== 'positivo'  -> red (negativo)
//
// Vazio: empty state breve.
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Card, EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';

type ItemTimeline =
  | { tipo: 'diario'; meta: DiarioEmocionalMeta; iso: string }
  | { tipo: 'evento'; meta: EventoMeta; iso: string };

interface SecaoProps {
  diarios: DiarioEmocionalMeta[];
  eventos: EventoMeta[];
  loading: boolean;
}

function horaDeIso(iso: string): string {
  return iso.slice(11, 16);
}

export function SecaoDiariosEventosAgrupado({
  diarios,
  eventos,
  loading,
}: SecaoProps) {
  const itens: ItemTimeline[] = useMemo(() => {
    const arr: ItemTimeline[] = [];
    for (const d of diarios) arr.push({ tipo: 'diario', meta: d, iso: d.data });
    for (const e of eventos) arr.push({ tipo: 'evento', meta: e, iso: e.data });
    // Ordenacao desc (mais recente primeiro). String ISO compara
    // lex == cronologico para um mesmo fuso.
    arr.sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0));
    return arr;
  }, [diarios, eventos]);

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Esta jornada
      </Text>
      {loading ? null : itens.length === 0 ? (
        <Card>
          <EmptyState frase="Nada hoje. Tudo bem." />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {itens.map((it, idx) => (
            <ItemLinha key={`${it.tipo}-${it.iso}-${idx}`} item={it} />
          ))}
        </View>
      )}
    </View>
  );
}

interface ItemLinhaProps {
  item: ItemTimeline;
}

function ItemLinha({ item }: ItemLinhaProps) {
  let corBorda: string = colors.green;
  let rotulo = 'Diário';
  let titulo = '';
  let detalhe = '';

  if (item.tipo === 'diario') {
    // G2.1: 3 cores por modo do diario emocional. Reflexao (modo
    // contemplativo introduzido em G2) ganha cyan, coerente com os
    // chips accent cyan da paleta de emocoes.
    if (item.meta.modo === 'trigger') corBorda = colors.red;
    else if (item.meta.modo === 'reflexao') corBorda = colors.cyan;
    else corBorda = colors.green;
    rotulo = 'Diário';
    titulo = item.meta.texto;
  } else {
    corBorda = item.meta.modo === 'positivo' ? colors.green : colors.red;
    rotulo = 'Evento';
    titulo = item.meta.categoria ?? 'Evento';
    const partes: string[] = [];
    if (item.meta.lugar) partes.push(item.meta.lugar);
    if (item.meta.bairro) partes.push(item.meta.bairro);
    detalhe = partes.join(' · ');
  }

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: corBorda,
        padding: spacing.base,
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        {horaDeIso(item.iso)} · {rotulo}
        {detalhe ? ` · ${detalhe}` : ''}
      </Text>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
          lineHeight: 22,
        }}
        numberOfLines={2}
      >
        {titulo}
      </Text>
    </View>
  );
}
