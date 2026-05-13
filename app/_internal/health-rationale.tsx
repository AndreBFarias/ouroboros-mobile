// Tela exibida pelo Health Connect quando o sistema solicita o
// "racional de privacidade" — texto que explica como o Ouroboros usa
// cada tipo de dado de saude. Q17.a (Onda Q, 2026-05-13).
//
// Activity registrada no AndroidManifest via intent-filter com action
// `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` no expo plugin.
// Quando o sistema dispara essa intent, o expo-router resolve para
// esta rota (`/_internal/health-rationale`).
//
// Conteudo focado em: zero envio para servidor, retencao local, e
// uso explicito por tipo. ADR-0007 (privacy first) refletido.
//
// Comentarios sem acento (convencao shell/CI).
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

const TOPICOS: Array<{ titulo: string; texto: string }> = [
  {
    titulo: 'Treinos (leitura + escrita)',
    texto:
      'Lê sessões de treino feitas em outros apps (Mi Fit, Strava, Google Fit) para mostrar no seu heatmap de Saúde Física. Escreve sessões registradas no Ouroboros pra que outros apps vejam seu progresso.',
  },
  {
    titulo: 'Peso e percentual de gordura (leitura + escrita)',
    texto:
      'Sincroniza medidas corporais com sua balança inteligente ou apps compatíveis. Toda medida que você registra no Ouroboros vira disponível para outros consumidores Health Connect.',
  },
  {
    titulo: 'Passos, frequência cardíaca, sono (somente leitura)',
    texto:
      'Lê dados de wearables (smartwatch, pulseira) que você já conectou a Conexão Saúde para enriquecer sua tela de Evolução. O Ouroboros nunca grava nestes tipos.',
  },
  {
    titulo: 'Ciclo menstrual (leitura + escrita)',
    texto:
      'Sincroniza registros de ciclo entre Ouroboros e outros apps de saúde feminina. Apenas dados que você marca no Diário emocional ou na tela Ciclo são compartilhados.',
  },
];

export default function HealthRationaleScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Header
        title="Como usamos seus dados de saúde"
        onBack={() => router.back()}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
      >
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          O Ouroboros é um app local. Nenhum dado de saúde sai do seu
          aparelho. Toda informação fica guardada no seu cofre pessoal
          (vault) em arquivos texto que você controla.
        </Text>

        {TOPICOS.map((t) => (
          <View
            key={t.titulo}
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.bgElev,
              padding: spacing.base,
              gap: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.orange,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {t.titulo}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {t.texto}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
