// Secao Numeros do Recap (M36). Grid 2x3 com numero grande + label
// neutro. ADR-0005: sem emoji, sem comparativo (X% melhor), so o
// numero e o que ele representa.
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { NumerosRecap } from '@/lib/hooks/useRecap';

interface Props {
  numeros: NumerosRecap;
}

interface CardNumero {
  rotulo: string;
  valor: number;
}

export function RecapSecaoNumeros({ numeros }: Props) {
  const cards: CardNumero[] = [
    { rotulo: 'Registros', valor: numeros.registros },
    { rotulo: 'Treinos', valor: numeros.treinos },
    { rotulo: 'Fotos', valor: numeros.fotos },
    { rotulo: 'Eventos positivos', valor: numeros.eventos_positivos },
    { rotulo: 'Eventos difíceis', valor: numeros.eventos_negativos },
    { rotulo: 'Tarefas concluídas', valor: numeros.tarefas_concluidas },
  ];

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao numeros">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Números
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {cards.map((card) => (
          <View
            key={card.rotulo}
            style={{ width: '48%' }}
            accessibilityLabel={`numero ${card.rotulo}`}
          >
            <Card>
              <View style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}>
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 28,
                    color: colors.fg,
                  }}
                >
                  {card.valor}
                </Text>
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    color: colors.muted,
                    textAlign: 'center',
                    lineHeight: 18,
                  }}
                >
                  {card.rotulo}
                </Text>
              </View>
            </Card>
          </View>
        ))}
      </View>
    </View>
  );
}
