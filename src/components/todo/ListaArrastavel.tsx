// Wrapper sobre react-native-draggable-flatlist para a lista de
// pendentes (M17). Long-press inicia drag (haptic medium ja disparado
// por ItemTarefa quando consumidor sobrescreve onLongPress); soltar
// reordena. Persistencia da ordem custom fica por conta do caller
// (recebe nova lista em onReorder e grava em SecureStore).
//
// Sem header; lista plana de pendentes. Render do item usa a prop
// renderItem para o caller continuar a ter ItemTarefa com toda a
// logica de tap/long-press.
//
// Comentarios sem acento (convencao shell/CI).
import { type ReactElement } from 'react';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { spacing } from '@/theme/tokens';
import type { TarefaListada } from '@/lib/vault/tarefas';

export interface ListaArrastavelProps {
  data: TarefaListada[];
  // Disparado apos o usuario soltar o drag em uma nova posicao. Caller
  // persiste a ordem em SecureStore.
  onReorder: (nova: TarefaListada[]) => void;
  // Render do item: caller fornece um Pressable com onLongPress que
  // inicia drag (chama drag()).
  renderItem: (params: {
    item: TarefaListada;
    drag: () => void;
    isActive: boolean;
  }) => ReactElement;
  // Componente fixo no topo (header da lista). Ex: barra de busca.
  ListHeaderComponent?: ReactElement | null;
  // Componente fixo no rodape (depois das pendentes). Ex: collapse de
  // feitas.
  ListFooterComponent?: ReactElement | null;
}

export function ListaArrastavel({
  data,
  onReorder,
  renderItem,
  ListHeaderComponent,
  ListFooterComponent,
}: ListaArrastavelProps): ReactElement {
  return (
    <DraggableFlatList
      data={data}
      keyExtractor={(item) => item.rel}
      onDragEnd={({ data: nova }) => onReorder(nova)}
      renderItem={(params: RenderItemParams<TarefaListada>) =>
        renderItem({
          item: params.item,
          drag: params.drag,
          isActive: params.isActive,
        })
      }
      ListHeaderComponent={ListHeaderComponent ?? undefined}
      ListFooterComponent={ListFooterComponent ?? undefined}
      contentContainerStyle={{
        paddingBottom: spacing.huge,
        gap: spacing.sm,
      }}
      activationDistance={12}
      // Lista usualmente curta; sem virtualization agressiva.
      windowSize={10}
      // Mantem espacamento entre header/itens consistente.
      ItemSeparatorComponent={null}
    />
  );
}
