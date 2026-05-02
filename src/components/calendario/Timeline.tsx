// Timeline horizontal de cards de conquistas (M11.5). FlatList
// horizontal, sem snap, scroll suave. Stagger total <= 600ms (decisão
// 10 do spec): quando há muitos cards, distribui a entrada em
// 600 / N para manter dentro do limite e ainda dar sensação de
// cascata.
//
// Comentários em PT-BR com acentuação correta. Strings de UI em
// sentence case.
import { FlatList, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { ConquistaCard } from '@/components/data/ConquistaCard';
import type { Conquista } from '@/lib/conquistas/types';

const STAGGER_MAX_MS = 600;
const STAGGER_PASSO_MIN_MS = 30;

interface TimelineProps {
  conquistas: Conquista[];
}

// Limiar a partir do qual o piso de 30ms violaria o teto de 600ms;
// acima dele preferimos respeitar o teto e abrir mão do piso visível.
const STAGGER_LIMIAR_TETO = STAGGER_MAX_MS / STAGGER_PASSO_MIN_MS; // 20

export function Timeline({ conquistas }: TimelineProps) {
  // Calcula passo do stagger: 600 / N, com piso de 30ms para listas
  // pequenas. Quando a lista cresce além do limiar, abandonamos o
  // piso para preservar o teto de 600ms (evita stagger arrastado).
  const total = conquistas.length;
  const passoMs =
    total <= 1
      ? 0
      : total >= STAGGER_LIMIAR_TETO
        ? Math.floor(STAGGER_MAX_MS / total)
        : Math.max(STAGGER_PASSO_MIN_MS, Math.floor(STAGGER_MAX_MS / total));

  return (
    <FlatList
      data={conquistas}
      keyExtractor={(c) => c.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 8 }}
      renderItem={({ item, index }) => (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ ...springs.default, delay: index * passoMs }}
        >
          <ConquistaCard conquista={item} />
        </MotiView>
      )}
      ItemSeparatorComponent={() => <View style={{ width: 0 }} />}
    />
  );
}
