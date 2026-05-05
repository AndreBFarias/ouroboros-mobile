// Secao Crises do Recap (M36). Cards borda red discreta, ordenados
// por intensidade desc. Microcopy "Você passou por isso e está aqui."
// (ADR-0005: valida sem celebrar; sem motivacional eufórico).
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { AlertTriangle } from '@/lib/icons';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { CriseItem } from '@/lib/hooks/useRecap';

interface Props {
  itens: CriseItem[];
}

export function RecapSecaoCrises({ itens }: Props) {
  if (itens.length === 0) return null;

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao crises">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Crises
      </Text>
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          color: colors.muted,
          lineHeight: 20,
        }}
      >
        Você passou por isso e está aqui.
      </Text>
      {itens.map((item) => (
        <View key={item.id} accessibilityLabel={`crise ${item.id}`}>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                borderLeftWidth: 2,
                borderLeftColor: colors.red,
                paddingLeft: 12,
              }}
            >
              <AlertTriangle
                size={20}
                color={colors.red}
                strokeWidth={1.5}
              />
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
