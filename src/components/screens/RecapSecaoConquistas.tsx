// Secao Conquistas do Recap (M36). Lista cards com borda verde
// discreta, icone por origem (vitoria, marco, contador, tarefa) e
// frase neutra. ADR-0005: sem celebracao, sem badge, sem confetti.
//
// R-RECAP-1 (2026-05-16): cada card agora e' Pressable que navega
// para o detalhe canonico via destinoConquista() (extensao do padrao
// Q24.a). Itens sem destino mostram toast "Edicao em breve.".
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Trophy, Hash, ListChecks, Sparkles } from '@/lib/icons';
import { Card, useToast } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { destinoConquista } from '@/lib/recap/destinos';
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
  const router = useRouter();
  const toast = useToast();
  if (itens.length === 0) return null;

  const abrir = (item: ConquistaItem) => {
    const destino = destinoConquista(item);
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
          <Pressable
            key={item.id}
            onPress={() => abrir(item)}
            accessibilityRole="button"
            accessibilityLabel={`conquista ${item.id}`}
          >
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
          </Pressable>
        );
      })}
    </View>
  );
}
