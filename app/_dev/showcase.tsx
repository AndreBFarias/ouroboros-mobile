// M-GAUNTLET-AUDITORIA: rota /_dev/showcase. Lista todas as 24
// telas do mockup canonico em scroll, com botoes de navegacao.
// Em modo dev, orquestrador pode rolar a pagina e capturar
// screenshots das telas em sequencia.
//
// Comentarios sem acento.
// M-GAUNTLET-DEAD-CODE-V2: import direto de gauntlet vazaria markers
// (showcase entra no bundle release via require.context do expo-router,
// mesmo que _layout faca redirect runtime). MODO_DEV_WEB e zero-marker.
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';
import { colors, spacing, typography } from '@/theme/tokens';

interface ItemTela {
  numero: string;
  rota: string;
  nome: string;
  modal?: boolean;
}

// Mapa das 24 telas canonicas do mockup. Numero corresponde ao
// arquivo docs/Ouroboros_24_telas-standalone.html.
const TELAS: ItemTela[] = [
  { numero: '01', rota: '/', nome: 'Hoje (Home)' },
  { numero: '07', rota: '/exercicios', nome: 'Exercicios (galeria)' },
  { numero: '08', rota: '/exercicios/novo', nome: 'Cadastro exercicio' },
  { numero: '09', rota: '/saude-fisica', nome: 'Saude Fisica (treinos)' },
  { numero: '10', rota: '/saude-fisica', nome: 'Saude Fisica (evolucao corporal)' },
  { numero: '11', rota: '/saude-fisica', nome: 'Saude Fisica (exercicios)' },
  { numero: '12', rota: '/medidas', nome: 'Medidas form' },
  { numero: '13', rota: '/medidas/historico', nome: 'Medidas historico' },
  { numero: '14', rota: '/', nome: 'FAB radial expandido' },
  { numero: '15', rota: '/humor-rapido', nome: 'Humor rapido', modal: true },
  { numero: '16', rota: '/scanner', nome: 'Scanner OCR', modal: true },
  { numero: '17', rota: '/share-receive', nome: 'Share intent', modal: true },
  { numero: '18', rota: '/diario-emocional', nome: 'Diario emocional', modal: true },
  { numero: '20', rota: '/eventos', nome: 'Eventos com lugar', modal: true },
  { numero: '21', rota: '/humor', nome: 'Mini Humor heatmap' },
  { numero: '22', rota: '/financas', nome: 'Mini Financeiro' },
  { numero: '23', rota: '/settings', nome: 'Settings 7 grupos' },
  { numero: '24', rota: '/onboarding', nome: 'Onboarding' },
  { numero: '25', rota: '/recap', nome: 'Recap (Lista + Calendario)' },
  { numero: '26', rota: '/settings', nome: 'Widget toggle (settings)' },
];

export default function Showcase() {
  const router = useRouter();
  if (!MODO_DEV_WEB) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
        <Text style={{ color: colors.fg, textAlign: 'center' }}>
          Showcase disponivel apenas em modo dev.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      contentContainerStyle={{ padding: spacing.md }}
    >
      <Text
        style={{
          color: colors.purple,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.heading2.size,
          marginBottom: spacing.md,
        }}
      >
        Showcase 24 telas
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: typography.caption.size,
          marginBottom: spacing.lg,
          lineHeight: 20,
        }}
      >
        Lista canonica das telas do mockup. Toque para navegar.
        Modais ({'modal'}) abrem via console dev em vez de navegacao
        direta. Boot fresh demora ~30s na primeira tela.
      </Text>

      {TELAS.map((tela) => (
        <Pressable
          key={`${tela.numero}-${tela.rota}`}
          onPress={() => {
            // Apenas navegacao direta; sheets devem abrir via
            // __gauntlet.abrirSheet pelo console (requer estado seed).
            router.push(tela.rota as any);
          }}
          accessibilityRole="button"
          accessibilityLabel={`item showcase ${tela.numero}`}
          style={{
            backgroundColor: colors.bgElev,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            borderRadius: 8,
            marginBottom: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: typography.body.size,
              }}
            >
              {tela.numero} · {tela.nome}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: typography.caption.size,
                marginTop: 2,
              }}
            >
              {tela.rota}
              {tela.modal ? ' (modal)' : ''}
            </Text>
          </View>
          <Text style={{ color: colors.purple }}>{'>'}</Text>
        </Pressable>
      ))}

      <Text
        style={{
          color: colors.muted,
          fontSize: typography.caption.size,
          marginTop: spacing.lg,
          textAlign: 'center',
        }}
      >
        20 telas listadas (algumas se repetem em rotas com tabs).
      </Text>
    </ScrollView>
  );
}
