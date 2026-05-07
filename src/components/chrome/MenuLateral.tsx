// Menu lateral global (M27). Substitui a bottom bar de tabs como
// hub de navegacao. Renderizado pelo _layout raiz com z-index 20
// (CONTRACT secao 7.10). Drawer custom (sem @react-navigation/drawer)
// para integrar com Moti e useNavegacao com zero dep nova.
//
// Layout:
//   - Backdrop preto 50% que fecha o menu ao tocar.
//   - Painel 280dp da esquerda, ScrollView interno.
//   - Header: avatar pessoa ativa + nome (via nomeDe).
//   - Secao Ver: 6 itens fixos.
//   - Secao Registrar: 6 itens de captura (cores variadas).
//   - Secao Opcionais: itens condicionais por featureToggles.
//   - Rodape fixo: link para Settings.
//
// K1 (M-MENU-LATERAL-LAYOUT, 2026-05-07): aplica
//   1. Safe area no rodape (RodapeSettings) usando insets.bottom para
//      garantir distancia minima dos botoes nav Android (3-button +
//      gesture). Formula: max(spacing.xl, screenHeight * 0.10) + insets.bottom.
//   2. Scroll position persistente entre aberturas via campo
//      scrollMenuLateralPosition em useNavegacao (debounce 200ms).
//   3. Animacao de slide trocada de springs.default para springs.subtle
//      (damping 22, stiffness 220) para reduzir balanco residual.
//   4. paddingTop: spacing.xl no CabecalhoPessoa para simetria com
//      paddingBottom do label de secao.
//
// Strings PT-BR sentence case com acentuacao; a11y sem acento.
// Comentarios sem acento (convencao shell/CI).
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  BarChart,
  BellRing,
  Calendar,
  CalendarRange,
  Camera,
  Dumbbell,
  Hash,
  Heart,
  Home,
  Layers,
  ListChecks,
  Mic,
  Moon,
  Settings as SettingsIcon,
  Trophy,
  Wallet,
  type LucideProps,
} from '@/lib/icons';
import type { ComponentType } from 'react';
import { colors, spacing, typography } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { useNavegacao } from '@/lib/stores/navegacao';
import { useSettings } from '@/lib/stores/settings';
import { usePessoa } from '@/lib/stores/pessoa';
import { nomeDe } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { deveMostrarItemCiclo } from '@/lib/ciclo/inferencia';
import { PersonAvatar } from '@/components/ui';
import { routeForCapture } from '@/lib/navigation/captureRoutes';
import type { FABRadialKey } from '@/components/ui';

const PAINEL_WIDTH = 280;

// K1: debounce do salvamento do scroll offset. 200ms balanceia
// responsividade percebida e custo de re-render no zustand.
const SCROLL_DEBOUNCE_MS = 200;

interface ItemMenu {
  label: string;
  a11yLabel: string;
  icone: ComponentType<LucideProps>;
  route: string;
  // Cor opcional do icone (padrao = roxo). Usado na secao Registrar
  // para diferenciar visualmente as 6 acoes.
  cor?: string;
}

interface SecaoMenu {
  titulo: string;
  itens: ItemMenu[];
}

