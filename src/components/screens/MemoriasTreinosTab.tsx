// Tela 09 - Aba Treinos da MemoriasScreen. Heatmap 13x7 dos ultimos
// 91 dias de sessoes formais, stats em cyan ("X treinos em 90 dias")
// e legenda muted "Menos -> Mais". Tap em quadrado abre detalhe da
// sessao do dia. Botao + flutuante para criar nova sessao.
//
// Quando o dia tem 2+ sessoes, abre a mais recente (sessoes de
// rotina dupla so foram modeladas como 1 arquivo na M11; multi-
// sessoes/dia entram no V2 quando aplicavel).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import {
  BottomSheet,
  EmptyState,
  FAB,
  SHEET_60,
  SHEET_90,
  type BottomSheetRef,
} from '@/components/ui';
import {
  HeatmapBase,
  PALETA_TREINOS,
  montarCelulasUltimos91Dias,
  type HeatmapCell,
} from '@/components/data';
import { colors, spacing } from '@/theme/tokens';
import { useTreinos } from '@/lib/hooks/useTreinos';
import { SheetNovoTreino } from './SheetNovoTreino';
import { DetalheDiaTreinoModal } from './DetalheDiaTreinoModal';
import { treinosPath } from '@/lib/vault/paths';
import { slugifyTreino } from '@/lib/treinos/slug';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

export function MemoriasTreinosTab(): ReactNode {
  const { sessoes, recarregar } = useTreinos();
  const detalheRef = useRef<BottomSheetRef>(null);
  const novoRef = useRef<BottomSheetRef>(null);
  const editarRef = useRef<BottomSheetRef>(null);

  const [sessaoSelecionada, setSessaoSelecionada] =
    useState<TreinoSessao | null>(null);
  const [editandoSessao, setEditandoSessao] = useState<TreinoSessao | null>(
    null
  );

  // Mapeia sessoes para contagem por dia. Permite acesso O(1) ao
  // tap em uma celula do heatmap.
  const { celulas, sessoesPorDia, total } = useMemo(() => {
    const contagens: Record<string, number> = {};
    const porDia: Record<string, TreinoSessao[]> = {};
    for (const s of sessoes) {
      const ymd = s.data.slice(0, 10);
      contagens[ymd] = (contagens[ymd] ?? 0) + 1;
      const arr = porDia[ymd] ?? [];
      arr.push(s);
      porDia[ymd] = arr;
    }
    const cels = montarCelulasUltimos91Dias(contagens);
    return {
      celulas: cels,
      sessoesPorDia: porDia,
      total: sessoes.length,
    };
  }, [sessoes]);

  const handleCelulaPress = useCallback(
    (cel: HeatmapCell) => {
      if (!cel.data) return;
      const lista = sessoesPorDia[cel.data];
      if (!lista || lista.length === 0) return;
      // Abre a mais recente do dia.
      const escolhida = lista[0];
      setSessaoSelecionada(escolhida);
      detalheRef.current?.expand();
    },
    [sessoesPorDia]
  );

  const handleNovo = useCallback(() => {
    novoRef.current?.expand();
  }, []);

  const handleEditar = useCallback(() => {
    if (!sessaoSelecionada) return;
    detalheRef.current?.close();
    setEditandoSessao(sessaoSelecionada);
    setTimeout(() => editarRef.current?.expand(), 250);
  }, [sessaoSelecionada]);

  const handleExcluido = useCallback(() => {
    detalheRef.current?.close();
    setSessaoSelecionada(null);
    void recarregar();
  }, [recarregar]);

  const handleSalvoNovo = useCallback(() => {
    novoRef.current?.close();
    void recarregar();
  }, [recarregar]);

  const handleSalvoEdicao = useCallback(() => {
    editarRef.current?.close();
    setEditandoSessao(null);
    setSessaoSelecionada(null);
    void recarregar();
  }, [recarregar]);

  const sessaoPathRel = useMemo(() => {
    if (!sessaoSelecionada) return '';
    const dataDate = new Date(sessaoSelecionada.data);
    const slug = slugifyTreino(sessaoSelecionada.rotina ?? 'treino');
    return treinosPath(dataDate, slug);
  }, [sessaoSelecionada]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.cyan,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 16,
            lineHeight: 24,
          }}
        >
          {total === 0
            ? 'Sem treinos nos últimos 90 dias.'
            : `${total} ${total === 1 ? 'treino' : 'treinos'} em 90 dias.`}
        </Text>

        <HeatmapBase
          celulas={celulas}
          paleta={PALETA_TREINOS}
          onCelulaPress={handleCelulaPress}
          accessibilityLabel="heatmap de treinos"
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            Menos
          </Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {PALETA_TREINOS.map((cor, i) => (
              <View
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: cor,
                }}
              />
            ))}
          </View>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            Mais
          </Text>
        </View>

        {total === 0 ? (
          <EmptyState frase="Vai aparecer aqui assim que você treinar." />
        ) : null}
      </ScrollView>

      <FAB
        icon={<Plus size={24} color={colors.bg} strokeWidth={2} />}
        onPress={handleNovo}
        accessibilityLabel="adicionar treino"
      />

      <BottomSheet ref={detalheRef} snapPoints={SHEET_60} index={-1}>
        {sessaoSelecionada ? (
          <DetalheDiaTreinoModal
            sessao={sessaoSelecionada}
            pathRelativo={sessaoPathRel}
            onEditar={handleEditar}
            onExcluido={handleExcluido}
            onFechar={() => {
              detalheRef.current?.close();
              setSessaoSelecionada(null);
            }}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet ref={novoRef} snapPoints={SHEET_90} index={-1}>
        <SheetNovoTreino
          inicial={null}
          onSalvo={handleSalvoNovo}
          onCancelar={() => novoRef.current?.close()}
        />
      </BottomSheet>

      <BottomSheet ref={editarRef} snapPoints={SHEET_90} index={-1}>
        {editandoSessao ? (
          <SheetNovoTreino
            inicial={editandoSessao}
            slugOriginal={(() => {
              const d = new Date(editandoSessao.data);
              const slug = slugifyTreino(editandoSessao.rotina ?? 'treino');
              return treinosPath(d, slug);
            })()}
            onSalvo={handleSalvoEdicao}
            onCancelar={() => {
              editarRef.current?.close();
              setEditandoSessao(null);
            }}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}
