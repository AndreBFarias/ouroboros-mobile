// Card de top categorias da Tela 22 (M14). Lista ate 5 itens com
// nome, valor BRL e barra horizontal cyan cuja largura e o
// percentual fornecido pelo backend (0..1). Animacao one-shot ao
// montar com spring_subtle e delay 60ms entre itens.
//
// Quando a lista chega vazia o card se autoremove (retorna null) —
// a tela nao precisa renderizar um card placeholder.
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Card } from '@/components/ui';
import { springs } from '@/lib/motion';
import { colors, spacing, typography } from '@/theme/tokens';
import type { FinancasTopCategoria } from '@/lib/schemas/financas-cache';

interface CardTopCategoriasProps {
  categorias: FinancasTopCategoria[];
}

function formatarBRL(valor: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  } catch {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  }
}

export function CardTopCategorias({
  categorias,
}: CardTopCategoriasProps): ReactNode {
  if (!categorias || categorias.length === 0) return null;
  const itens = categorias.slice(0, 5);

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.heading2.size,
            lineHeight:
              typography.heading2.size * typography.heading2.lineHeight,
          }}
        >
          Categorias mais frequentes
        </Text>

        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          {itens.map((cat, idx) => {
            const pct = Math.max(0, Math.min(1, cat.percentual));
            return (
              <View
                key={`${cat.nome}-${idx}`}
                style={{ gap: 4 }}
                accessibilityLabel={`categoria ${cat.nome}`}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      color: colors.fg,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: typography.body.size,
                      lineHeight:
                        typography.body.size * typography.body.lineHeight,
                    }}
                  >
                    {cat.nome}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: typography.body.size,
                      lineHeight:
                        typography.body.size * typography.body.lineHeight,
                    }}
                  >
                    {formatarBRL(cat.valor)}
                  </Text>
                </View>

                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.bgElev,
                    overflow: 'hidden',
                  }}
                  accessibilityLabel={`percentual ${Math.round(pct * 100)}`}
                >
                  <MotiView
                    from={{ width: '0%' as `${number}%` }}
                    animate={{
                      width: `${(pct * 100).toFixed(2)}%` as `${number}%`,
                    }}
                    transition={{ ...springs.subtle, delay: idx * 60 }}
                    style={{
                      height: '100%',
                      backgroundColor: colors.cyan,
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}