export function MenuLateral() {
  const aberto = useNavegacao((s) => s.menuAberto);
  const fechar = useNavegacao((s) => s.fechar);
  const scrollPos = useNavegacao((s) => s.scrollMenuLateralPosition);
  const setScrollPos = useNavegacao((s) => s.setScrollMenuLateralPosition);
  const router = useRouter();
  const featureToggles = useSettings((s) => s.featureToggles);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const fotoAtiva = usePessoa((s) => s.fotos[s.pessoaAtiva]);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // K1: ref-mirror do offset persistido para o useEffect de
  // restauracao. Lido apenas quando o drawer abre — usar o valor do
  // store via closure renderizaria o ScrollView com offset 0 antes
  // do scrollTo, causando flicker.
  const scrollPosRef = useRef<number>(scrollPos);
  scrollPosRef.current = scrollPos;
  // I-CICLO: item "Ciclo" nao faz sentido quando ambas as pessoas se
  // declararam masculino no onboarding (J1). Em qualquer outro caso
  // (ao menos uma feminina, nao-binaria, prefere-nao-dizer ou null
  // ainda nao declarado) o item permanece. Mantem autonomia.
  const sexoA = useOnboarding((s) => s.sexoDeclarado.pessoa_a);
  const sexoB = useOnboarding((s) => s.sexoDeclarado.pessoa_b);
  const mostrarCiclo = deveMostrarItemCiclo(sexoA, sexoB);

  const secoes: SecaoMenu[] = useMemo(() => {
    // Secao "Registrar" reusa routeForCapture para garantir paridade
    // com o que o storybook e a Tela Hoje (pre-M27) ja consumiam.
    const rotaCaptura = (key: FABRadialKey): string => {
      const r = routeForCapture(key);
      if (r.params) {
        const qs = new URLSearchParams(r.params as Record<string, string>).toString();
        return qs.length > 0 ? `${r.pathname}?${qs}` : r.pathname;
      }
      return r.pathname;
    };

    // M35: item "Financas" so aparece quando o toggle
    // `mostrarFinancasEmDesenvolvimento` esta ON. Default OFF: a aba
    // fica desligada na v1.0 enquanto o pipeline backend nao publicar
    // o cache no Vault.
    const ver: ItemMenu[] = [
      { label: 'Hoje', a11yLabel: 'item hoje', icone: Home, route: '/' },
      { label: 'Recap', a11yLabel: 'item recap', icone: BarChart, route: '/recap' },
      { label: 'Memórias', a11yLabel: 'item memorias', icone: Layers, route: '/memoria' },
      { label: 'Humor', a11yLabel: 'item humor', icone: Heart, route: '/humor' },
      { label: 'Calendário', a11yLabel: 'item calendario', icone: Calendar, route: '/calendario' },
      // M37.1: item "Agenda" (Google Calendar leitura).
      { label: 'Agenda', a11yLabel: 'item agenda', icone: CalendarRange, route: '/agenda' },
    ];
    if (featureToggles.mostrarFinancasEmDesenvolvimento) {
      ver.push({ label: 'Finanças', a11yLabel: 'item financas', icone: Wallet, route: '/financas' });
    }

    const registrar: ItemMenu[] = [
      { label: 'Humor', a11yLabel: 'registrar humor', icone: Heart, route: rotaCaptura('humor'), cor: colors.pink },
      { label: 'Voz', a11yLabel: 'registrar voz', icone: Mic, route: rotaCaptura('voz'), cor: colors.cyan },
      // M-CAPTURA-UNIFICADA: Camera passa a apontar para a rota
      // /captura (transparentModal) que ramifica entre "Registrar
      // momento" e "Escanear documento". Em vez do legado
      // rotaCaptura('camera') -> /scanner, que pulava direto a decisao.
      { label: 'Câmera', a11yLabel: 'registrar camera', icone: Camera, route: '/captura', cor: colors.orange },
      { label: 'Exercícios', a11yLabel: 'registrar exercicios', icone: Dumbbell, route: rotaCaptura('exercicio'), cor: colors.green },
      { label: 'Conquista', a11yLabel: 'registrar conquista', icone: Trophy, route: rotaCaptura('vitoria'), cor: colors.yellow },
      { label: 'Crise', a11yLabel: 'registrar crise', icone: AlertTriangle, route: rotaCaptura('trigger'), cor: colors.red },
    ];

    // Secao "Opcionais": cada item so aparece se o toggle correspondente
    // estiver on. Defaults sao todos off em M27; M29 vira para on.
    const opcionais: ItemMenu[] = [];
    if (featureToggles.todoLeve) {
      opcionais.push({ label: 'Tarefas', a11yLabel: 'item tarefas', icone: ListChecks, route: '/todo' });
    }
    if (featureToggles.alarmePessoal) {
      opcionais.push({ label: 'Alarmes', a11yLabel: 'item alarmes', icone: BellRing, route: '/alarmes' });
    }
    if (featureToggles.contadorDiasSem) {
      opcionais.push({ label: 'Contadores', a11yLabel: 'item contadores', icone: Hash, route: '/contadores' });
    }
    if (featureToggles.cicloMenstrual && mostrarCiclo) {
      opcionais.push({ label: 'Ciclo', a11yLabel: 'item ciclo', icone: Moon, route: '/ciclo' });
    }

    const lista: SecaoMenu[] = [
      { titulo: 'Ver', itens: ver },
      { titulo: 'Registrar', itens: registrar },
    ];
    if (opcionais.length > 0) {
      lista.push({ titulo: 'Opcionais', itens: opcionais });
    }
    return lista;
  }, [featureToggles, mostrarCiclo]);

  const navegar = (rota: string) => {
    haptics.light();
    fechar();
    // expo-router aceita string em router.push direto. Cast para
    // satisfazer o template literal restritivo do typed routing.
    router.push(rota as Parameters<typeof router.push>[0]);
  };

  // K1: salva offset com debounce de 200ms. Evita pressao no zustand
  // a cada frame de scroll. O valor e gravado no scrollPosRef em todo
  // render via mirror acima, entao o useEffect le sempre atualizado.
  const aoRolar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setScrollPos(offset);
    }, SCROLL_DEBOUNCE_MS);
  };

  // K1: ao abrir o drawer, restaura o offset persistido. animated:false
  // para evitar animacao concorrente com o slide do MotiView.
  useEffect(() => {
    if (!aberto) {
      // Limpa timer pendente ao fechar para nao gravar offset velho.
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }
    const offset = scrollPosRef.current;
    if (offset > 0) {
      // Atraso minimo para garantir que o ScrollView ja medio o
      // contentSize. Sem isso o scrollTo no primeiro frame e ignorado.
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: offset, animated: false });
      }, 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [aberto]);

  // Quando fechado, nao renderiza nada (libera area para o resto).
  // Quando aberto, ocupa a tela inteira em overlay (zIndex 20).
  if (!aberto) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 20,
      }}
      accessibilityViewIsModal
    >
      {/* Backdrop: tap fecha. */}
      <Pressable
        onPress={fechar}
        accessibilityLabel="fechar menu lateral"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      />

      <MotiView
        from={{ translateX: -PAINEL_WIDTH }}
        animate={{ translateX: 0 }}
        transition={springs.subtle}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: PAINEL_WIDTH,
          backgroundColor: colors.bgPage,
          borderRightWidth: 1,
          borderRightColor: colors.bgElev,
        }}
      >
        <ScrollView
          ref={scrollRef}
          onScroll={aoRolar}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingTop: spacing.xl,
            paddingBottom: spacing.lg,
            gap: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <CabecalhoPessoa pessoaFoto={fotoAtiva} pessoa={pessoaAtiva} />

          {secoes.map((secao) => (
            <Secao key={secao.titulo} secao={secao} onItemPress={navegar} />
          ))}
        </ScrollView>

        <RodapeSettings
          onPress={() => navegar('/settings')}
          insetsBottom={insets.bottom}
        />
      </MotiView>
    </View>
  );
}

