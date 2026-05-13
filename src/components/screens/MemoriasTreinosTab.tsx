// Tela 09 - Aba Treinos da MemoriasScreen. Heatmap 13x7 dos ultimos
// 91 dias de sessoes formais, stats em cyan ("X treinos em 90 dias")
// e legenda muted "Menos -> Mais". Tap em quadrado abre detalhe da
// sessao do dia.
//
// Quando o dia tem 2+ sessoes, abre a mais recente (sessoes de
// rotina dupla so foram modeladas como 1 arquivo na M11; multi-
// sessoes/dia entram no V2 quando aplicavel).
//
// M34.3: o FAB proprio "adicionar treino" foi REMOVIDO porque colidia
// com o FAB verde do MenuCapturaVerde (mesmas coordenadas 769,900).
// A tab registra "Novo treino" como acao contextual via
// onRegistrarAcaoExtra; o sheet do MenuCapturaVerde unificado a
// renderiza como primeiro item. Sheets internos preservados.
//
// Comentarios sem acento (convencao shell/CI).
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from '@/lib/icons';
import {
  BottomSheet,
  Button,
  EmptyState,
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
import { treinosPath, formatDateYmd } from '@/lib/vault/paths';
import { slugifyTreino } from '@/lib/treinos/slug';
import { SeletorRotina } from '@/components/treino/SeletorRotina';
import { sessaoFromRotina } from '@/lib/treino/sessaoFromRotina';
import { usePessoa } from '@/lib/stores/pessoa';
import type { RotinaMeta } from '@/lib/schemas/rotina';
import type { AcaoExtraCaptura } from '@/components/chrome/MenuCapturaVerde';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

// M34.3: prop opcional usada pela MemoriasScreen para coletar a acao
// contextual da tab e injetar no MenuCapturaVerde. Quando undefined a
// tab funciona isoladamente.
export interface MemoriasTreinosTabProps {
  onRegistrarAcaoExtra?: (acao: AcaoExtraCaptura | null) => void;
}

export function MemoriasTreinosTab({
  onRegistrarAcaoExtra,
}: MemoriasTreinosTabProps = {}): ReactNode {
  const router = useRouter();
  const { sessoes, recarregar } = useTreinos();
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const detalheRef = useRef<BottomSheetRef>(null);
  const novoRef = useRef<BottomSheetRef>(null);
  const editarRef = useRef<BottomSheetRef>(null);
  const seletorRotinaRef = useRef<BottomSheetRef>(null);
  // Q11.b: snapshot de rotina escolhida no SeletorRotina; alimenta o
  // SheetNovoTreino em criacao. Cada escolha gera nova referencia
  // para o useEffect interno do sheet detectar troca.
  const [pendingRotinaSnapshot, setPendingRotinaSnapshot] =
    useState<Partial<TreinoSessao> | null>(null);

  // M11.1 (§2.2): atalho navegacional para a galeria de exercicios.
  // Usuario que ainda nao tem exercicios cadastrados (FAB Salvar
  // disabled no SheetNovoTreino) consegue ir direto para /exercicios
  // sem precisar abrir o sheet primeiro.
  const handleAbrirGaleria = useCallback(() => {
    router.push('/exercicios');
  }, [router]);

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
      // Imutavel: evita mutar acumulador entre renders se React
      // reaproveitar o cache do useMemo em concorrente.
      porDia[ymd] = [...(porDia[ymd] ?? []), s];
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

  // M34.3: registra a acao "Novo treino" no MenuCapturaVerde da
  // screen pai. Limpa no unmount.
  useEffect(() => {
    if (!onRegistrarAcaoExtra) return;
    onRegistrarAcaoExtra({
      label: 'Novo treino',
      icone: <Plus size={20} color={colors.green} strokeWidth={2} />,
      onPress: handleNovo,
      accessibilityLabel: 'novo treino',
    });
    return () => {
      onRegistrarAcaoExtra(null);
    };
  }, [onRegistrarAcaoExtra, handleNovo]);

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
    setPendingRotinaSnapshot(null);
    void recarregar();
  }, [recarregar]);

  // Q11.b + Q15 (Onda Q): orquestracao do SeletorRotina sobre o
  // SheetNovoTreino. Fecha o sheet de baixo antes de abrir o seletor
  // (anti-empilhamento visual descoberto na validacao live 2026-05-12).
  // Reabre o sheet com 280ms de delay para a animacao de close do
  // primeiro completar — mesmo padrao do handleEditar acima.
  const REOPEN_DELAY_MS = 280;
  const handleAbrirSeletorRotina = useCallback(() => {
    novoRef.current?.close();
    setTimeout(() => seletorRotinaRef.current?.expand(), REOPEN_DELAY_MS);
  }, []);

  const handleEscolherRotina = useCallback(
    (rotina: RotinaMeta | null) => {
      seletorRotinaRef.current?.close();
      if (rotina !== null) {
        const snap = sessaoFromRotina(
          rotina,
          formatDateYmd(new Date()),
          pessoaAtiva
        );
        setPendingRotinaSnapshot(snap);
      }
      // Reabre o SheetNovoTreino apos a animacao de close do seletor.
      setTimeout(() => novoRef.current?.expand(), REOPEN_DELAY_MS);
    },
    [pessoaAtiva]
  );

  const handleCancelarSeletor = useCallback(() => {
    seletorRotinaRef.current?.close();
    setTimeout(() => novoRef.current?.expand(), REOPEN_DELAY_MS);
  }, []);

  const handleCancelarNovo = useCallback(() => {
    novoRef.current?.close();
    setPendingRotinaSnapshot(null);
  }, []);

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

        <View style={{ alignItems: 'center' }} accessibilityLabel="container heatmap centralizado">
          <HeatmapBase
            celulas={celulas}
            paleta={PALETA_TREINOS}
            onCelulaPress={handleCelulaPress}
            accessibilityLabel="heatmap de treinos"
          />
        </View>

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
          <View style={{ gap: spacing.base }}>
            <EmptyState frase="Vai aparecer aqui assim que você treinar." />
            <Button
              variant="ghost"
              label="Cadastrar exercícios na Galeria"
              onPress={handleAbrirGaleria}
            />
          </View>
        ) : null}
      </ScrollView>

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
          rotinaSnapshot={pendingRotinaSnapshot ?? undefined}
          onAbrirSeletorRotina={handleAbrirSeletorRotina}
          onSalvo={handleSalvoNovo}
          onCancelar={handleCancelarNovo}
        />
      </BottomSheet>

      {/* Q11.b: sheet do SeletorRotina aberto a partir do SheetNovoTreino. */}
      <BottomSheet ref={seletorRotinaRef} snapPoints={SHEET_60} index={-1}>
        <SeletorRotina
          onSelect={handleEscolherRotina}
          onCancelar={handleCancelarSeletor}
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
