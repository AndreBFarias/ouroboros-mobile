// Secao Reflexoes do Recap (G2.1). Cards borda cyan discreta, ordenados
// por data desc. Tom respeitoso (ADR-0005): sem motivacional, sem
// gamificacao, sem celebracao — reflexao e anotacao contemplativa
// neutra, terceiro modo do diario emocional ao lado de trigger e
// vitoria (anonimato-allow: substantivo).
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { MessageCircle } from '@/lib/icons';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { ReflexaoItem } from '@/lib/hooks/useRecap';

interface Props {
  itens: ReflexaoItem[];
}

export function RecapSecaoReflexoes({ itens }: Props) {
  if (itens.length === 0) return null;

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao reflexoes">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Reflexões
      </Text>
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          color: colors.muted,
          lineHeight: 20,
        }}
      >
        Você teve {itens.length} {itens.length === 1 ? 'reflexão' : 'reflexões'}{' '}
        no período.
      </Text>
      {itens.map((item) => (
        <View key={item.id} accessibilityLabel={`reflexao ${item.id}`}>
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
              <MessageCircle size={20} color={colors.cyan} strokeWidth={1.5} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 14,
                    color: colors.fg,
                    lineHeight: 22,
                  }}
                >
                  {item.frase}
                </Text>
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  Intensidade {item.intensidade} de 5
                </Text>
              </View>
            </View>
          </Card>
        </View>
      ))}
    </View>
  );
}
