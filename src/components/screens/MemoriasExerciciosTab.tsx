// Aba Exercicios da SaudeFisicaScreen (sprint L1, 2026-05-07).
// Reusa a logica de listagem + busca da rota /exercicios (Tela 07) em
// formato de tab interno: filtro por grupo muscular, busca por nome,
// grid 2 colunas com GIF preview. Sem Header proprio (a screen pai ja
// renderiza "Saude Fisica") e sem FAB proprio (o MenuCapturaVerde
// unificado absorve "Adicionar exercicio" via acao contextual).
//
// O FAB+ verde original da rota /exercicios continua existindo so
// quando a galeria e' acessada via /exercicios direto; aqui dentro da
// tab, a acao contextual do MenuCapturaVerde e' o caminho canonico
// (M34.3). Coexistencia evita ambiguidade de fluxo.
//
// Tap em card abre /exercicios/[slug]; long-press abre a edicao em
// /exercicios/[slug]/editar. Igual ao comportamento da rota standalone.
//
// Comentarios sem acento (convencao shell/CI).
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from '@/lib/icons';
import { Input, ChipGroup, EmptyState } from '@/components/ui';
import { CardGaleria } from '@/components/exercicios';
import { colors, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { listarExercicios } from '@/lib/vault/exercicios';
import { GRUPOS_MUSCULARES_OPTIONS } from '@/lib/exercicios/grupos';
import type { Exercicio } from '@/lib/schemas/exercicio';
import type { AcaoExtraCaptura } from '@/components/chrome/MenuCapturaVerde';

// M34.3: prop opcional usada pela SaudeFisicaScreen para coletar a
// acao contextual e injetar no MenuCapturaVerde. Quando undefined a
// tab funciona isoladamente (sem FAB visivel) — caller deve prover
// outro disparador se for o caso.
export interface MemoriasExerciciosTabProps {
  onRegistrarAcaoExtra?: (acao: AcaoExtraCaptura | null) => void;
}

export function MemoriasExerciciosTab({
  onRegistrarAcaoExtra,
}: MemoriasExerciciosTabProps = {}): ReactNode {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [grupo, setGrupo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Recarrega a lista quando vault, grupo ou search mudarem; tambem
  // recarrega ao voltar para a tela (focus) para refletir edicoes
  // feitas em outras rotas.
  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setExercicios([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarExercicios(vaultRoot, { grupo, search });
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

  // Resolve URI absoluto do GIF a partir do path relativo. Quando
  // vazio, devolve null para o card mostrar placeholder. Mesma logica
  // de app/exercicios/index.tsx para manter paridade.
  const resolveGifUri = useCallback(
    (relPath: string): string | null => {
      if (!vaultRoot || !relPath || relPath.length === 0) return null;
      const trimmedRoot = vaultRoot.endsWith('/')
        ? vaultRoot.slice(0, -1)
        : vaultRoot;
      return `${trimmedRoot}/${relPath}`;
    },
    [vaultRoot]
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
  // renderizar grid 2 colunas. Evita FlatList numColumns que nao
  // recalcula bem em web.
  const linhas = useMemo(() => {
    const out: Exercicio[][] = [];
    for (let i = 0; i < exercicios.length; i += 2) {
      out.push(exercicios.slice(i, i + 2));
    }
    return out;
  }, [exercicios]);

  const filtrosAtivos =
    (grupo !== null && grupo.length > 0) || search.length > 0;

  // M34.3: registra "Adicionar exercicio" no MenuCapturaVerde da
  // screen pai. Limpa no unmount para evitar leak da acao em outras
  // tabs.
  useEffect(() => {
    if (!onRegistrarAcaoExtra) return;
    onRegistrarAcaoExtra({
      label: 'Adicionar exercício',
      icone: <Plus size={20} color={colors.green} strokeWidth={2} />,
      onPress: irParaNovo,
      accessibilityLabel: 'adicionar exercicio',
    });
    return () => {
      onRegistrarAcaoExtra(null);
    };
  }, [onRegistrarAcaoExtra, irParaNovo]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
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
              gifUri={resolveGifUri(ex.gif)}
              onPress={() => irParaDetalhe(ex.slug)}
              onLongPress={() => irParaEdicao(ex.slug)}
            />
          ))}
          {linha.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </ScrollView>
  );
}
