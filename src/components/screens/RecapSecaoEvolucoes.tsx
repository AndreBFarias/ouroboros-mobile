// Secao Evolucoes do Recap (M36). Cards cyan discretos com rotulo +
// detalhe. Inclui humor medio, treinos no periodo, contadores em alta.
// Sem grafico complexo nesta versao; o spec original previa sparkline,
// mas o detalhe textual ja entrega o numero — mantemos simples para
// evitar dependencia visual nao validada em producao.
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { TrendingUp } from '@/lib/icons';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { EvolucaoItem } from '@/lib/hooks/useRecap';

interface Props {
  itens: EvolucaoItem[];
}

export function RecapSecaoEvolucoes({ itens }: Props) {
  if (itens.length === 0) return null;

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao evolucoes">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Evoluções
      </Text>
      {itens.map((item) => (
        <View key={item.id} accessibilityLabel={`evolucao ${item.id}`}>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                borderLeftWidth: 2,
                borderLeftColor: colors.cyan,
                paddingLeft: 12,
              }}
            >
              <TrendingUp size={20} color={colors.cyan} strokeWidth={1.5} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 14,
                    color: colors.fg,
                    lineHeight: 22,
                  }}
                >
                  {item.rotulo}
                </Text>
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    color: colors.muted,
                    lineHeight: 18,
                  }}
                >
                  {item.detalhe}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      ))}
    </View>
  );
}
