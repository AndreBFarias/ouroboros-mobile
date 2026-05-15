// SecaoStatusCasal (M40). Renderiza 2 cards lado a lado mostrando o
// estado atual de cada pessoa do casal: foto + nome (via useNomeDe),
// nivel de humor (1-5 ou "—"), e a ultima atividade do dia ("Última:
// 14:30 evento" / "Última: 09:15 humor" / "Última: —").
//
// Sem julgamento: nao compara, nao premia (ADR-0005). Apenas exibe.
//
// So renderiza quando tipoCompanhia !== 'sozinho'. Caller controla
// esse gate; o componente em si e agnostico.
//
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { Card, PersonAvatar } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { useNomeDe } from '@/lib/stores/pessoa';
import { usePessoa } from '@/lib/stores/pessoa';
import { useStatusCasal } from '@/lib/hooks/useStatusCasal';
import type { StatusPessoa } from '@/lib/hooks/useStatusCasal';

const ROTULO_TIPO: Record<'humor' | 'diario' | 'evento', string> = {
  humor: 'humor',
  diario: 'diário',
  evento: 'evento',
};

function horaDeIso(iso: string): string {
  return iso.slice(11, 16);
}

interface CartaoStatusProps {
  status: StatusPessoa;
  fotoUri: string | null | undefined;
}

function CartaoStatus({ status, fotoUri }: CartaoStatusProps) {
  const nome = useNomeDe(status.pessoa);
  const humorTxt = status.humor ? `${status.humor.humor}/5` : '—';
  const ultima = status.ultima
    ? `${horaDeIso(status.ultima.iso)} ${ROTULO_TIPO[status.ultima.tipo]}`
    : '—';
  return (
    <View style={{ flex: 1 }}>
      <Card>
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <PersonAvatar
              pessoa={status.pessoa}
              size="sm"
              photoUri={fotoUri ?? null}
            />
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 14,
              }}
              numberOfLines={1}
            >
              {nome}
            </Text>
          </View>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 22,
            }}
          >
            Humor {humorTxt}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 20,
            }}
          >
            Última: {ultima}
          </Text>
        </View>
      </Card>
    </View>
  );
}

export function SecaoStatusCasal() {
  const { pessoaA, pessoaB, loading, error } = useStatusCasal();
  const fotos = usePessoa((s) => s.fotos);

  if (loading) {
    return (
      <View style={{ gap: spacing.md }}>
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 16,
          }}
        >
          Status do casal
        </Text>
        <Card>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
            }}
          >
            Carregando...
          </Text>
        </Card>
      </View>
    );
  }

  if (error) {
    return null;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Status do casal
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <CartaoStatus status={pessoaA} fotoUri={fotos.pessoa_a} />
        <CartaoStatus status={pessoaB} fotoUri={fotos.pessoa_b} />
      </View>
    </View>
  );
}
