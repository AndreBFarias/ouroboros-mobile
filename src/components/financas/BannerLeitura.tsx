// Banner micro muted que ancora o topo da tela Financas (M14). Reforca
// o modo somente leitura: edicao de transacoes e categorias acontece
// no desktop. Sem botao, sem CTA — apenas microcopy.
//
// Quando 'geradoEm' e fornecido, mostra "Atualizado em <data>" como
// segunda linha micro caption. Vira muted->red quando o cache esta
// com mais de 7 dias (sinal visual de pipeline parado).
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';
import { textPropsDecor } from '@/lib/a11y/textPropsDecor';

interface BannerLeituraProps {
  geradoEm?: string | null;
  agora?: Date;
}

const DIA_MS = 24 * 60 * 60 * 1000;

function formatarDataAtualizacao(
  geradoEm: string,
  agora: Date
): { texto: string; alerta: boolean } {
  const data = new Date(geradoEm);
  if (Number.isNaN(data.getTime())) {
    return { texto: 'Atualizado em data inválida.', alerta: true };
  }
  const diff = agora.getTime() - data.getTime();
  const dias = Math.floor(diff / DIA_MS);
  const alerta = dias > 7;
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dataFmt = `${dia}/${mes}`;
  if (dias <= 0) return { texto: `Atualizado hoje (${dataFmt}).`, alerta };
  if (dias === 1) return { texto: `Atualizado ontem (${dataFmt}).`, alerta };
  return { texto: `Atualizado há ${dias} dias (${dataFmt}).`, alerta };
}

export function BannerLeitura({
  geradoEm,
  agora,
}: BannerLeituraProps): ReactNode {
  const meta = geradoEm
    ? formatarDataAtualizacao(geradoEm, agora ?? new Date())
    : null;

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 10,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
        gap: 4,
      }}
      accessibilityRole="text"
      accessibilityLabel="banner modo leitura"
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
          lineHeight: typography.caption.size * typography.caption.lineHeight,
        }}
      >
        Modo leitura. Edição no desktop.
      </Text>
      {meta ? (
        <Text
          {...(meta.alerta ? {} : textPropsDecor())}
          style={{
            color: meta.alerta ? colors.red : colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.micro.size,
            lineHeight: typography.micro.size * typography.micro.lineHeight,
          }}
          accessibilityLabel={`atualizado ${meta.texto}`}
        >
          {meta.texto}
        </Text>
      ) : null}
    </View>
  );
}
