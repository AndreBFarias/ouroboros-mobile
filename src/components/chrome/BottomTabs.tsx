// UI customizada da tab bar do <Tabs> do Expo Router. Usa paleta
// Dracula (CONTRACT secao 1.2): fundo bg, indicador 2dp purple na
// aba ativa, icones lucide 24dp, labels em mono micro caption.
//
// Decisao M00.5: o Expo Router nem sempre respeita `href: null` em
// `<Tabs.Screen>` quando o tabBar e customizado. Para garantir que
// as abas opt-in fiquem fora da bottom bar enquanto o toggle esta
// off, filtramos AQUI por nome de rota, consultando useSettings
// diretamente.
//
// Comportamento:
//   - Renderiza apenas as 5 fixas + as opt-in cujo toggle esta on.
//   - Ignora a rota interna `em-construcao` (so acessivel via
//     deep link / redirect).
//   - Tap dispara haptic light e navega.
//   - Indicador purple aparece como tracinho 2dp no topo da aba ativa.
//   - Texto sentence case com acentuacao PT-BR completa; a11y sem acento.
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, typography } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/lib/stores/settings';
import {
  Home,
  Layers,
  BarChart3,
  Wallet,
  Settings as SettingsIcon,
  Moon,
  BellRing,
  ListChecks,
  Hash,
  Calendar,
  type LucideProps,
} from 'lucide-react-native';
import type { ComponentType } from 'react';

interface TabMeta {
  Icon: ComponentType<LucideProps>;
  label: string;
  a11yLabel: string;
}

// Mapa explicito de rota -> metadata. Tudo que nao esta neste mapa
// e tratado como rota interna (em-construcao etc) e nao aparece na
// bottom bar.
const TAB_META: Record<string, TabMeta> = {
  index: { Icon: Home, label: 'Hoje', a11yLabel: 'aba hoje' },
  memoria: { Icon: Layers, label: 'Memórias', a11yLabel: 'aba memorias' },
  humor: { Icon: BarChart3, label: 'Humor', a11yLabel: 'aba humor' },
  financas: { Icon: Wallet, label: 'Finanças', a11yLabel: 'aba financas' },
  settings: {
    Icon: SettingsIcon,
    label: 'Settings',
    a11yLabel: 'aba settings',
  },
  ciclo: { Icon: Moon, label: 'Ciclo', a11yLabel: 'aba ciclo' },
  alarmes: { Icon: BellRing, label: 'Alarmes', a11yLabel: 'aba alarmes' },
  todo: { Icon: ListChecks, label: 'Tarefas', a11yLabel: 'aba tarefas' },
  contadores: { Icon: Hash, label: 'Contadores', a11yLabel: 'aba contadores' },
  calendario: {
    Icon: Calendar,
    label: 'Calendário',
    a11yLabel: 'aba calendario',
  },
};

// Ordem visivel canonica (CONTRACT secao 1.1). Fixas vem primeiro,
// opt-in depois (so se toggle on).
const FIXED_ORDER = ['index', 'memoria', 'humor', 'financas', 'settings'];
const OPTIONAL_ORDER = [
  'ciclo',
  'alarmes',
  'todo',
  'contadores',
  'calendario',
];

// Mapa toggle key -> rota correspondente.
const TOGGLE_BY_ROUTE: Record<string, keyof typeof TOGGLE_DEFAULTS> = {
  ciclo: 'cicloMenstrual',
  alarmes: 'alarmePessoal',
  todo: 'todoLeve',
  contadores: 'contadorDiasSem',
  calendario: 'calendarioConquistas',
};

// Subset do shape de useSettings.featureToggles relevante para abas.
const TOGGLE_DEFAULTS = {
  cicloMenstrual: false,
  alarmePessoal: false,
  todoLeve: false,
  contadorDiasSem: false,
  calendarioConquistas: false,
} as const;

export function BottomTabs({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const featureToggles = useSettings((s) => s.featureToggles);

  // Index dos routes por nome para casamento O(1) com a ordem canonica.
  const routeByName = new Map(state.routes.map((r) => [r.name, r]));

  // Constroi a lista visivel: fixas primeiro, depois opt-in com toggle on.
  const visibleNames: string[] = [];
  for (const name of FIXED_ORDER) {
    if (routeByName.has(name)) visibleNames.push(name);
  }
  for (const name of OPTIONAL_ORDER) {
    const toggleKey = TOGGLE_BY_ROUTE[name];
    if (toggleKey && featureToggles[toggleKey] && routeByName.has(name)) {
      visibleNames.push(name);
    }
  }

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.bgElev,
        paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm,
        paddingTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-around',
      }}
      accessibilityRole="tablist"
    >
      {visibleNames.map((name) => {
        const route = routeByName.get(name);
        if (!route) return null;
        const meta = TAB_META[name];
        if (!meta) return null;

        const indexOnNav = state.routes.findIndex((r) => r.name === name);
        const isFocused = state.index === indexOnNav;
        const Icon = meta.Icon;
        const tint = isFocused ? colors.purple : colors.muted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            haptics.light();
            navigation.navigate(route.name, route.params as never);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={meta.a11yLabel}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingVertical: spacing.xs,
              minHeight: 48,
            }}
          >
            {/* Indicador 2dp em purple no topo da aba ativa. */}
            <View
              style={{
                height: 2,
                width: 24,
                backgroundColor: isFocused ? colors.purple : 'transparent',
                borderRadius: 1,
                marginBottom: spacing.xs,
              }}
            />
            <Icon size={22} color={tint} strokeWidth={1.6} />
            <Text
              style={{
                color: tint,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: typography.micro.size,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
