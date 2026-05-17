// R-CRIT-1.a (2026-05-15): Unmatched Route sobrio.
//
// Antes desta rota, a tela default do expo-router exibia
// "Unmatched Route — Page could not be found" com a URL bruta
// renderizada na UI. Isso e' inaceitavel quando o deep link nao
// resolvido carrega parametros sensiveis -- caso concreto: callback
// OAuth `com.googleusercontent.apps.<id>:/oauthredirect?code=...&
// state=...` levava o `code` para a tela.
//
// Este `+not-found` (convencao expo-router para a rota fallback)
// substitui o default. Garantias:
// - NAO le useLocalSearchParams nem usePathname para renderizar.
// - NAO imprime URL ou query string em nenhum lugar.
// - Mostra mensagem sobria em PT-BR com acentuacao completa.
// - CTA primario "Voltar para o início" leva a rota raiz `/`.
// - Conforma com BRIEFING secao 1.4 (zero emoji, sentence case).
//
// Comentarios em codigo sem acento (convencao shell/CI). Strings de
// UI em PT-BR com acento.
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Header, Screen, EmptyState, Button } from '@/components/ui';
import { HelpCircle } from '@/lib/icons';
import { spacing } from '@/theme/tokens';

export default function NotFound() {
  const router = useRouter();

  // replace() em vez de push() para nao deixar a /+not-found na
  // pilha de back. Usuario chegou aqui por engano (link quebrado
  // ou deep link nao reconhecido); back natural devolve foco ao
  // app de origem ou fecha o app.
  const irParaInicio = () => {
    router.replace('/');
  };

  return (
    <Screen>
      <Header title="Página não encontrada" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.huge,
          paddingBottom: spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View accessibilityRole="text">
          <EmptyState
            frase="A rota acessada não existe ou expirou. Toque em voltar para retomar de onde parou."
            Icon={HelpCircle}
          />
        </View>
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Button
            label="Voltar para o início"
            onPress={irParaInicio}
            variant="primary"
            fullWidth
            accessibilityLabel="voltar para o inicio"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
