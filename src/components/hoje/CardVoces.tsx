// Card "Voces" (R-HOME-4a, garantido no topo do feed da Tela Hoje).
// Reintroduz um bloco compacto de estado do casal removido em R-HOME-1
// (ADR-0026/D1); ver ADR-0028. Uma linha por pessoa com o humor mais
// recente + convite suave quando falta o registro de hoje.
//
// Comportamento (spec-mae §5 + travas do dono §12):
//   - Titulo "Voces" em casal/amigos, "Voce" em sozinho.
//   - Registrou hoje: {nome} · {rotulo poetico} · hoje. Nome na cor da
//     pessoa (pessoa_a=roxo, pessoa_b=rosa). Toca -> /humor-rapido.
//   - Nao registrou hoje (tem registro antigo OU nunca): convite suave
//     "{nome} ainda nao registrou hoje ->". Texto muted, seta na cor da
//     pessoa. Toca -> /humor-rapido.
//   - Modo sozinho: so a linha de pessoa_a.
//   - GARANTIDO: nunca return null; nunca a palavra "Nada"/caixa vazia.
//   - Loading: titulo + so os nomes (linhas neutras), sem flash de vazio
//     e sem piscar layout.
//
// Tom (ADR-0005/ADR-010): zero gamificacao, zero exclamacao, sem
// comparativo entre as pessoas. Convite e acolhimento, nao cobranca.
// Toque >= 64dp (minHeight 44 + hitSlop 12 vertical). accessibilityLabel
// sem acento (convencao screen reader).
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui';
import { ChevronRight } from '@/lib/icons';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useNomeDe } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useHumorCasal, type HumorPessoa } from '@/lib/hooks/useHumorCasal';
import { rotuloNivelHumor, rotuloTempoDia } from '@/lib/humor/rotuloHumor';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

interface LinhaPessoaProps {
  pessoa: PessoaAutor;
  dados: HumorPessoa | null;
  loading: boolean;
  // Data estavel (mesma referencia para as duas linhas do card).
  agora: Date;
  onPress: () => void;
}

function LinhaPessoa({
  pessoa,
  dados,
  loading,
  agora,
  onPress,
}: LinhaPessoaProps) {
  const nome = useNomeDe(pessoa);
  const cor = pessoa === 'pessoa_a' ? colors.purple : colors.pink;
  const registrouHoje = dados?.registrouHoje ?? false;

  // accessibilityLabel sem acento (screen reader). Estado condensado.
  const rotuloA11y = loading
    ? `humor de ${nome}`
    : registrouHoje
      ? `humor de ${nome} registrado hoje`
      : `${nome} sem registro hoje, registrar`;

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={rotuloA11y}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 44,
      }}
    >
      <Text
        style={{
          color: cor,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 15,
          lineHeight: 22,
          flexShrink: 0,
        }}
        numberOfLines={1}
      >
        {nome}
      </Text>

      {loading ? null : registrouHoje && dados ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {` · ${rotuloNivelHumor(dados.meta.humor)} · ${rotuloTempoDia(
            dados.dataYmd,
            agora
          )}`}
        </Text>
      ) : (
        <>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {' ainda não registrou hoje'}
          </Text>
          <ChevronRight size={16} color={cor} strokeWidth={2.25} />
        </>
      )}
    </Pressable>
  );
}

export function CardVoces() {
  const router = useRouter();
  const { pessoaA, pessoaB, ehSozinho, loading } = useHumorCasal();
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
  // Uma unica referencia de "agora" por render: as duas linhas comparam
  // datas contra o mesmo instante (evita divergencia entre pessoa_a e
  // pessoa_b em torno da meia-noite).
  const agora = useMemo(() => new Date(), []);

  const titulo = tipoCompanhia === 'sozinho' ? 'Você' : 'Vocês';

  // §11.d: o tap abre o registro sem pre-trocar pessoaAtiva. Em casal,
  // cada um registra no proprio device via Syncthing; trocar a pessoa
  // ativa ao tocar a linha do parceiro seria semanticamente estranho.
  const abrirHumor = () => router.push('/humor-rapido' as never);

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        {titulo}
      </Text>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <LinhaPessoa
            pessoa="pessoa_a"
            dados={pessoaA}
            loading={loading}
            agora={agora}
            onPress={abrirHumor}
          />
          {ehSozinho ? null : (
            <LinhaPessoa
              pessoa="pessoa_b"
              dados={pessoaB}
              loading={loading}
              agora={agora}
              onPress={abrirHumor}
            />
          )}
        </View>
      </Card>
    </View>
  );
}

export default CardVoces;
