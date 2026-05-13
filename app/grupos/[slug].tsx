// Stub de detalhe de Grupo de Treino (Q19, sprint follow-up).
// Carrega o grupo pelo slug + lista os slugs das rotinas. Edicao
// completa entra em Q19.b dedicada (mesmo form de criacao).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { lerGrupo } from '@/lib/vault/grupo_treino';
import type { GrupoTreino } from '@/lib/schemas/grupo_treino';

export default function GrupoDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slugParam = typeof params.slug === 'string' ? params.slug : null;
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [grupo, setGrupo] = useState<GrupoTreino | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot || !slugParam) {
      setGrupo(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lido = await lerGrupo(vaultRoot, slugParam);
      setGrupo(lido);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, slugParam]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando) {
    return (
      <Screen>
        <Header title="Grupo" onBack={() => router.back()} />
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  if (!grupo) {
    return (
      <Screen>
        <Header title="Grupo" onBack={() => router.back()} />
        <View style={{ flex: 1, paddingTop: spacing.huge }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            Grupo não encontrado.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={grupo.nome} onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
      >
        {grupo.descricao && grupo.descricao.trim().length > 0 ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            {grupo.descricao}
          </Text>
        ) : null}

        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 16,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Rotinas vinculadas
        </Text>

        {grupo.rotina_slugs.map((s) => (
          <View
            key={s}
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.bgElev,
              padding: spacing.base,
            }}
            accessibilityLabel={`rotina vinculada ${s}`}
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {s}
            </Text>
          </View>
        ))}

        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
            marginTop: spacing.base,
          }}
        >
          Botão "Iniciar treino" e edição entram em Q19.b.
        </Text>
      </ScrollView>
    </Screen>
  );
}
