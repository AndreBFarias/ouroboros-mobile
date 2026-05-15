// Lista de Rotinas de Treino (Q11.a). Renderiza:
//   - Header "Rotinas" + chevron de voltar.
//   - Cada item: card com nome (fg medium), descricao (muted) e N
//     exercicios (mutedDecor pequeno). Tap navega para /rotinas/<slug>.
//   - Empty state explicativo quando nenhuma rotina cadastrada.
//   - FAB + abre /rotinas/novo.
//
// Carrega via useFocusEffect + listarRotinas, filtrando por autor (cada
// pessoa ve apenas as proprias rotinas, padrao de privacidade do Vault).
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
import { listarRotinas } from '@/lib/vault/rotina';
import type { RotinaMeta } from '@/lib/schemas/rotina';

export default function RotinasIndex() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [rotinas, setRotinas] = useState<RotinaMeta[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setRotinas([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarRotinas(vaultRoot, pessoaAtiva);
      setRotinas(lista);
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
    router.push('/rotinas/novo');
  }, [router]);

  const handleAbrir = useCallback(
    (slug: string) => {
      router.push({ pathname: '/rotinas/[slug]', params: { slug } });
    },
    [router]
  );

  const semDados = !carregando && rotinas.length === 0;

  return (
    <Screen>
      <Header title="Rotinas" onBack={() => router.back()} />

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
            frase="Nenhuma rotina ainda. Crie uma para reutilizar como template de treino."
            Icon={Dumbbell}
          />
        ) : (
          rotinas.map((rotina) => (
            <Pressable
              key={rotina.slug}
              onPress={() => handleAbrir(rotina.slug)}
              accessibilityRole="button"
              accessibilityLabel={`abrir rotina ${rotina.nome}`}
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
                {rotina.nome}
              </Text>
              {rotina.descricao && rotina.descricao.trim().length > 0 ? (
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                  numberOfLines={2}
                >
                  {rotina.descricao}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: spacing.xs,
                }}
              >
                <Text
                  style={{
                    color: colors.mutedDecor,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 11,
                    lineHeight: 16,
                  }}
                >
                  {`${rotina.exercicios.length} ${
                    rotina.exercicios.length === 1 ? 'exercício' : 'exercícios'
                  }`}
                </Text>
                <Text
                  style={{
                    color: colors.mutedDecor,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 11,
                    lineHeight: 16,
                  }}
                >
                  {rotina.data_criacao}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <FAB onPress={handleNovo} accessibilityLabel="nova rotina" />
    </Screen>
  );
}
