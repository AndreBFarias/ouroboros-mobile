// SecaoProximos (M40). Mostra alarmes pessoais nas proximas 4h e
// tarefas com alarme vinculado ainda hoje, em lista compacta com
// hora a esquerda + titulo. Vazio: empty state breve.
//
// Sem badge de prioridade nem highlight de urgencia (ADR-0005).
// Apenas listagem cronologica.
//
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { Card, EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { useProximos } from '@/lib/hooks/useProximos';
import type { ItemProximo } from '@/lib/hooks/useProximos';

const ROTULO_TIPO: Record<ItemProximo['tipo'], string> = {
  alarme: 'Alarme',
  tarefa: 'Tarefa',
};

interface ItemProps {
  item: ItemProximo;
}

function Item({ item }: ItemProps) {
  const corBorda = item.tipo === 'alarme' ? colors.cyan : colors.purple;
  const tituloEstilo = {
    color: colors.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    lineHeight: 22,
    ...(item.feita ? { textDecorationLine: 'line-through' as const, color: colors.muted } : {}),
  };

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: corBorda,
        padding: spacing.base,
        flexDirection: 'row',
        gap: spacing.base,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 13,
          minWidth: 48,
        }}
      >
        {item.hora}
      </Text>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
        >
          {ROTULO_TIPO[item.tipo]}
        </Text>
        <Text style={tituloEstilo} numberOfLines={2}>
          {item.titulo}
        </Text>
      </View>
    </View>
  );
}

export function SecaoProximos() {
  const { itens, loading, error } = useProximos();

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Próximos
      </Text>
      {loading ? (
        <Card>
          <Text style={{ color: colors.muted, fontFamily: 'JetBrainsMono_400Regular' }}>
            Carregando...
          </Text>
        </Card>
      ) : error ? null : itens.length === 0 ? (
        <Card>
          <EmptyState frase="Nada nas próximas horas." />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {itens.map((item) => (
            <Item key={`${item.tipo}-${item.id}`} item={item} />
          ))}
        </View>
      )}
    </View>
  );
}
