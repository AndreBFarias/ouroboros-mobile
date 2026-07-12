// Bloco de instrucao da Tela 08. Renderiza um titulo "Instrução" em
// muted micro acima de um paragrafo em fg body. Suporta quebras de
// linha simples (\n -> linha em branco) sem parser Markdown completo;
// o objetivo e exibir frase didatica gravada na Tela 02.
//
// Comentarios sem acento (convencao shell/CI).
import { Text, View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';

interface BlocoInstrucaoProps {
  titulo?: string;
  texto: string;
}

export function BlocoInstrucao({
  titulo = 'Instrução',
  texto,
}: BlocoInstrucaoProps) {
  // Divide em paragrafos por quebra de linha dupla. Em texto simples
  // (uma linha) o array tem 1 entrada e renderiza igual.
  const paragrafos = texto
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 11,
          lineHeight: 14,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {titulo}
      </Text>
      <View style={{ gap: spacing.sm }}>
        {paragrafos.map((p, i) => (
          <Text
            key={i}
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
            }}
          >
            {p}
          </Text>
        ))}
      </View>
    </View>
  );
}
