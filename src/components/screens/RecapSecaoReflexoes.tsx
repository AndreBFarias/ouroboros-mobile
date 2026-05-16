// Secao Reflexoes do Recap (G2.1). Cards borda cyan discreta, ordenados
// por data desc. Tom respeitoso (ADR-0005): sem motivacional, sem
// gamificacao, sem celebracao — reflexao e anotacao contemplativa
// neutra, terceiro modo do diario emocional ao lado de trigger e
// vitoria (anonimato-allow: substantivo).
//
// R-RECAP-1 (2026-05-16): cada card vira Pressable que navega para
// /diario-emocional?slug=<id> (mesma rota canonica usada por
// recap-lista para reflexoes).
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle } from '@/lib/icons';
import { Card, useToast } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { destinoReflexao } from '@/lib/recap/destinos';
import type { ReflexaoItem } from '@/lib/hooks/useRecap';

interface Props {
  itens: ReflexaoItem[];
}

export function RecapSecaoReflexoes({ itens }: Props) {
  const router = useRouter();
  const toast = useToast();
  if (itens.length === 0) return null;

  const abrir = (item: ReflexaoItem) => {
    const destino = destinoReflexao(item);
    if (!destino) {
      void haptics.selection();
      toast.show('Edição em breve.', 'info');
      return;
    }
    void haptics.light();
    router.push({
      pathname: destino.pathname as never,
      params: destino.params,
    });
  };

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
        <Pressable
          key={item.id}
          onPress={() => abrir(item)}
          accessibilityRole="button"
          accessibilityLabel={`reflexao ${item.id}`}
        >
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
        </Pressable>
      ))}
    </View>
  );
}
