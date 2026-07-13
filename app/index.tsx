// Tela 01 (hoje) — entrada do app v3 (R-HOME-1, ADR-0026). Foco em
// acao: cabecalho com saudacao e atalho Reflexao, seguido do feed
// adaptativo <FeedHoje> (R-HOME-4a, ADR-0028). FAB roxo + verde global
// vive em _layout.tsx.
//
// R-HOME-4a (ADR-0028): as secoes fixas (Proximos + To-do + Passos)
// viraram um registry de cards (src/components/hoje/FeedHoje.tsx) que
// renderiza cada card so quando tem substancia -- card sem conteudo
// nao aparece (nunca mais a caixa "Nada nas próximas horas"). O card
// garantido "Voces" (humor recente pessoa_a/pessoa_b) da vida a home
// mesmo num dia sem input.
//
// R-HOME-4c: o BotaoRecap standalone foi absorvido pelo card semanal
// "Na sua semana" (item 6 do feed) -- deixou de existir aqui. O link
// __DEV__ "Ver storybook de componentes" saiu da home e virou uma
// entrada de desenvolvimento em /settings (SecaoDev, __DEV__-only). O
// Recap segue acessivel pelo card semanal e pelo MenuLateral.
//
// Removido em R-HOME-1 (Decisao D1=C, 2026-05-15):
//   - SecaoStatusCasal (duo-only) -- redundante com Recap modo casal.
//   - SecaoHumor (sliders disabled) -- redundante com Recap diario.
//   - SecaoDiariosEventosAgrupado (timeline "Esta jornada") -- prioriza
//     acao em vez de leitura cronologica.
//
// R-HOME-3 (2026-05-16): checkbox inline extraido para
// <CheckboxTarefaInline> (32dp + hitSlop 16 = 64dp WCAG AAA) com
// animacao Moti spring e toast "Desfazer" 5s padrao Material via
// useToastUndo. Mantem persistencia otimista do R-HOME-1; agora com
// reversao explicita via tap em Desfazer.
//
// Se o onboarding nao foi concluido, redireciona para /onboarding
// (substituiu o PermissaoVaultModal da M02 a partir da M03).
//
// Fonte de verdade visual: design system em docs/BRIEFING.md.
// Layout v3 documentado em ADR-0026.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles } from '@/lib/icons';
import { Header, Screen } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useSafeBottomContentPadding } from '@/components/chrome/safeBottom';
import { colors, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { usePessoa, useNomeDe } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useHasHydrated } from '@/lib/stores/hydrated';
import { loadVaultRoot } from '@/lib/vault';
import { FeedHoje } from '@/components/hoje/FeedHoje';
import { UndoOverlayHost } from '@/lib/hooks/useToastUndo';

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
      // R-HOME-4c: o acesso ao Recap saiu do BotaoRecap standalone e
      // passou para o card semanal "Na sua semana" (feed), que navega
      // internamente para /recap?periodo=semana. O router aqui segue em
      // uso apenas pelo atalho Reflexao.
      onReflexaoPress={() =>
        router.push('/diario-emocional?modo=reflexao' as never)
      }
    />
  );
}

interface ConteudoProps {
  ehSozinho: boolean;
  // undefined quando sozinho: avatar não tem toggle.
  onAvatarPress: (() => void) | undefined;
  onReflexaoPress: () => void;
}

function TelaHojeConteudo({
  ehSozinho,
  onAvatarPress: _onAvatarPress,
  onReflexaoPress,
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

  // R-HOME-4f: reserva a zona do FABMenu global (base canonica + altura
  // do FAB + respiro) para o ultimo card do feed ("Relembrando") nao
  // ficar atras do FAB roxo. Deriva da mesma fonte que o FAB usa para o
  // bottom, entao os valores nunca divergem.
  const insets = useSafeAreaInsets();
  const paddingBottomFab = useSafeBottomContentPadding(insets.bottom);

  return (
    <Screen>
      <Header title="Hoje" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: paddingBottomFab,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <CabecalhoHoje
          nome={nomeAtivo}
          onReflexaoPress={onReflexaoPress}
        />

        <FeedHoje />
      </ScrollView>

      {/* R-HOME-5: toast "Desfazer" em nivel de tela. Irmao DEPOIS do
          ScrollView (fora dele) -> nao rola com o feed e, com
          zIndex+elevation, pinta acima dos cards (corrige o bug B4). Le a
          store toastUndo; uma unica instancia elimina o balao duplicado
          que existia dentro de cada card. Ancorado ao rodape da tela. */}
      <UndoOverlayHost />
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
