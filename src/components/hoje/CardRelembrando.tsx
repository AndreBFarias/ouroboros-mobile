// Card "Relembrando" (R-HOME-4d, rodape GARANTIDO da home viva, item 7
// da spec-mae §2). Mostra rotativamente UMA lembranca contemplativa do
// passado do casal -- reflexao/humor/conquista antigos -- com tom calmo.
// Toca e abre o item de origem. Efeméride ("· nesta data") quando cai
// num aniversario de data.
//
// Estados (spec §3):
//   - loading -> nada visivel (sem "Carregando..." piscando no rodape;
//     o card e contemplativo, nao um bloco de status).
//   - relembranca != null -> Card tocavel: frase (fg) + rotulo de tempo
//     (muted). Tap -> destinoRelembranca (diario ou humor). O haptic
//     leve sai do proprio Card no press; se nao houver destino, o tap
//     nao navega (silencio contemplativo, sem toast).
//   - relembranca == null (cold start / pool vazio) -> boas-vindas
//     contemplativo (decisao do dono, spec-mae §12): 1 frase curta e
//     calorosa sobre comecar a registrar. NAO oculta o card, NAO usa
//     linha meta "aparece com o tempo".
//
// Tom (ADR-010 + regra de tom): zero gamificacao, zero exclamacao, zero
// "voce fez X". E memoria, nunca placar. accessibilityLabel sem acento
// (convencao screen reader). Rotulo de secao "Relembrando" em muted
// (rodape subdued, nao um titulo de acao).
//
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useRelembrando } from '@/lib/hooks/useRelembrando';
import { destinoRelembranca } from '@/lib/recap/destinos';

function TituloSecao() {
  return (
    <Text
      style={{
        color: colors.muted,
        fontFamily: 'JetBrainsMono_500Medium',
        fontSize: 16,
      }}
    >
      Relembrando
    </Text>
  );
}

export function CardRelembrando() {
  const router = useRouter();
  const { relembranca, loading } = useRelembrando();
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);

  // Loading: nada visivel (evita flash de placeholder no rodape).
  if (loading) return null;

  // Cold start / pool vazio: boas-vindas contemplativo (dono §12).
  if (!relembranca) {
    const boasVindas =
      tipoCompanhia === 'sozinho'
        ? 'Um lugar para guardar o que você viver, a partir de hoje.'
        : 'Um lugar para guardar o que vocês viverem, a partir de hoje.';
    return (
      <View style={{ gap: spacing.md }}>
        <TituloSecao />
        <Card accessibilityLabel="relembrando boas vindas">
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 15,
              lineHeight: 24,
            }}
          >
            {boasVindas}
          </Text>
        </Card>
      </View>
    );
  }

  const rotulo = relembranca.efemeride
    ? `${relembranca.rotuloTempo} · nesta data`
    : relembranca.rotuloTempo;

  const abrir = () => {
    // O haptic leve ja dispara no press do Card. Aqui so navegamos; se
    // nao houver destino, permanecemos em silencio (sem toast).
    const destino = destinoRelembranca(relembranca);
    if (!destino) return;
    router.push({
      pathname: destino.pathname as never,
      params: destino.params,
    });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <TituloSecao />
      <Card onPress={abrir} accessibilityLabel="relembrando">
        <View style={{ gap: spacing.xs, minHeight: 44, justifyContent: 'center' }}>
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 15,
              lineHeight: 24,
            }}
            numberOfLines={3}
          >
            {relembranca.frase}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            {`— ${rotulo}`}
          </Text>
        </View>
      </Card>
    </View>
  );
}

export default CardRelembrando;
