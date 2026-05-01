// Stub default obrigatório para abas registradas pelo navigator mas
// cuja sprint dona ainda não foi executada (CONTRACT seção 5.2:
// rota orfa). Cada aba opt-in ou em fase de stub aponta para esta
// rota com `?sprint=MNN`. Quando a sprint dona chega, ela substitui
// o redirect em app/(tabs)/_layout.tsx por um destino real, mas
// este arquivo permanece como fallback generico para deep link
// manual a abas opt-in não ativadas.
//
// Strings em sentence case com acentuacao PT-BR completa
// (BRIEFING.md seção 1.4). Comentarios em código sem acento
// (convencao shell/CI).
import { Header, Screen, EmptyState } from '@/components/ui';
import { useLocalSearchParams } from 'expo-router';
import { Hammer } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { spacing } from '@/theme/tokens';

export default function EmConstrucao() {
  const { sprint } = useLocalSearchParams<{ sprint?: string }>();

  // Fallback "Em breve." quando o caller não específica sprint.
  // Quando específica, mostra "Esta seção chega na sprint MNN."
  // sempre com acento completo na string final visivel.
  const frase =
    typeof sprint === 'string' && sprint.length > 0
      ? `Esta seção chega na sprint ${sprint}.`
      : 'Em breve.';

  return (
    <Screen>
      <Header title="Em construção" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.huge,
          paddingBottom: spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View accessibilityRole="text">
          <EmptyState frase={frase} Icon={Hammer} />
        </View>
      </ScrollView>
    </Screen>
  );
}
