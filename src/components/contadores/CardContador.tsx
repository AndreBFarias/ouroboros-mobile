// Card visual de um contador na lista (M18). Conteudo, conforme spec
// secao 6 e secao 11:
//   - Linha 1: numero de dias em --cyan heading-1 (48dp) + label
//     "dia" / "dias" pequena ao lado (--muted, 14dp). Hierarquia
//     mantida sem competir com o numero gigante.
//   - Linha 2: titulo em --orange heading-3.
//   - Linha 3: "Recorde: N dias" em --muted micro caption.
//   - Linha 4: botao "Resetei" red text alinhado a direita.
//
// ADR-0005 reforcado: sem fogo, sem badge, sem milestone, sem cor
// especial em sequencias longas. Numero sempre cyan, igual qualquer
// outro. Sem som, sem confete. Animacao unica: fade-in sutil no valor
// pos-reset (controlado pelo container).
//
// Comentarios sem acento (convencao shell/CI).
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Card } from '@/components/ui';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';
import { diasEntre } from '@/lib/util/diasEntre';
import type { Contador } from '@/lib/schemas/contador';

interface CardContadorProps {
  contador: Contador;
  onPressResetei: () => void;
  onPressCard?: () => void;
  // Date injetavel para testes deterministicos. Default = new Date().
  agora?: Date;
}

export function CardContador({
  contador,
  onPressResetei,
  onPressCard,
  agora = new Date(),
}: CardContadorProps) {
  const [pressedReset, setPressedReset] = useState(false);
  const dias = Math.max(0, diasEntre(contador.inicio, agora));
  const labelDias = dias === 1 ? 'dia' : 'dias';

  return (
    <Card
      onPress={onPressCard}
      accessibilityLabel={`contador ${contador.titulo} ${dias} ${labelDias}`}
    >
      <View style={{ gap: spacing.sm }}>
        {/* Linha 1: numero gigante + label dia/dias */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: spacing.sm,
          }}
        >
          <Text
            style={{
              color: colors.cyan,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 48,
              lineHeight: 56,
            }}
            accessibilityLabel={`numero de dias ${dias}`}
          >
            {dias}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {labelDias}
          </Text>
        </View>

        {/* Linha 2: titulo orange */}
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 26,
          }}
          numberOfLines={2}
        >
          {contador.titulo}
        </Text>

        {/* Linha 3: recorde muted */}
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {`Recorde: ${contador.recorde} ${contador.recorde === 1 ? 'dia' : 'dias'}`}
        </Text>

        {/* Linha 4: botao Resetei red text alinhado a direita */}
        <View style={{ alignItems: 'flex-end', marginTop: spacing.xs }}>
          <Pressable
            onPressIn={() => {
              setPressedReset(true);
              void haptics.light();
            }}
            onPressOut={() => setPressedReset(false)}
            onPress={onPressResetei}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`resetei ${contador.slug}`}
          >
            <MotiView
              animate={{ scale: pressedReset ? 0.96 : 1 }}
              transition={springs.snappy}
            >
              <Text
                style={{
                  color: colors.red,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                Resetei
              </Text>
            </MotiView>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}
