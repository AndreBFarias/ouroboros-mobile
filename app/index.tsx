// Tela 01 (hoje) — entrada do app v3 (R-HOME-1, ADR-0026). Foco em
// acao: cabecalho com saudacao e atalho Reflexao, Proximos (alarmes
// 4h + tarefas com alarme hoje), To-do hoje (ate 5 tarefas pendentes
// com checkbox inline), botao Recap. FAB roxo + verde global vive em
// _layout.tsx.
//
// Removido em R-HOME-1 (Decisao D1=C, 2026-05-15):
//   - SecaoStatusCasal (duo-only) -- redundante com Recap modo casal.
//   - SecaoHumor (sliders disabled) -- redundante com Recap diario.
//   - SecaoDiariosEventosAgrupado (timeline "Esta jornada") -- prioriza
//     acao em vez de leitura cronologica.
//
// Se o onboarding nao foi concluido, redireciona para /onboarding
// (substituiu o PermissaoVaultModal da M02 a partir da M03).
//
// Fonte de verdade visual: docs/Ouroboros_24_telas-standalone.html
// artboard 'tela 01 -- hoje'. Layout v3 documentado em ADR-0026.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter, useFocusEffect } from 'expo-router';
import { Check, Sparkles } from 'lucide-react-native';
import { Card, EmptyState, Header, Screen, Button } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { usePessoa, useNomeDe } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useHasHydrated } from '@/lib/stores/hydrated';
import { loadVaultRoot } from '@/lib/vault';
import {
  listarTarefas,
  marcarFeito,
  type TarefaListada,
} from '@/lib/vault/tarefas';
import { SecaoProximos } from '@/components/screens/SecaoProximos';

