// Card "Na sua semana" (R-HOME-4c, item 6 do feed da spec-mae §2).
// Gancho para o Recap: puxa um destaque objetivo dos ultimos 7 dias via
// useRecap no periodo 'semana' e, ao toque, abre o Recap ja no periodo
// semanal. Absorve o BotaoRecap standalone removido da home nesta sprint
// (o acesso ao Recap tambem segue no MenuLateral).
//
// Auto-ocultacao (spec-mae §2: renderiza so com substancia), espelhando
// BadgePassos/SecaoProximos que retornam null quando sem conteudo:
//   - sem vaultRoot -> null.
//   - loading -> null (o card so aparece pronto, sem placeholder).
//   - sem data -> null.
//   - numeros.registros === 0 -> null (nunca vira caixa "nada esta
//     semana"; o empty state e a AUSENCIA do card).
//
// Integracao (R-HOME-4a): o registry FEED_CARDS monta os cards sem props
// (<Component key={id} />), entao o card navega internamente via
// useRouter quando onPress nao e fornecido. A prop onPress fica opcional
// para teste isolado (o caller injeta um mock e afere o tap).
//
// Tom (ADR-0005 / regra de tom): zero gamificacao, zero exclamacao, sem
// "voce fez". Rotulo em roxo (cor de marca do Recap). accessibilityLabel
// sem acento (convencao screen reader).
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui';
import { ChevronRight } from '@/lib/icons';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import {
  useRecap,
  resolverPeriodo,
  type NumerosRecap,
  type ConquistaItem,
  type CriseItem,
} from '@/lib/hooks/useRecap';

interface CardNaSuaSemanaProps {
  // Opcional: quando ausente, o card navega internamente para o Recap
  // semanal (caso do registry FEED_CARDS, que monta sem props).
  onPress?: () => void;
}

// Funcao pura testavel: monta a linha de destaque da semana com
// vocabulario neutro do Recap (conquista/crise), sem exclamacao nem
// comparativo. Ordem conquistas -> crises; fallback ao volume de
// registros quando nao ha conquista nem crise.
export function montarDestaqueSemana(
  numeros: NumerosRecap,
  conquistas: ConquistaItem[],
  crises: CriseItem[]
): string {
  const partes: string[] = [];
  if (conquistas.length > 0) {
    const n = conquistas.length;
    partes.push(`${n} ${n === 1 ? 'conquista' : 'conquistas'}`);
  }
  if (crises.length > 0) {
    const n = crises.length;
    partes.push(`${n} ${n === 1 ? 'crise' : 'crises'}`);
  }
  if (partes.length > 0) {
    return partes.join(', ');
  }
  const r = numeros.registros;
  return `${r} ${r === 1 ? 'registro' : 'registros'}`;
}

export function CardNaSuaSemana({ onPress }: CardNaSuaSemanaProps) {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  // Memoiza o range para estabilizar de/ate e nao re-disparar o efeito
  // do useRecap a cada render (o hook compara por getTime, mas o range
  // precisa ser estavel entre renders).
  const range = useMemo(() => resolverPeriodo('semana'), []);
  const { data, loading } = useRecap(range);

  // Auto-ocultacao: o card so aparece pronto e com substancia.
  if (!vaultRoot) return null;
  if (loading || !data || data.numeros.registros === 0) return null;

  const destaque = montarDestaqueSemana(
    data.numeros,
    data.conquistas,
    data.crises
  );

  const handlePress = () => {
    haptics.light();
    if (onPress) {
      onPress();
      return;
    }
    // Rota literal ASCII: o query param casa com parsePeriodoParam do
    // RecapScreen. Cast para never evita dependencia dura no tipo gerado
    // pelo expo-router.
    router.push('/recap?periodo=semana' as never);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.purple,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Na sua semana
      </Text>
      <Card onPress={handlePress} accessibilityLabel="na sua semana">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: 44,
          }}
        >
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 15,
              lineHeight: 22,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {destaque}
          </Text>
          <ChevronRight size={16} color={colors.muted} strokeWidth={2.25} />
        </View>
      </Card>
    </View>
  );
}

export default CardNaSuaSemana;
