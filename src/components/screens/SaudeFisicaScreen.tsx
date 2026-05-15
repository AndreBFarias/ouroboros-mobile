// Container da tela Saude Fisica (sprint L1 renomeou de
// MemoriasScreen). Renderiza 3 tabs internas via pager custom: barra
// de tabs no topo + view condicional. Spring suave ao trocar via tap
// (sem swipe horizontal para reduzir conflito com o gesto de fechar
// BottomSheet em sub-componentes).
//
// Tabs apos L1:
//   - Treinos (mantida)
//   - Evolucao Corporal (renomeada de "Marcos")
//   - Exercicios (movida de Registrar -> nova aba dedicada)
//
// Aba "Fotos" REMOVIDA — FAB+ verde do MenuCapturaVerde ja oferece
// "Adicionar foto" com mesma cobertura, sem precisar de aba dedicada.
//
// Pager custom evita adicionar react-native-tab-view + pager-view
// como dependencias novas (decisao herdada do M11).
//
// M34.3: o MenuCapturaVerde unificado absorveu o papel dos FABs
// proprios das tabs. Cada tab registra uma acao contextual ("Novo
// treino", "Adicionar marco", "Adicionar exercicio") via prop
// onRegistrarAcaoExtra; a screen agrega a acao da tab ativa em
// acoesExtras do MenuCapturaVerde, que renderiza como primeiro item
// do sheet "Registrar".
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { useLocalSearchParams } from 'expo-router';
import { Header, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { MemoriasTreinosTab } from './MemoriasTreinosTab';
import { EvolucaoCorporalTab } from './EvolucaoCorporalTab';
import { MemoriasExerciciosTab } from './MemoriasExerciciosTab';
import {
  MenuCapturaVerde,
  type AcaoExtraCaptura,
} from '@/components/chrome/MenuCapturaVerde';

type TabKey = 'treinos' | 'evolucao' | 'exercicios';

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'treinos', label: 'Treinos' },
  // W3 (M-AUDIT-VISUAL-WARNS): label encurtada para 1 palavra,
  // consistente com 'Treinos' e 'Exercicios'. Titulo da tela
  // 'Saude Fisica' + icone dao contexto suficiente.
  { key: 'evolucao', label: 'Evolução' },
  { key: 'exercicios', label: 'Exercícios' },
];

export function SaudeFisicaScreen(): ReactNode {
  // M-CAPTURA-UNIFICADA: query ?abrirCaptura=1 vinda de /captura ->
  // "Registrar momento" sinaliza que o usuario ja escolheu abrir o
  // MenuCapturaVerde. Repassamos como prop abrirNoMount para o sheet
  // expandir 1 frame apos mount, evitando exigir um segundo toque.
  // useLocalSearchParams devolve string | string[] | undefined;
  // checamos === '1' explicitamente.
  const params = useLocalSearchParams<{ abrirCaptura?: string }>();
  const abrirCapturaAuto = params.abrirCaptura === '1';

  const [tab, setTab] = useState<TabKey>('treinos');
  // M34: nonce para forcar re-mount da tab ativa apos uma captura
  // bem-sucedida. useFotosAgregadas tem useFocusEffect mas o foco
  // nao muda quando o usuario fica na mesma tab (so muda quando
  // navega fora e volta); incrementar o nonce gera key novo no
  // container e re-disparar carregamento.
  const [capturaNonce, setCapturaNonce] = useState(0);

  // M34.3: acao contextual registrada pela tab ativa para o
  // MenuCapturaVerde. So uma tab esta montada por vez (render
  // condicional), entao o estado e' simples (1 ou null).
  const [acaoExtra, setAcaoExtra] = useState<AcaoExtraCaptura | null>(null);

  const handleTabPress = useCallback((next: TabKey) => {
    haptics.selection();
    setTab(next);
  }, []);

  const handleCapturaConcluida = useCallback(() => {
    setCapturaNonce((n) => n + 1);
  }, []);

  const handleRegistrarAcaoExtra = useCallback(
    (acao: AcaoExtraCaptura | null) => {
      setAcaoExtra(acao);
    },
    []
  );

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Header title="Saúde Física" />
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
        {tab === 'treinos' ? (
          <MemoriasTreinosTab onRegistrarAcaoExtra={handleRegistrarAcaoExtra} />
        ) : null}
        {tab === 'evolucao' ? (
          <EvolucaoCorporalTab
            onRegistrarAcaoExtra={handleRegistrarAcaoExtra}
          />
        ) : null}
        {tab === 'exercicios' ? (
          <MemoriasExerciciosTab
            onRegistrarAcaoExtra={handleRegistrarAcaoExtra}
          />
        ) : null}
      </View>

      <MenuCapturaVerde
        onCapturaConcluida={handleCapturaConcluida}
        acoesExtras={acaoExtra ? [acaoExtra] : undefined}
        abrirNoMount={abrirCapturaAuto}
      />
    </Screen>
  );
}
