// Lista de Grupos de Treino (Q19, Onda Q 2026-05-13).
// MVP esqueleto: carrega lista + empty state + FAB criar.
// Detalhe (/grupos/[slug]) e edicao ficam para sprint Q19.b.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Dumbbell } from '@/lib/icons';
import { EmptyState, FAB, Header, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { listarGrupos } from '@/lib/vault/grupo_treino';
import type { GrupoTreino } from '@/lib/schemas/grupo_treino';

export default function GruposIndex() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [grupos, setGrupos] = useState<GrupoTreino[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setGrupos([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarGrupos(vaultRoot, pessoaAtiva);
      setGrupos(lista);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, pessoaAtiva]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const handleNovo = useCallback(() => {
    haptics.light();
    // Cast: rotas /grupos/* sao novas em Q19, ainda nao geradas pelo
    // typedRoutes do expo-router. Refresh em proximo rebuild.
    router.push('/grupos/novo' as Parameters<typeof router.push>[0]);
  }, [router]);

  const handleAbrir = useCallback(
    (slug: string) => {
      router.push(`/grupos/${slug}` as Parameters<typeof router.push>[0]);
    },
    [router]
  );

  const semDados = !carregando && grupos.length === 0;

  return (
    <Screen>
      <Header title="Grupos de treino" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        {semDados ? (
          <EmptyState
            frase="Crie um grupo para reunir várias rotinas (Treino A, B, C)."
            Icon={Dumbbell}
          />
        ) : (
          grupos.map((g) => (
            <Pressable
              key={g.slug}
              onPress={() => handleAbrir(g.slug)}
              accessibilityRole="button"
              accessibilityLabel={`abrir grupo ${g.nome}`}
              style={{
                backgroundColor: colors.bgAlt,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.bgElev,
                padding: spacing.base,
                gap: spacing.xs,
              }}
            >
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 14,
                  lineHeight: 22,
                }}
                numberOfLines={1}
              >
                {g.nome}
              </Text>
              <Text
                style={{
                  color: colors.mutedDecor,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 16,
                }}
              >
                {`${g.rotina_slugs.length} ${
                  g.rotina_slugs.length === 1 ? 'rotina' : 'rotinas'
                }`}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <FAB onPress={handleNovo} accessibilityLabel="novo grupo" />
    </Screen>
  );
}
