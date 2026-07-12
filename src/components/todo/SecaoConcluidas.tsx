// SecaoConcluidas (M31). Header collapsable + lista de ItemTarefa em
// modo concluida. Decisao usuario 2026-05-03 (BRIEF §1.8): tarefa
// concluida nao some - vai pra essa secao abaixo das pendentes.
//
// Comportamento:
//  - Empty state silencioso: se itens.length === 0, retorna null.
//  - Header mostra contador "Concluídas (N)" + chevron animado.
//  - Default colapsada quando itens.length > 5; expandida caso contrario
//    (caller pode forcar via prop `defaultAberto`).
//  - Tap no header alterna expansao com haptic selection.
//  - Cada ItemTarefa recebe os mesmos handlers de tap/longPress que a
//    secao de pendentes (caller decide se Tap reabre ou nao).
//
// Comentarios sem acento (convencao shell/CI).
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronRight } from '@/lib/icons';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';
import { ItemTarefa } from '@/components/todo/ItemTarefa';
import type { TarefaListada } from '@/lib/vault/tarefas';

export interface SecaoConcluidasProps {
  itens: TarefaListada[];
  onTap: (item: TarefaListada) => void;
  onLongPress: (item: TarefaListada) => void;
  // Quando informado, sobrescreve o default de expansao.
  defaultAberto?: boolean;
}

const COLAPSAR_QUANDO_MAIOR_QUE = 5;

export function SecaoConcluidas({
  itens,
  onTap,
  onLongPress,
  defaultAberto,
}: SecaoConcluidasProps): ReactNode {
  const aberturaInicial =
    defaultAberto !== undefined
      ? defaultAberto
      : itens.length <= COLAPSAR_QUANDO_MAIOR_QUE;
  const [aberta, setAberta] = useState<boolean>(aberturaInicial);

  // Empty state silencioso. Decisao M31 §2: nao mostrar header nem
  // espaco vazio quando nao ha concluidas.
  if (itens.length === 0) return null;

  return (
    <View style={{ marginTop: spacing.base, gap: spacing.sm }}>
      <Pressable
        onPress={() => {
          haptics.selection();
          setAberta((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={`concluidas ${aberta ? 'expandido' : 'colapsado'}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
        }}
      >
        {aberta ? (
          <ChevronDown
            size={16}
            color={colors.muted}
            strokeWidth={2}
            accessibilityLabel="aberto"
          />
        ) : (
          <ChevronRight
            size={16}
            color={colors.muted}
            strokeWidth={2}
            accessibilityLabel="fechado"
          />
        )}
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {`Concluídas (${itens.length})`}
        </Text>
      </Pressable>
      {aberta
        ? itens.map((item) => (
            <ItemTarefa
              key={item.rel}
              tarefa={item.meta}
              onTap={() => onTap(item)}
              onLongPress={() => onLongPress(item)}
            />
          ))
        : null}
    </View>
  );
}
