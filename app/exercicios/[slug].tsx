// Tela 08 - Detalhe de exercício. Mostra GIF full-width 16:9 (ou
// placeholder), nome em laranja, chips cyan dos grupos musculares,
// linha de meta-info (nível - equipamento - carga recente),
// BlocoInstrucao, lista de dicas em bullet, HistoricoSparkline
// (com tooltip ao tap), linha "Última vez: ..." e os 3 botoes
// Editar / Adicionar a treino livre / Excluir. Excluir abre modal
// destrutivo.
//
// Carrega via lerExercicio(vaultRoot, slug). Se não encontrar,
// mostra empty state e oferece voltar.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';
import {
  Button,
  Chip,
  EmptyState,
  Header,
  Screen,
  useToast,
} from '@/components/ui';
import {
  BlocoInstrucao,
  HistoricoSparkline,
} from '@/components/exercicios';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import {
  lerExercicio,
  excluirExercicio,
} from '@/lib/vault/exercicios';
import { adicionarTreinoLivre } from '@/lib/exercicios/adicionarTreinoLivre';
import { useLarguraFrame } from '@/lib/ui/useLarguraFrame';
import { formatGrupoMuscular } from '@/lib/exercicios/grupos';
import type { Exercicio } from '@/lib/schemas/exercicio';

const NIVEL_LABEL: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

