// Secao Conquistas do Recap (M36). Lista cards com borda verde
// discreta, icone por origem (vitoria, marco, contador, tarefa) e
// frase neutra. ADR-0005: sem celebracao, sem badge, sem confetti.
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { Heart, Trophy, Hash, ListChecks, Sparkles } from '@/lib/icons';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { ConquistaItem } from '@/lib/hooks/useRecap';

interface Props {
  itens: ConquistaItem[];
}

function iconeDe(origem: ConquistaItem['origem']) {
  if (origem === 'diario_vitoria') return Heart;
  if (origem === 'evento_positivo') return Sparkles;
  if (origem === 'marco') return Trophy;
  if (origem === 'contador_sequencia') return Hash;
  return ListChecks;
}

export function RecapSecaoConquistas({ itens }: Props) {
  if (itens.length === 0) return null;

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao conquistas">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Conquistas
      </Text>
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          color: colors.muted,
          lineHeight: 20,
        }}
      >
        Você teve {itens.length}{' '}
        {itens.length === 1 ? 'conquista' : 'conquistas'} no período.
      </Text>
      {itens.map((item) => {
        const Icone = iconeDe(item.origem);
        return (
          <View key={item.id} accessibilityLabel={`conquista ${item.id}`}>
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderLeftWidth: 2,
                  borderLeftColor: colors.green,
                  paddingLeft: 12,
                }}
              >
                <Icone size={20} color={colors.green} strokeWidth={1.5} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 14,
                    color: colors.fg,
                    lineHeight: 22,
                  }}
                >
                  {item.frase}
                </Text>
              </View>
            </Card>
          </View>
        );
      })}
    </View>
  );
}
