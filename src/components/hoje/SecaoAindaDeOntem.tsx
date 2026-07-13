// Card "Ainda de ontem" (R-HOME-4b, item 4 do feed adaptativo da spec-mae
// §2). Agrupa as tarefas pendentes criadas em dias anteriores
// (data < hoje) que ainda nao foram concluidas, cada uma rotulada com
// "ontem" / "ha N dias". Fecha a fronteira com o card To-do hoje
// (SecaoTodoHoje), que a partir do R-HOME-4b so mostra data === hoje:
// particoes disjuntas, zero duplicacao (decisao travada spec-mae §12).
//
// Self-hide (padrao R-HOME-4a): durante loading ou sem rollover o card
// retorna null -- sem empty state, o card simplesmente some (feed
// adaptativo). Nenhuma caixa "Nada ...".
//
// R-HOME-5: o toast "Desfazer" saiu do card. Antes cada secao montava seu
// proprio <UndoOverlay/> dentro do feed (atras dos cards, bug B4); agora o
// estado vive na store toastUndo e um unico <UndoOverlayHost/> no root da
// Tela Hoje o renderiza, entao o toast sobrevive a conclusao da ULTIMA
// tarefa rolada sem o card precisar continuar montado.
//
// Espelha SecaoTodoHoje: loader proprio via useFocusEffect + listarTarefas
// (double-read transitorio -- o registry FEED_CARDS monta cada card sem
// props, entao nao ha loader compartilhado). Reusa o
// padrao checkbox-inline + toast Desfazer do R-HOME-3 (CheckboxTarefaInline
// + store toastUndo), com a mesma logica otimista + rollback.
//
// Tom (ADR-0005 / regra de tom): titulo em muted (prioridade secundaria,
// nao urgencia como o orange do To-do). Rotulo "ontem" / "ha N dias" e
// lembrete calmo, nunca cobranca -- sem contagem em vermelho, sem badge
// de atraso. accessibilityLabel sem acento (convencao screen reader).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { dataLocalYmd } from '@/lib/datetime/local';
import {
  listarTarefas,
  marcarFeito,
  type TarefaListada,
} from '@/lib/vault/tarefas';
import { selecionarRollover } from '@/lib/tarefas/rollover';
import { CheckboxTarefaInline } from '@/components/tarefas/CheckboxTarefaInline';
import { useToastUndoStore } from '@/lib/stores/toastUndo';

const LIMITE_ROLLOVER = 5;

export function SecaoAindaDeOntem() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [tarefas, setTarefas] = useState<TarefaListada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const mostrarUndo = useToastUndoStore((s) => s.mostrarUndo);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setTarefas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const lista = await listarTarefas(vaultRoot);
      setTarefas(lista);
    } finally {
      setLoading(false);
    }
  }, [vaultRoot]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  // Deriva hojeYmd via helper canonico (resolve fuso; sem offset fixo) e
  // aplica o selector puro. Memoizado por lista para nao recomputar a
  // cada render. hojeYmd fica dentro do useMemo: muda so quando a lista
  // muda (que ja ocorre no foco diario), suficiente para a home.
  const rollover = useMemo(() => {
    const hojeYmd = dataLocalYmd(new Date());
    return selecionarRollover(tarefas, hojeYmd);
  }, [tarefas]);

  const visiveis = useMemo(
    () => rollover.slice(0, LIMITE_ROLLOVER),
    [rollover]
  );
  const excedentes = rollover.length - visiveis.length;

  // Navegacao interna do long-press / linha "e mais" (sem prop-drilling,
  // padrao R-HOME-4a).
  const abrirTodo = useCallback(() => {
    router.push('/todo' as never);
  }, [router]);

  // Atualiza estado otimista da lista local. Compartilhado entre toggle
  // inicial e reversao via Desfazer.
  const aplicarOtimista = useCallback(
    (rel: string, novoFeito: boolean) => {
      setTarefas((cur) =>
        cur.map((t) =>
          t.rel === rel
            ? {
                ...t,
                meta: {
                  ...t.meta,
                  feito: novoFeito,
                  feito_em: novoFeito ? new Date().toISOString() : null,
                },
              }
            : t
        )
      );
    },
    []
  );

  // Persistencia + toast undo + rollback em erro. Ao marcar feito, o
  // selecionarRollover deixa de incluir o item (filtra !feito), entao
  // ele sai da lista rolada. Mesma logica de SecaoTodoHoje.
  const handleCheck = useCallback(
    (rel: string, novoEstado: boolean) => {
      if (!vaultRoot) return;
      const alvo = tarefas.find((t) => t.rel === rel);
      if (!alvo) return;
      const estadoOriginal = alvo.meta.feito;
      aplicarOtimista(rel, novoEstado);
      void (async () => {
        try {
          await marcarFeito(vaultRoot, rel, novoEstado);
          if (novoEstado) {
            mostrarUndo('Tarefa concluida', () => {
              aplicarOtimista(rel, estadoOriginal);
              void marcarFeito(vaultRoot, rel, estadoOriginal).catch(() => {
                haptics.error();
                aplicarOtimista(rel, novoEstado);
              });
            });
          }
        } catch {
          aplicarOtimista(rel, estadoOriginal);
          haptics.error();
        }
      })();
    },
    [vaultRoot, tarefas, aplicarOtimista, mostrarUndo]
  );

  // Self-hide: durante loading ou sem rollover nao ha nada a mostrar. O
  // toast "Desfazer" nao mora mais aqui (R-HOME-5): vive na store e e
  // renderizado pelo <UndoOverlayHost/> no root da Tela Hoje, entao
  // sobrevive naturalmente a conclusao da ULTIMA tarefa rolada.
  if (loading || visiveis.length === 0) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Ainda de ontem
      </Text>
      <View style={{ gap: spacing.sm }}>
        {visiveis.map((t) => (
          <View
            key={t.rel}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <CheckboxTarefaInline
                id={t.rel}
                tarefa={{ titulo: t.meta.titulo, feito: t.meta.feito }}
                onCheck={handleCheck}
                onLongPress={abrirTodo}
              />
            </View>
            <View
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.chip,
                backgroundColor: colors.bgAlt,
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {t.rotulo}
              </Text>
            </View>
          </View>
        ))}
        {excedentes > 0 ? (
          <Pressable
            onPress={abrirTodo}
            accessibilityRole="button"
            accessibilityLabel="abrir tarefas"
            hitSlop={12}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.base,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {`e mais ${excedentes} em Tarefas`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default SecaoAindaDeOntem;
