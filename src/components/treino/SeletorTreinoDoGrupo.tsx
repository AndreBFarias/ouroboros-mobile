// Q19.b -- Conteudo do BottomSheet "Qual treino hoje?" disparado pelo
// botao Iniciar do detalhe de Grupo. Carrega cada rotina referenciada
// no grupo e renderiza um Pressable por rotina; tap dispara
// onSelect(rotinaSlug) -- caller navega para /treinos/executar/<slug>.
//
// Trata rotinas faltantes (deletadas apos criar o grupo): se uma slug
// nao resolve em lerRotina, aparece com etiqueta "Rotina removida"
// desabilitada para nao quebrar o sheet inteiro.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Dumbbell } from '@/lib/icons';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { lerRotina } from '@/lib/vault/rotina';
import type { GrupoTreino } from '@/lib/schemas/grupo_treino';
import type { RotinaMeta } from '@/lib/schemas/rotina';

export interface SeletorTreinoDoGrupoProps {
  grupo: GrupoTreino;
  onSelect: (rotinaSlug: string) => void;
  onCancelar: () => void;
}

interface ItemResolvido {
  slug: string;
  rotina: RotinaMeta | null;
}

export function SeletorTreinoDoGrupo({
  grupo,
  onSelect,
  onCancelar,
}: SeletorTreinoDoGrupoProps): ReactNode {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [itens, setItens] = useState<ItemResolvido[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!vaultRoot) {
        setItens(grupo.rotina_slugs.map((s) => ({ slug: s, rotina: null })));
        setCarregando(false);
        return;
      }
      try {
        const resolvidos = await Promise.all(
          grupo.rotina_slugs.map(async (slug) => {
            try {
              const rotina = await lerRotina(vaultRoot, slug);
              return { slug, rotina };
            } catch {
              return { slug, rotina: null };
            }
          })
        );
        if (!cancelado) setItens(resolvidos);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [vaultRoot, grupo.rotina_slugs]);

  const handleEscolher = (slug: string) => {
    haptics.light();
    onSelect(slug);
  };

  return (
    <BottomSheetView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          Qual treino hoje?
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {grupo.nome}
        </Text>

        {carregando ? (
          <Text
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            carregando rotinas…
          </Text>
        ) : (
          itens.map((item) => {
            const disponivel = item.rotina !== null;
            return (
              <Pressable
                key={item.slug}
                onPress={() => disponivel && handleEscolher(item.slug)}
                disabled={!disponivel}
                accessibilityRole="button"
                accessibilityLabel={
                  disponivel
                    ? `iniciar rotina ${item.rotina!.nome}`
                    : `rotina ${item.slug} removida`
                }
                style={{
                  backgroundColor: colors.bgAlt,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.bgElev,
                  padding: spacing.base,
                  gap: spacing.xs,
                  opacity: disponivel ? 1 : 0.4,
                }}
              >
                {disponivel ? (
                  <>
                    <Text
                      style={{
                        color: colors.fg,
                        fontFamily: 'JetBrainsMono_500Medium',
                        fontSize: 14,
                        lineHeight: 22,
                      }}
                      numberOfLines={1}
                    >
                      {item.rotina!.nome}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedDecor,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 11,
                        lineHeight: 16,
                      }}
                    >
                      {`${item.rotina!.exercicios.length} ${
                        item.rotina!.exercicios.length === 1
                          ? 'exercício'
                          : 'exercícios'
                      }`}
                    </Text>
                  </>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <Dumbbell
                      size={16}
                      color={colors.mutedDecor}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={{
                        color: colors.muted,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 13,
                        lineHeight: 20,
                      }}
                    >
                      Rotina removida ({item.slug})
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })
        )}

        <View style={{ marginTop: spacing.base }}>
          <Button label="Cancelar" onPress={onCancelar} variant="ghost" />
        </View>
      </ScrollView>
    </BottomSheetView>
  );
}
