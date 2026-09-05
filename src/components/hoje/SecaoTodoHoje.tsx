// Secao To-do hoje da Tela Hoje (R-HOME-1 + R-HOME-3). Extraida de
// app/index.tsx em R-HOME-4a para entrar no registry de feed adaptativo
// (FeedHoje). Mostra ate 5 tarefas pendentes; tap no checkbox alterna
// feito (otimista) com toast "Desfazer" 5s; long-press na lista navega
// para /todo.
//
// R-HOME-4a: self-hide. O empty state antigo (caixa "Sem tarefas
// pendentes...") virou ausencia do card -- durante loading ou sem
// pendentes a secao retorna null.
//
// R-HOME-5: o toast "Desfazer" saiu daqui. Antes cada secao montava seu
// proprio <UndoOverlay/> dentro do card (no meio do ScrollView, sem
// zIndex, portanto atras do feed -- bug B4); agora o estado vive na store
// toastUndo e um unico <UndoOverlayHost/> no root da Tela Hoje o
// renderiza, entao o toast sobrevive a conclusao da ULTIMA tarefa sem a
// secao precisar continuar montada. A secao so dispara mostrarUndo.
//
// R-HOME-5 (N2): o cabecalho "To-do hoje" ganhou o ">" navegavel para a
// lista completa /todo (antes so havia o long-press invisivel).
//
// R-HOME-4a: a navegacao de long-press deixou de ser prop-drilling
// (onLongPress) e passou a ser interna via useRouter().push('/todo').
//
// Mantida intacta toda a logica de checkbox otimista + toast Desfazer.
//
// R-HOME-3: checkbox extraido para <CheckboxTarefaInline> (32dp + hitSlop
// 16 = 64dp WCAG AAA, animacao Moti spring com check escalando, strike-
// through no titulo). Apos check, mostra toast "Desfazer" por 5s padrao
// Material via useToastUndo; tap em Desfazer reverte (otimista + save).
//
// Filtro: tarefas pendentes com data === hoje, ate 5. Concluidas nao
// aparecem aqui; vao para a secao Concluidas dentro de /todo.
//
// R-HOME-4b: fronteira Hoje vs Ainda de ontem (decisao travada spec-mae
// §12). Antes o filtro era so !feito (mostrava qualquer pendente,
// inclusive de dias anteriores). Agora estreita para data === hoje: as
// tarefas de dias anteriores migram para o card "Ainda de ontem"
// (SecaoAindaDeOntem, que filtra data < hoje). As duas particoes sao
// disjuntas -> a mesma tarefa nunca aparece nos dois cards (zero
// duplicacao). hojeYmd via dataLocalYmd (helper canonico de fuso).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { ChevronRight } from '@/lib/icons';
import { colors, spacing } from '@/theme/tokens';
import { dataLocalYmd } from '@/lib/datetime/local';
import { useVault } from '@/lib/stores/vault';
import {
  listarTarefas,
  marcarFeito,
  type TarefaListada,
} from '@/lib/vault/tarefas';
import { CheckboxTarefaInline } from '@/components/tarefas/CheckboxTarefaInline';
import { useToastUndoStore } from '@/lib/stores/toastUndo';

const LIMITE_TODO_HOJE = 5;

export function SecaoTodoHoje() {
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

  // R-HOME-4b: fronteira data === hoje. Pendentes de dias anteriores
  // migram para o card "Ainda de ontem"; aqui ficam so as de hoje.
  // hojeYmd dentro do useMemo: recomputa junto com a lista (recarregada
  // no foco), suficiente para a home.
  const pendentes = useMemo(() => {
    const hojeYmd = dataLocalYmd(new Date());
    return tarefas
      .filter((t) => !t.meta.feito && t.meta.data === hojeYmd)
      .slice(0, LIMITE_TODO_HOJE);
  }, [tarefas]);

  // Navegacao interna do long-press (R-HOME-4a: sem prop-drilling).
  const abrirTodo = useCallback(() => {
    router.push('/todo' as never);
  }, [router]);

  // Atualiza estado otimista da lista local. Helper compartilhado entre
  // toggle inicial e reversao via Desfazer.
  const aplicarOtimista = useCallback((rel: string, novoFeito: boolean) => {
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
  }, []);

  // Persistencia + toast undo + rollback em erro. Usuario marca um item
  // pendente como feito; a UI ja atualizou (CheckboxTarefaInline otimista).
  // Aqui:
  //   1) propaga estado novo pra lista local,
  //   2) chama marcarFeito,
  //   3) em sucesso, dispara toast "Desfazer" por 5s,
  //   4) em erro, reverte + haptic erro.
  const handleCheck = useCallback(
    (rel: string, novoEstado: boolean) => {
      if (!vaultRoot) return;
      const alvo = tarefas.find((t) => t.rel === rel);
      if (!alvo) return;
      const estadoOriginal = alvo.meta.feito;
      aplicarOtimista(rel, novoEstado);
      // Persiste em paralelo; nao bloqueia o tap.
      void (async () => {
        try {
          await marcarFeito(vaultRoot, rel, novoEstado);
          // So oferece "Desfazer" quando o usuario marcou como feito.
          // Reabrir manual (feito -> pendente) nao precisa de undo.
          if (novoEstado) {
            mostrarUndo('Tarefa concluída', () => {
              // Reversao explicita: roda novo save com estado original
              // e atualiza UI. Falha do save de reversao deixa estado
              // local "intencional usuario" mesmo se vault discrepar
              // (caller pode reabrir /todo pra forcar sync).
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

  // R-HOME-4a self-hide: durante loading ou sem pendentes nao ha nada a
  // mostrar; oculta por completo. O toast "Desfazer" nao mora mais aqui
  // (R-HOME-5): vive na store e e renderizado por um unico
  // <UndoOverlayHost/> no root da Tela Hoje, entao sobrevive naturalmente
  // a conclusao da ULTIMA tarefa (a lista esvazia, o host continua).
  if (loading || pendentes.length === 0) return null;

  return (
    <View style={{ gap: spacing.md }}>
      {/* N2 (R-HOME-5): cabecalho navegavel para a lista completa /todo,
          no padrao ">" dos demais cards (CardVoces, CardNaSuaSemana). O
          long-press nos itens continua funcionando (compat retroativa). */}
      <Pressable
        onPress={abrirTodo}
        accessibilityRole="button"
        accessibilityLabel="abrir tarefas"
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 44,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 16,
          }}
        >
          To-do hoje
        </Text>
        <ChevronRight size={16} color={colors.muted} strokeWidth={2.25} />
      </Pressable>
      <View style={{ gap: spacing.sm }}>
        {pendentes.map((t) => (
          <CheckboxTarefaInline
            key={t.rel}
            id={t.rel}
            tarefa={{ titulo: t.meta.titulo, feito: t.meta.feito }}
            onCheck={handleCheck}
            onLongPress={abrirTodo}
          />
        ))}
      </View>
    </View>
  );
}

export default SecaoTodoHoje;
