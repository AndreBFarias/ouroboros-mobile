// Card de comparativo de uma medida corporal. Layout vertical:
//   - Topo: nome da medida em laranja, capitalizacao Sentence case.
//   - Centro: valor atual em cyan grande (heading2-ish) com unidade
//     em muted ao lado.
//   - Sparkline 12 pontos abaixo (ou mensagem "Aguardando" quando
//     ha menos de 2 registros).
//   - Rodape: delta vs primeira medida em muted, sem cor positiva
//     ou negativa (ADR-0005). Formato "+1,2 kg vs primeira" / "-2,3
//     kg vs primeira" / "= vs primeira".
//
// Card e estatico (sem onPress) por padrao - so visualiza. Usado em
// grid 2 colunas na Tela 13.
//
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { SparklineMedida } from '@/components/data';
import type { SparklineMedidaPoint } from '@/components/data';
import { colors, spacing } from '@/theme/tokens';

export interface CardComparativoProps {
  // Rotulo PT-BR completo (ex: "Peso", "Braço esquerdo").
  nome: string;
  // Valor da medida mais recente. null quando não ha medida valida
  // para este campo na janela exibida.
  valorAtual: number | null;
  // Unidade ('kg' ou 'cm' tipicamente).
  unidade: string;
  // Primeira medida da janela (mais antiga). null quando ha apenas
  // uma medida ou nenhuma. Usado para calcular delta.
  valorPrimeira: number | null;
  // Pontos para o sparkline (ordem cronologica asc).
  pontos: SparklineMedidaPoint[];
  // Largura disponível ao card (caller calcula com base em
  // useWindowDimensions).
  largura: number;
}

// Formata número PT-BR com 1 casa decimal e separador virgula.
function formatarNumero(n: number): string {
  // toFixed gera ponto; trocamos por virgula. Negativo preserva sinal.
  const fixed = n.toFixed(1);
  return fixed.replace('.', ',');
}

// Formata delta absoluto com unidade e frase fixa. Sem cor (ADR-0005).
// Exemplos: "+1,2 kg vs primeira", "-2,3 cm vs primeira", "= vs
// primeira" quando a diferenca e desprezivel. Devolve string vazia
// quando faltam dados para calcular.
function formatarDelta(
  atual: number | null,
  primeira: number | null,
  unidade: string
): string {
  if (atual === null || primeira === null) return '';
  const delta = atual - primeira;
  if (Math.abs(delta) < 0.05) return '= vs primeira';
  const sinal = delta > 0 ? '+' : '-';
  return `${sinal}${formatarNumero(Math.abs(delta))} ${unidade} vs primeira`;
}

export function CardComparativo({
  nome,
  valorAtual,
  unidade,
  valorPrimeira,
  pontos,
  largura,
}: CardComparativoProps) {
  const deltaTexto = formatarDelta(valorAtual, valorPrimeira, unidade);
  const valorMostrado =
    valorAtual === null ? '—' : formatarNumero(valorAtual);

  // Largura útil do sparkline: card tem padding 16 lateral.
  const larguraSparkline = Math.max(0, largura - spacing.base * 2);

  return (
    <Card>
      <View
        style={{ gap: spacing.sm }}
        accessibilityLabel={`card medida ${nome}`}
      >
        {/* Nome da medida em laranja, micro caps */}
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 12,
            lineHeight: 16,
            letterSpacing: 0.5,
          }}
          numberOfLines={1}
        >
          {nome}
        </Text>

        {/* Valor atual em cyan + unidade muted */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: spacing.xs,
          }}
        >
          <Text
            style={{
              color: colors.cyan,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 20,
              lineHeight: 28,
            }}
          >
            {valorMostrado}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            {unidade}
          </Text>
        </View>

        {/* Sparkline */}
        <SparklineMedida pontos={pontos} largura={larguraSparkline} />

        {/* Delta vs primeira em muted, sem cor */}
        {deltaTexto.length > 0 ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 16,
            }}
            numberOfLines={1}
          >
            {deltaTexto}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