interface CabecalhoProps {
  pessoa: 'pessoa_a' | 'pessoa_b';
  pessoaFoto: string | null;
}

function CabecalhoPessoa({ pessoa, pessoaFoto }: CabecalhoProps) {
  const nome = nomeDe(pessoa);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        // K1: paddingTop simetrico ao paddingBottom dos labels de secao
        // para evitar a sensacao de "cabecalho colado" ao topo do
        // drawer. Valor canonico: spacing.xl.
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.bgElev,
      }}
    >
      <PersonAvatar pessoa={pessoa} size="md" photoUri={pessoaFoto} />
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 14,
        }}
        numberOfLines={1}
      >
        {nome}
      </Text>
    </View>
  );
}

interface SecaoProps {
  secao: SecaoMenu;
  onItemPress: (rota: string) => void;
}

function Secao({ secao, onItemPress }: SecaoProps) {
  return (
    <View style={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.micro.size,
          marginBottom: spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {secao.titulo}
      </Text>
      {secao.itens.map((item) => (
        <ItemBotao key={item.label + item.route} item={item} onPress={onItemPress} />
      ))}
    </View>
  );
}

interface ItemProps {
  item: ItemMenu;
  onPress: (rota: string) => void;
}

function ItemBotao({ item, onPress }: ItemProps) {
  const Icon = item.icone;
  const tint = item.cor ?? colors.fg;
  return (
    <Pressable
      onPress={() => onPress(item.route)}
      accessibilityRole="button"
      accessibilityLabel={item.a11yLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        minHeight: 44,
      }}
    >
      <Icon size={20} color={tint} strokeWidth={1.6} />
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

interface RodapeProps {
  onPress: () => void;
  insetsBottom: number;
}

function RodapeSettings({ onPress, insetsBottom }: RodapeProps) {
  // K1: distancia minima entre o botao Configuracoes e a borda
  // inferior. max(spacing.xl, 10% da altura da tela) + insets.bottom.
  // Garante que o botao nunca colida com a barra de gestos / 3-button
  // nav do Android, independente do device.
  const screenHeight = Dimensions.get('window').height;
  const paddingBottomCanonico =
    Math.max(spacing.xl, screenHeight * 0.1) + insetsBottom;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="abrir configuracoes"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: paddingBottomCanonico,
        paddingHorizontal: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.bgElev,
        minHeight: 56,
      }}
    >
      <SettingsIcon size={20} color={colors.muted} strokeWidth={1.6} />
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
        }}
      >
        Configurações
      </Text>
    </Pressable>
  );
}
