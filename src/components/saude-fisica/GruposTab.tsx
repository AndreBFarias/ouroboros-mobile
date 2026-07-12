// R-SF-1 (Onda R, 2026-05-16): Aba "Grupos" da SaudeFisicaScreen.
//
// Q19 entregou schema + form completo + rotas standalone em /grupos.
// Esta tab EXPOE os mesmos Grupos dentro de Saude Fisica para reduzir
// "Onde fica?" do usuario que esta na tela de treinos e quer ver/
// criar/editar agrupamentos.
//
// Comportamento:
//   - Lista grupos via listarGrupos (mesmo store das rotas /grupos/*).
//   - Empty state quando nao ha grupos (mesma frase de /grupos/index).
//   - Tap em grupo navega para /grupos/<slug> (edicao + iniciar treino
//     existem la em Q19.b -- nao reinventamos).
//   - FAB unificado (MenuCapturaVerde) recebe acao contextual
//     "Novo grupo" via onRegistrarAcaoExtra. Tap navega para
//     /grupos/novo (mesma rota de criacao da Q19.b).
//
// Idempotencia: usa as mesmas funcoes de vault (listarGrupos) que as
// rotas standalone /grupos consomem; alteracoes feitas em qualquer dos
// dois caminhos refletem no outro apos recarregar (useFocusEffect).
//
// Comentarios sem acento (convencao shell/CI).
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Dumbbell, Plus } from '@/lib/icons';
import { EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { listarGrupos } from '@/lib/vault/grupo_treino';
import type { GrupoTreino } from '@/lib/schemas/grupo_treino';
import type { AcaoExtraCaptura } from '@/components/chrome/MenuCapturaVerde';

// Prop opcional: SaudeFisicaScreen coleta a acao contextual da tab e
// injeta no MenuCapturaVerde. Padrao M34.3 igual as outras tabs.
export interface GruposTabProps {
  onRegistrarAcaoExtra?: (acao: AcaoExtraCaptura | null) => void;
}

export function GruposTab({
  onRegistrarAcaoExtra,
}: GruposTabProps = {}): ReactNode {
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

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Recarrega ao voltar para a tab (apos criar/editar em /grupos/*).
  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const handleNovo = useCallback(() => {
    haptics.light();
    // Cast: typedRoutes pode nao ter as rotas /grupos/* tipadas em
    // todo rebuild. Mesmo cast usado em app/grupos/index.tsx.
    router.push('/grupos/novo' as Parameters<typeof router.push>[0]);
  }, [router]);

  const handleAbrir = useCallback(
    (slug: string) => {
      router.push(`/grupos/${slug}` as Parameters<typeof router.push>[0]);
    },
    [router]
  );

  // Registra "Novo grupo" como acao contextual no MenuCapturaVerde.
  // Padrao M34.3: cleanup no unmount evita leak de acao em outras tabs.
  useEffect(() => {
    if (!onRegistrarAcaoExtra) return;
    onRegistrarAcaoExtra({
      label: 'Novo grupo',
      icone: <Plus size={20} color={colors.green} strokeWidth={2} />,
      onPress: handleNovo,
      accessibilityLabel: 'novo grupo',
    });
    return () => {
      onRegistrarAcaoExtra(null);
    };
  }, [onRegistrarAcaoExtra, handleNovo]);

  const semDados = !carregando && grupos.length === 0;

  return (
    <View style={{ flex: 1 }}>
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
    </View>
  );
}
