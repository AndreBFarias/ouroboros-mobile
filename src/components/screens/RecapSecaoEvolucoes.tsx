// Secao Evolucoes do Recap (M36). Cards cyan discretos com rotulo +
// detalhe. Inclui humor medio, treinos no periodo, contadores em alta.
// Sem grafico complexo nesta versao; o spec original previa sparkline,
// mas o detalhe textual ja entrega o numero — mantemos simples para
// evitar dependencia visual nao validada em producao.
//
// R-RECAP-1 (2026-05-16): cada card vira Pressable que navega para
// a rota de medicao correspondente:
//   humor_medio       -> /humor
//   treinos           -> /treinos
//   contador:<slug>   -> /contadores/<slug>
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp } from '@/lib/icons';
import { Card, useToast } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { destinoEvolucao } from '@/lib/recap/destinos';
import type { EvolucaoItem } from '@/lib/hooks/useRecap';

interface Props {
  itens: EvolucaoItem[];
}

export function RecapSecaoEvolucoes({ itens }: Props) {
  const router = useRouter();
  const toast = useToast();
  if (itens.length === 0) return null;

  const abrir = (item: EvolucaoItem) => {
    const destino = destinoEvolucao(item);
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
        <Pressable
          key={item.id}
          onPress={() => abrir(item)}
          accessibilityRole="button"
          accessibilityLabel={`evolucao ${item.id}`}
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
        </Pressable>
      ))}
    </View>
  );
}
