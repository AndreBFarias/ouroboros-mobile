// Tela 07 - Galeria de exercícios. Grid 2 colunas de cards 1:1 com
// GIF preview + nome em laranja. ChipGroup multi de filtro por
// grupo muscular, input search por nome, FAB "+ novo" abre a Tela
// 02 (cadastro). Empty state quando ainda não ha exercícios.
//
// Carrega lista do Vault via listarExercicios(vaultRoot, filtros).
// Cada filtro re-dispara a leitura. Lista ordenada por nome
// (accent-insensitive) no proprio helper.
//
// Long-press no card abre menu rapido (Editar / Excluir). Tap abre
// detalhe.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from '@/lib/icons';
import {
  Header,
  Screen,
  Input,
  ChipGroup,
  EmptyState,
  FAB,
} from '@/components/ui';
import { CardGaleria } from '@/components/exercicios';
import { colors, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { listarExercicios } from '@/lib/vault/exercicios';
import { GRUPOS_MUSCULARES_OPTIONS } from '@/lib/exercicios/grupos';
import type { Exercicio } from '@/lib/schemas/exercicio';

export default function GaleriaExercicios() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [grupo, setGrupo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Recarrega a lista quando vault, grupo ou search mudarem.
  // Também recarrega ao voltar para a tela (focus) para refletir
  // edicoes e exclusoes feitas em outras rotas.
  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setExercicios([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarExercicios(vaultRoot, {
        grupo,
        search,
      });
      setExercicios(lista);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, grupo, search]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const irParaDetalhe = useCallback(
    (slug: string) => {
      router.push({ pathname: '/exercicios/[slug]', params: { slug } });
    },
    [router]
  );

  const irParaEdicao = useCallback(
    (slug: string) => {
      router.push({
        pathname: '/exercicios/[slug]/editar',
        params: { slug },
      });
    },
    [router]
  );

  const irParaNovo = useCallback(() => {
    router.push('/exercicios/novo');
  }, [router]);

  // Layout em pares: divide a lista em linhas de 2 elementos para
  // renderizar grid 2 colunas com View flex-row + flex-1. Evita
  // depender de FlatList numColumns que não recalcula bem em web.
  const linhas = useMemo(() => {
    const out: Exercicio[][] = [];
    for (let i = 0; i < exercicios.length; i += 2) {
      out.push(exercicios.slice(i, i + 2));
    }
    return out;
  }, [exercicios]);

  const filtrosAtivos =
    (grupo !== null && grupo.length > 0) || search.length > 0;

  return (
    <Screen>
      <Header title="Galeria" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Filtro grupo muscular */}
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
            Grupo muscular
          </Text>
          <ChipGroup
            mode="single"
            options={GRUPOS_MUSCULARES_OPTIONS as never}
            value={grupo}
            onChange={setGrupo}
          />
        </View>

        {/* Busca por nome */}
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome"
          accessibilityLabel="campo de busca de exercicio"
        />

        {/* Lista */}
        {!carregando && exercicios.length === 0 ? (
          <EmptyState
            frase={
              filtrosAtivos
                ? 'Nenhum exercício corresponde ao filtro.'
                : 'Nenhum exercício cadastrado ainda. Use o + para criar.'
            }
          />
        ) : null}

        {linhas.map((linha, idx) => (
          <View
            key={`linha-${idx}`}
            style={{ flexDirection: 'row', gap: spacing.sm }}
          >
            {linha.map((ex) => (
              <CardGaleria
                key={ex.slug}
                exercicio={ex}
                onPress={() => irParaDetalhe(ex.slug)}
                onLongPress={() => irParaEdicao(ex.slug)}
              />
            ))}
            {/* Quando linha tem 1 elemento, ocupa metade com spacer
                vazio para não esticar o card sozinho. */}
            {linha.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </ScrollView>

      <FAB
        icon={<Plus size={24} color={colors.bg} strokeWidth={2} />}
        onPress={irParaNovo}
        accessibilityLabel="adicionar exercicio"
      />
    </Screen>
  );
}