// Q2.2 (Onda Q): Recap inline. Pressable direto resolve o problema do
// Button generico colapsar layout flex no celular real (W1 do M-AUDIT
// fixava isso em Q2, mas no APK new arch o MotiView ainda hidratava
// sem propagar o flex row interno). Custom resolve em ~30 linhas.
interface BotaoRecapProps {
  onPress: () => void;
}
function BotaoRecap({ onPress }: BotaoRecapProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => {
        setPressed(true);
        haptics.light();
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Recap"
      hitSlop={8}
      style={{
        // Q2.3 (Onda Q): row + flexShrink 0 evita o wrap "Re/ca/p" que
        // apareceu no celular real. O Header right={} aplica flex 1 ao
        // wrapper externo e o filho Pressable herdava largura limitada.
        // alignSelf flex-end + flexShrink 0 + minWidth conteudo garante
        // que o pill use largura intrinseca (icone + label + paddings).
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        alignSelf: 'flex-end',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(189,147,249,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(189,147,249,0.45)',
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <Sparkles size={14} color={colors.purple} strokeWidth={2.25} />
      <Text
        numberOfLines={1}
        style={{
          color: colors.purple,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 14,
          lineHeight: 18,
          flexShrink: 0,
        }}
      >
        Recap
      </Text>
    </Pressable>
  );
}

// R-HOME-1: atalho Reflexao (cyan + Sparkles). Abre o diario emocional
// em modo reflexao (terceiro modo neutro, introduzido em G2). Pill
// inline na primeira linha do header, ao lado da data.
interface AtalhoReflexaoProps {
  onPress: () => void;
}
function AtalhoReflexao({ onPress }: AtalhoReflexaoProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => {
        setPressed(true);
        haptics.light();
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="reflexao"
      hitSlop={8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        alignSelf: 'flex-end',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(139,233,253,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(139,233,253,0.42)',
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <Sparkles size={13} color={colors.cyan} strokeWidth={2.25} />
      <Text
        numberOfLines={1}
        style={{
          color: colors.cyan,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 13,
          lineHeight: 18,
          flexShrink: 0,
        }}
      >
        Reflexão
      </Text>
    </Pressable>
  );
}

export default function TelaHoje() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const setVaultRoot = useVault((s) => s.setVaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const setPessoaAtiva = usePessoa((s) => s.setPessoaAtiva);
  const onboardingDone = useOnboarding((s) => s.done);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);

  // Espera as 3 stores hidratarem do SecureStore antes de qualquer
  // decisão de redirect, senao o gate dispara com defaults (done=false,
  // vaultRoot=null) e causa flicker indo/voltando da tela de
  // onboarding até o persist terminar.
  const onbHidratado = useHasHydrated(useOnboarding);
  const vaultHidratado = useHasHydrated(useVault);
  const pessoaHidratada = useHasHydrated(usePessoa);
  const tudoHidratado = onbHidratado && vaultHidratado && pessoaHidratada;

  // Restaura URI do SecureStore na primeira montagem (caso o
  // middleware persist ainda não tenha hidratado).
  useEffect(() => {
    if (vaultRoot) return;
    let cancelled = false;
    loadVaultRoot().then((uri) => {
      if (!cancelled && uri) setVaultRoot(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [vaultRoot, setVaultRoot]);

  // Splash silencioso enquanto persist carrega.
  if (!tudoHidratado) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  // Gate de onboarding.
  if (!onboardingDone || !vaultRoot) {
    return <Redirect href="/onboarding" />;
  }

  const ehSozinho = tipoCompanhia === 'sozinho';
  const handleAvatarPress = ehSozinho
    ? undefined
    : () =>
        setPessoaAtiva(pessoaAtiva === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a');

  return (
    <TelaHojeConteudo
      ehSozinho={ehSozinho}
      onAvatarPress={handleAvatarPress}
      onComponentsPress={() => router.push('/_components')}
      // /recap criado em paralelo (M36/B5). Cast para evitar dependencia
      // dura no tipo gerado pelo expo-router antes do paralelo fechar.
      onRecapPress={() => router.push('/recap' as never)}
      onReflexaoPress={() =>
        router.push('/diario-emocional?modo=reflexao' as never)
      }
      onTodoLongPress={() => router.push('/todo' as never)}
    />
  );
}

interface ConteudoProps {
  ehSozinho: boolean;
  // undefined quando sozinho: avatar não tem toggle.
  onAvatarPress: (() => void) | undefined;
  onComponentsPress: () => void;
  onRecapPress: () => void;
  onReflexaoPress: () => void;
  onTodoLongPress: () => void;
}

function TelaHojeConteudo({
  ehSozinho,
  onAvatarPress: _onAvatarPress,
  onComponentsPress,
  onRecapPress,
  onReflexaoPress,
  onTodoLongPress,
}: ConteudoProps) {
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const nomeAtivo = useNomeDe(pessoaAtiva);

  // _onAvatarPress mantido na assinatura para compat retrocedida com
  // chamadas que injetam o toggle de pessoa. Header agora so mostra
  // titulo simples (sem avatar) -- decisao R-HOME-1: o avatar perdeu
  // valor sem o Status do Casal, que era o unico lugar onde refletia
  // pessoa selecionada na home. Filtro de pessoa fica acessivel via
  // MenuLateral.
  void _onAvatarPress;
  void ehSozinho;

  return (
    <Screen>
      <Header title="Hoje" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <CabecalhoHoje
          nome={nomeAtivo}
          onReflexaoPress={onReflexaoPress}
        />

        <SecaoProximos />

        <SecaoTodoHoje onLongPress={onTodoLongPress} />

        <View style={{ alignItems: 'center', paddingTop: spacing.base }}>
          <BotaoRecap onPress={onRecapPress} />
        </View>

        {__DEV__ ? (
          <Button
            variant="ghost"
            onPress={onComponentsPress}
            label="Ver storybook de componentes"
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// Cabecalho R-HOME-1. Duas linhas:
//  - Linha 1: data por extenso ("Quarta, 16 de maio") em muted +
//    atalho Reflexao (cyan) a direita.
//  - Linha 2: saudacao personalizada ("Boa noite, <nome>") em fg.
interface CabecalhoProps {
  nome: string;
  onReflexaoPress: () => void;
}
function CabecalhoHoje({ nome, onReflexaoPress }: CabecalhoProps) {
  const agora = useMemo(() => new Date(), []);
  const dataExtenso = useMemo(() => formatarDataExtenso(agora), [agora]);
  const saudacao = useMemo(() => saudacaoPorHora(agora), [agora]);

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {dataExtenso}
        </Text>
        <AtalhoReflexao onPress={onReflexaoPress} />
      </View>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 22,
          lineHeight: 30,
        }}
        numberOfLines={2}
      >
        {`${saudacao}, ${nome}`}
      </Text>
    </View>
  );
}

// Formata data em PT-BR sentence case: "Quarta, 16 de maio".
// Sem ano (a Tela Hoje sempre se refere ao dia corrente).
function formatarDataExtenso(date: Date): string {
  const local = new Date(date.getTime() + -180 * 60_000);
  const diasSemana = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const dow = diasSemana[local.getUTCDay()];
  const dia = local.getUTCDate();
  const mes = meses[local.getUTCMonth()];
  return `${dow}, ${dia} de ${mes}`;
}

// Saudacao por faixa horaria local BRT. Limites canonicos M01:
//   05..11 -> Bom dia
//   12..17 -> Boa tarde
//   18..04 -> Boa noite
function saudacaoPorHora(date: Date): string {
  const local = new Date(date.getTime() + -180 * 60_000);
  const h = local.getUTCHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Secao To-do hoje (R-HOME-1). Mostra ate 5 tarefas pendentes. Tap no
// checkbox alterna feito (otimista). Long-press na lista navega para
// /todo. Empty state breve quando nao ha tarefas.
//
// Filtro: tarefas com data === hoje OU pendentes mais recentes ate
// completar 5. Conservador: usuario que registrou tarefa ontem ainda
// ve hoje, sem precisar reabrir /todo. Concluidas nao aparecem aqui;
// vao para a secao Concluidas dentro de /todo.
const LIMITE_TODO_HOJE = 5;

interface SecaoTodoProps {
  onLongPress: () => void;
}
function SecaoTodoHoje({ onLongPress }: SecaoTodoProps) {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [tarefas, setTarefas] = useState<TarefaListada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  const pendentes = useMemo(() => {
    return tarefas
      .filter((t) => !t.meta.feito)
      .slice(0, LIMITE_TODO_HOJE);
  }, [tarefas]);

  const handleToggle = useCallback(
    async (rel: string) => {
      if (!vaultRoot) return;
      const alvo = tarefas.find((t) => t.rel === rel);
      if (!alvo) return;
      // Otimista: atualiza local imediato, persist em paralelo.
      setTarefas((cur) =>
        cur.map((t) =>
          t.rel === rel
            ? {
                ...t,
                meta: {
                  ...t.meta,
                  feito: !t.meta.feito,
                  feito_em: !t.meta.feito ? new Date().toISOString() : null,
                },
              }
            : t
        )
      );
      haptics.selection();
      try {
        await marcarFeito(vaultRoot, rel, !alvo.meta.feito);
      } catch {
        // Reverte estado local em caso de falha.
        setTarefas((cur) =>
          cur.map((t) =>
            t.rel === rel
              ? {
                  ...t,
                  meta: {
                    ...t.meta,
                    feito: alvo.meta.feito,
                    feito_em: alvo.meta.feito_em,
                  },
                }
              : t
          )
        );
        haptics.error();
      }
    },
    [vaultRoot, tarefas]
  );

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        To-do hoje
      </Text>
      {loading ? (
        <Card>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
            }}
          >
            Carregando...
          </Text>
        </Card>
      ) : pendentes.length === 0 ? (
        <Card>
          <EmptyState frase="Sem tarefas pendentes. Toque + para criar." />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {pendentes.map((t) => (
            <ItemTodoInline
              key={t.rel}
              item={t}
              onToggle={() => void handleToggle(t.rel)}
              onLongPress={onLongPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Item de tarefa inline na home: checkbox 22dp a esquerda + titulo
// (line-through se feito). Tap em qualquer lugar do item alterna o
// estado (mesmo padrao da Tela /todo). Long-press navega para /todo
// para edicao detalhada.
interface ItemTodoProps {
  item: TarefaListada;
  onToggle: () => void;
  onLongPress: () => void;
}
function ItemTodoInline({ item, onToggle, onLongPress }: ItemTodoProps) {
  const [pressed, setPressed] = useState(false);
  const titulo = item.meta.titulo;
  const feito = item.meta.feito;
  const a11y = `tarefa ${titulo}${feito ? ' feita' : ' pendente'}`;

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onToggle}
      onLongPress={() => {
        haptics.medium();
        onLongPress();
      }}
      delayLongPress={400}
      accessibilityRole="checkbox"
      accessibilityLabel={a11y}
      accessibilityState={{ checked: feito }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
        backgroundColor: colors.bg,
        borderRadius: radius.card,
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.input,
          borderWidth: feito ? 0 : 2,
          borderColor: colors.mutedDecor,
          backgroundColor: feito ? colors.green : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {feito ? (
          <Check size={14} color={colors.bg} strokeWidth={3} />
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          color: feito ? colors.muted : colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
          lineHeight: 22,
          textDecorationLine: feito ? 'line-through' : 'none',
        }}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}
