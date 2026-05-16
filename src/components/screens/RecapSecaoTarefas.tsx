// Secao Tarefas concluidas do Recap (M36). Lista compacta agrupada
// por categoria com subtotais. Cada linha: titulo (esquerda), data
// abreviada (direita). Empty state silencioso (nao renderiza secao
// quando 0 itens).
//
// R-RECAP-1 (2026-05-16): cada linha vira Pressable que navega para
// /todo?focus=<id> (mesma rota canonica usada por recap-lista).
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from '@/lib/icons';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { destinoTarefa } from '@/lib/recap/destinos';
import {
  TAREFA_CATEGORIA_LABELS,
  type TarefaCategoria,
} from '@/lib/schemas/tarefa';
import type { TarefaConcluidaItem } from '@/lib/hooks/useRecap';

interface Props {
  itens: TarefaConcluidaItem[];
}

const DIAS_ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dia = DIAS_ABREV[d.getDay()] ?? '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia} ${dd}/${mm}`;
}

export function RecapSecaoTarefas({ itens }: Props) {
  const router = useRouter();
  if (itens.length === 0) return null;

  const abrir = (item: TarefaConcluidaItem) => {
    const destino = destinoTarefa(item);
    if (!destino) return;
    void haptics.light();
    router.push({
      pathname: destino.pathname as never,
      params: destino.params,
    });
  };

  // Agrupa por categoria, preservando ordem de chegada (que ja vem
  // ordenada por feito_em desc).
  const grupos = new Map<TarefaCategoria, TarefaConcluidaItem[]>();
  for (const item of itens) {
    const lista = grupos.get(item.categoria) ?? [];
    lista.push(item);
    grupos.set(item.categoria, lista);
  }

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao tarefas concluidas">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Tarefas concluídas
      </Text>
      {Array.from(grupos.entries()).map(([categoria, lista]) => (
        <View
          key={categoria}
          style={{ gap: 8 }}
          accessibilityLabel={`grupo ${categoria}`}
        >
          <Text
            style={{
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 13,
              color: colors.muted,
              lineHeight: 20,
            }}
          >
            {TAREFA_CATEGORIA_LABELS[categoria]} — {lista.length}{' '}
            {lista.length === 1 ? 'concluída' : 'concluídas'}
          </Text>
          <Card>
            <View style={{ gap: 8 }}>
              {lista.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => abrir(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`tarefa ${item.titulo}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 44,
                  }}
                >
                  <Check size={16} color={colors.green} strokeWidth={1.5} />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 13,
                      color: colors.fg,
                      lineHeight: 20,
                    }}
                    numberOfLines={1}
                  >
                    {item.titulo}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 12,
                      color: colors.muted,
                    }}
                  >
                    {formatarData(item.feito_em)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>
      ))}
    </View>
  );
}