// Formata data ISO em DD/MM (curto). Reaproveita logica do sparkline.
function formatDM(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}`;
}

export default function DetalheExercicio() {
  const router = useRouter();
  const toast = useToast();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const larguraFrame = useLarguraFrame();

  const [exercicio, setExercicio] = useState<Exercicio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalExcluirVisivel, setModalExcluirVisivel] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function carregar() {
      if (!vaultRoot || !slug) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      try {
        const meta = await lerExercicio(vaultRoot, slug);
        if (!cancelled) setExercicio(meta);
      } finally {
        if (!cancelled) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      cancelled = true;
    };
  }, [vaultRoot, slug]);

  const gifUri = useMemo(() => {
    if (!vaultRoot || !exercicio?.gif) return null;
    const trimmedRoot = vaultRoot.endsWith('/')
      ? vaultRoot.slice(0, -1)
      : vaultRoot;
    return `${trimmedRoot}/${exercicio.gif}`;
  }, [vaultRoot, exercicio?.gif]);

  const ultima = useMemo(() => {
    if (!exercicio || exercicio.historico.length === 0) return null;
    return exercicio.historico[exercicio.historico.length - 1];
  }, [exercicio]);

  const cargaRecenteLabel = useMemo(() => {
    if (!ultima) return null;
    return `${ultima.carga} kg`;
  }, [ultima]);

  const irParaEdicao = useCallback(() => {
    if (!slug) return;
    router.push({
      pathname: '/exercicios/[slug]/editar',
      params: { slug },
    });
  }, [router, slug]);

  const handleAdicionarTreinoLivre = useCallback(async () => {
    if (!vaultRoot || !exercicio) return;
    try {
      await adicionarTreinoLivre({
        vaultRoot,
        exercicioSlug: exercicio.slug,
        autor: pessoaAtiva,
      });
      haptics.success();
      toast.show(
        'Salvo em treino livre. Aparece quando a M11 chegar.',
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha desconhecida';
      haptics.error();
      toast.show(`Falha ao salvar: ${msg}`, 'error');
    }
  }, [exercicio, pessoaAtiva, toast, vaultRoot]);

  const confirmarExclusao = useCallback(async () => {
    if (!vaultRoot || !exercicio) return;
    setModalExcluirVisivel(false);
    try {
      await excluirExercicio(vaultRoot, exercicio.slug);
      haptics.medium();
      toast.show('Exercício movido para a lixeira.', 'success');
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha desconhecida';
      haptics.error();
      toast.show(`Falha ao excluir: ${msg}`, 'error');
    }
  }, [exercicio, router, toast, vaultRoot]);

  // Empty / carregando.
  if (carregando) {
    return (
      <Screen>
        <Header title="Exercício" onBack={() => router.back()} />
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  if (!exercicio) {
    return (
      <Screen>
        <Header title="Exercício" onBack={() => router.back()} />
        <EmptyState
          frase="Exercício não encontrado. Talvez tenha sido excluído."
          Icon={Dumbbell}
        />
      </Screen>
    );
  }

  // Em web usa FRAME_W via useLarguraFrame; em native usa a largura
  // dinamica do viewport (orientacao, split-screen).
  const larguraConteudo = larguraFrame - spacing.lg * 2;

  return (
    <Screen>
      <Header title="Exercício" onBack={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* GIF full-width 16:9 ou placeholder */}
        <View
          style={{
            aspectRatio: 16 / 9,
            backgroundColor: colors.bgAlt,
            borderRadius: radius.card,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {gifUri ? (
            <Image
              source={{ uri: gifUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              accessibilityLabel={`gif ${exercicio.slug}`}
            />
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Dumbbell
                size={48}
                color={colors.mutedDecor}
                strokeWidth={1.5}
              />
              <Text
                style={{
                  color: colors.mutedDecor,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 14,
                }}
              >
                Sem mídia
              </Text>
            </View>
          )}
        </View>

        {/* Nome */}
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 22,
            lineHeight: 28,
          }}
        >
          {exercicio.nome}
        </Text>

        {/* Chips grupo muscular cyan */}
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
        >
          {exercicio.grupo_muscular.map((g) => (
            <Chip
              key={g}
              label={formatGrupoMuscular(g)}
              selected
              onPress={() => undefined}
              accent="cyan"
            />
          ))}
        </View>

        {/* Linha meta-info: nível - equipamento - carga */}
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {NIVEL_LABEL[exercicio.nivel] ?? exercicio.nivel}
          {' - '}
          {exercicio.equipamento}
          {cargaRecenteLabel ? ` - ${cargaRecenteLabel}` : ''}
        </Text>

        {/* Bloco instrucao */}
        <BlocoInstrucao texto={exercicio.instrucao} />

        {/* Bloco dicas (lista bullet em muted) */}
        {exercicio.dicas.length > 0 ? (
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
              Dicas
            </Text>
            <View style={{ gap: spacing.xs }}>
              {exercicio.dicas.map((d, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', gap: spacing.xs }}
                >
                  <Text
                    style={{
                      color: colors.mutedDecor,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 14,
                      lineHeight: 22,
                    }}
                  >
                    -
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      color: colors.muted,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 14,
                      lineHeight: 22,
                    }}
                  >
                    {d}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Sparkline com tooltip */}
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
            Histórico (carga em kg)
          </Text>
          <HistoricoSparkline
            historico={exercicio.historico}
            largura={larguraConteudo}
          />
          {ultima ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Última vez: {formatDM(ultima.data)}, {ultima.carga} kg,{' '}
              {ultima.series}x{ultima.reps}
            </Text>
          ) : null}
        </View>

        {/* Botoes ação */}
        <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
          <Button label="Editar" onPress={irParaEdicao} variant="ghost" />
          <Button
            label="Adicionar a treino livre"
            onPress={() => void handleAdicionarTreinoLivre()}
            variant="primary"
          />
          <Pressable
            onPress={() => {
              haptics.light();
              setModalExcluirVisivel(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="excluir exercicio"
            style={{
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.red,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              Excluir
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal destrutivo confirmar exclusao */}
      <Modal
        visible={modalExcluirVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalExcluirVisivel(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 21, 26, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: radius.modal,
              padding: spacing.lg,
              gap: spacing.base,
              width: '100%',
              maxWidth: 360,
            }}
            accessibilityLabel="modal confirmar exclusao"
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 22,
              }}
            >
              Excluir exercício?
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              O arquivo será movido para a lixeira. Você pode
              recuperá-lo manualmente em até 30 dias.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Confirmar exclusão"
                onPress={() => void confirmarExclusao()}
                variant="destructive"
              />
              <Button
                label="Cancelar"
                onPress={() => setModalExcluirVisivel(false)}
                variant="ghost"
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
