// Container da aba Memórias. Renderiza 3 tabs internas (Treinos /
// Fotos / Marcos) via pager custom: barra de tabs no topo + view
// condicional. Spring suave ao trocar via tap (sem swipe horizontal
// para reduzir conflito com o gesto de fechar BottomSheet em sub-
// componentes).
//
// Pager custom evita adicionar react-native-tab-view + pager-view
// como dependencias novas (a spec da abertura para essa decisão na
// seção 5).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Header, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { MemoriasTreinosTab } from './MemoriasTreinosTab';
import { MemoriasFotosTab } from './MemoriasFotosTab';
import { MemoriasMarcosTab } from './MemoriasMarcosTab';
import { MenuCapturaVerde } from '@/components/chrome/MenuCapturaVerde';

type TabKey = 'treinos' | 'fotos' | 'marcos';

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'treinos', label: 'Treinos' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'marcos', label: 'Marcos' },
];

export function MemoriasScreen(): ReactNode {
  const [tab, setTab] = useState<TabKey>('treinos');
  // M34: nonce para forcar re-mount da tab ativa apos uma captura
  // bem-sucedida. useFotosAgregadas tem useFocusEffect mas o foco
  // nao muda quando o usuario fica na mesma tab (so muda quando
  // navega fora e volta); incrementar o nonce gera key novo no
  // container e re-disparar carregamento.
  const [capturaNonce, setCapturaNonce] = useState(0);

  const handleTabPress = useCallback((next: TabKey) => {
    haptics.selection();
    setTab(next);
  }, []);

  const handleCapturaConcluida = useCallback(() => {
    setCapturaNonce((n) => n + 1);
  }, []);

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Header title="Memórias" />
      </View>

      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colors.bgElev,
          marginHorizontal: spacing.lg,
        }}
        accessibilityRole="tablist"
      >
        {TABS.map((t) => {
          const ativa = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => handleTabPress(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              accessibilityLabel={`tab ${t.key}`}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: ativa ? colors.purple : colors.muted,
                  fontFamily: ativa
                    ? 'JetBrainsMono_500Medium'
                    : 'JetBrainsMono_400Regular',
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                {t.label}
              </Text>
              <MotiView
                animate={{
                  opacity: ativa ? 1 : 0,
                  scaleX: ativa ? 1 : 0.4,
                }}
                transition={springs.subtle}
                style={{
                  marginTop: 6,
                  height: 2,
                  width: '60%',
                  backgroundColor: colors.purple,
                  borderRadius: 1,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} key={`tabs-${capturaNonce}`}>
        {tab === 'treinos' ? <MemoriasTreinosTab /> : null}
        {tab === 'fotos' ? <MemoriasFotosTab /> : null}
        {tab === 'marcos' ? <MemoriasMarcosTab /> : null}
      </View>

      <MenuCapturaVerde onCapturaConcluida={handleCapturaConcluida} />
    </Screen>
  );
}
