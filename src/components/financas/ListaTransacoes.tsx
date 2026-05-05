// Lista virtualizada das ultimas transacoes (M14, Tela 22). Cada
// linha mostra data DD/MM, destino (truncado), categoria muted e
// valor cyan (despesa) ou green (credito).
//
// Usa FlatList com initialNumToRender=20 e windowSize=5 para manter
// perf mesmo com volume futuro maior (decisao spec §10).
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';
import { textPropsDecor } from '@/lib/a11y/textPropsDecor';
import type { FinancasTransacao } from '@/lib/schemas/financas-cache';

interface ListaTransacoesProps {
  transacoes: FinancasTransacao[];
}

function formatarBRL(valor: number, tipo: FinancasTransacao['tipo']): string {
  const sinal = tipo === 'credito' ? '+' : '-';
  try {
    const fmt = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(valor));
    return `${sinal}${fmt}`;
  } catch {
    return `${sinal}R$ ${Math.abs(valor).toFixed(2).replace('.', ',')}`;
  }
}

function formatarDataDM(iso: string): string {
  // Espera YYYY-MM-DD; converte para DD/MM sem usar Date para evitar
  // surpresa de fuso horario.
  const partes = iso.split('-');
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}`;
}

function corValor(tipo: FinancasTransacao['tipo']): string {
  return tipo === 'credito' ? colors.green : colors.cyan;
}

interface LinhaProps {
  item: FinancasTransacao;
  ultima: boolean;
}

function LinhaTransacao({ item, ultima }: LinhaProps): ReactNode {
  return (
    <View
      style={{
        paddingVertical: spacing.sm,
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: colors.bgElev,
        gap: 2,
      }}
      accessibilityLabel={`transacao ${item.destino} ${item.tipo} ${item.valor.toFixed(2)}`}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {item.destino}
        </Text>
        <Text
          style={{
            color: corValor(item.tipo),
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
          }}
        >
          {formatarBRL(item.valor, item.tipo)}
        </Text>
      </View>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight:
              typography.caption.size * typography.caption.lineHeight,
          }}
        >
          {formatarDataDM(item.data)} · {item.categoria}
        </Text>
        <Text
          {...textPropsDecor()}
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight:
              typography.caption.size * typography.caption.lineHeight,
          }}
        >
          {item.autor === 'pessoa_a' ? 'A' : 'B'}
        </Text>
      </View>
    </View>
  );
}

export function ListaTransacoes({
  transacoes,
}: ListaTransacoesProps): ReactNode {
  if (!transacoes || transacoes.length === 0) {
    return (
      <Card>
        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: colors.orange,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: typography.heading2.size,
              lineHeight:
                typography.heading2.size * typography.heading2.lineHeight,
            }}
          >
            Últimas transações
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.body.size,
              lineHeight: typography.body.size * typography.body.lineHeight,
            }}
          >
            Sem transações no período.
          </Text>
        </View>
      </Card>
    );
  }

  const dados = transacoes.slice(0, 20);

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.heading2.size,
            lineHeight:
              typography.heading2.size * typography.heading2.lineHeight,
          }}
        >
          Últimas transações
        </Text>

        <FlatList
          data={dados}
          keyExtractor={(item, idx) => `${item.data}-${item.destino}-${idx}`}
          initialNumToRender={20}
          windowSize={5}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <LinhaTransacao item={item} ultima={index === dados.length - 1} />
          )}
        />
      </View>
    </Card>
  );
}
