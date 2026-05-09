// Tela 21 (M10). Container completo da aba Humor: header laranja
// "Humor", ChipGroup pessoa (pessoa_a / pessoa_b / sobreposto),
// botao "Registrar humor agora" no topo (atalho para /humor-rapido),
// stats de media 30d e contagem, heatmap 13x7 dos ultimos 91 dias e
// banner muted "Atualizado em <data>" no rodape (vermelho se >7 dias).
//
// Empty state quando o cache esta ausente: orienta a rodar o pipeline
// no desktop. Quando o cache existe mas esta em formato desconhecido,
// exibe outro empty state alertando schema novo.
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
import { Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from 'expo-router';
import { CalendarRange } from '@/lib/icons';
import {
  BottomSheet,
  Button,
  ChipGroup,
  EmptyState,
  Header,
  Screen,
  SHEET_60,
  type BottomSheetRef,
  type ChipOption,
} from '@/components/ui';
import {
  HumorHeatmap,
  HumorHeatmapSobreposto,
  HumorHeatmapStats,
  montarCelulasHumor91Dias,
} from '@/components/data';
import { colors, spacing } from '@/theme/tokens';
import { useHumorHeatmap } from '@/lib/hooks/useHumorHeatmap';
import { usePessoa, useNomeDe } from '@/lib/stores/pessoa';
import {
  useFiltroPessoaEfetivo,
  useVaultCompartilhado,
} from '@/lib/stores/filtroEfetivo';
import { DiaHumorModal } from './DiaHumorModal';
import type { HumorHeatmapCell } from '@/lib/schemas/humor_heatmap_cache';
import type { ModoFiltroHumor } from '@/lib/hooks/useHumorHeatmap';

// Labels dos chips sao montadas em runtime via useNomeDe() para refletir
// nomes reais que o usuario configurou no onboarding/Settings (Regra -1:
// nenhum nome real hardcoded). O modo combinado usa useNomeDe('ambos')
// que ramifica por tipoCompanhia ('Casal' / 'Todos' / 'Ambos').
const DIA_MS = 24 * 60 * 60 * 1000;

function formatarBannerData(geradoEm: string, agora: Date): {
  texto: string;
  alerta: boolean;
} {
  const data = new Date(geradoEm);
  const diff = agora.getTime() - data.getTime();
  const dias = Math.floor(diff / DIA_MS);
  const alerta = dias > 7;
  const dataFmt = `${String(data.getDate()).padStart(2, '0')}/${String(
    data.getMonth() + 1
  ).padStart(2, '0')}`;
  if (dias <= 0) return { texto: `Atualizado hoje (${dataFmt}).`, alerta };
  if (dias === 1) return { texto: `Atualizado ontem (${dataFmt}).`, alerta };
  return { texto: `Atualizado há ${dias} dias (${dataFmt}).`, alerta };
}

export function MiniHumorScreen(): ReactNode {
  const { cache, loading, error } = useHumorHeatmap();
  const filtroPessoa = useFiltroPessoaEfetivo();
  const vaultCompartilhado = useVaultCompartilhado();
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const nomeA = useNomeDe('pessoa_a');
  const nomeB = useNomeDe('pessoa_b');
  const nomeAmbos = useNomeDe('ambos');

  const chipOptionsCompartilhado = useMemo<ChipOption[]>(
    () => [
      { value: 'pessoa_a', label: nomeA, accent: 'purple' },
      { value: 'pessoa_b', label: nomeB, accent: 'pink' },
      { value: 'sobreposto', label: nomeAmbos, accent: 'cyan' },
    ],
    [nomeA, nomeB, nomeAmbos]
  );
  const chipOptionsPrivado = useMemo<ChipOption[]>(
    () => [
      { value: 'pessoa_a', label: nomeA, accent: 'purple' },
      { value: 'pessoa_b', label: nomeB, accent: 'pink' },
    ],
    [nomeA, nomeB]
  );
  const [modo, setModo] = useState<ModoFiltroHumor>(() => {
    // Inicializa com a pessoa ativa do filtro global; 'ambos' do
    // store mapeia para 'sobreposto' aqui (apenas se vault
    // compartilhado).
    if (filtroPessoa === 'ambos') return 'sobreposto';
    return filtroPessoa;
  });

  // Quando o usuario alterna vaultCompartilhado para false enquanto
  // estava em modo 'sobreposto', cai para a pessoa ativa para nao
  // exibir dados da outra pessoa.
  useEffect(() => {
    if (!vaultCompartilhado && modo === 'sobreposto') {
      setModo(pessoaAtiva);
    }
  }, [vaultCompartilhado, modo, pessoaAtiva]);

  const modalRef = useRef<BottomSheetRef>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  // Listas de celulas visuais por modo. Computa uma vez por mudanca
  // do cache. Modo individual usa filtro de autor, modo sobreposto
  // mantem as duas listas separadas para layers.
  const visuais = useMemo(() => {
    if (!cache) return null;
    const a = cache.celulas.filter((c) => c.autor === 'pessoa_a');
    const b = cache.celulas.filter((c) => c.autor === 'pessoa_b');
    return {
      pessoa_a: montarCelulasHumor91Dias(a),
      pessoa_b: montarCelulasHumor91Dias(b),
    };
  }, [cache]);

  // Map data -> registros do dia (para abrir modal correto). Sempre
  // todas as pessoas; o filtro de exibicao acontece no UI do modal.
  const registrosPorDia = useMemo(() => {
    const out: Record<string, HumorHeatmapCell[]> = {};
    if (!cache) return out;
    for (const cel of cache.celulas) {
      const arr = out[cel.data] ?? [];
      arr.push(cel);
      out[cel.data] = arr;
    }
    return out;
  }, [cache]);

  const handleRegistrar = useCallback(() => {
    router.push('/humor-rapido');
  }, []);

  const abrirDia = useCallback((data: string) => {
    if (!data) return;
    setDiaSelecionado(data);
    modalRef.current?.expand();
  }, []);

  const handleModoChange = useCallback((next: string | null) => {
    if (!next) return;
    setModo(next as ModoFiltroHumor);
  }, []);

  const registrosModal = useMemo(() => {
    if (!diaSelecionado) return [];
    const todos = registrosPorDia[diaSelecionado] ?? [];
    if (modo === 'sobreposto') return todos;
    return todos.filter((r) => r.autor === modo);
  }, [diaSelecionado, registrosPorDia, modo]);

  const banner = useMemo(() => {
    if (!cache) return null;
    return formatarBannerData(cache.gerado_em, new Date());
  }, [cache]);

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Header title="Humor" />
      </View>

      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Button
          variant="primary"
          label="Registrar humor agora"
          onPress={handleRegistrar}
        />

        <ChipGroup
          mode="single"
          options={
            vaultCompartilhado
              ? chipOptionsCompartilhado
              : chipOptionsPrivado
          }
          value={modo}
          onChange={handleModoChange}
        />

        {loading ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Carregando…
          </Text>
        ) : null}

        {!loading && error ? (
          <EmptyState
            frase="Cache em formato desconhecido. Rode o pipeline atualizado."
            Icon={CalendarRange}
          />
        ) : null}

        {!loading && !error && !cache ? (
          <EmptyState
            frase="Rode o pipeline no desktop pra carregar dados."
            Icon={CalendarRange}
          />
        ) : null}

        {!loading && !error && cache && visuais ? (
          <>
            <HumorHeatmapStats
              pessoaA={cache.estatisticas.pessoa_a}
              pessoaB={cache.estatisticas.pessoa_b}
              modo={modo}
            />

            {modo === 'sobreposto' ? (
              <HumorHeatmapSobreposto
                celulasA={visuais.pessoa_a}
                celulasB={visuais.pessoa_b}
                onCelulaPress={abrirDia}
              />
            ) : (
              <HumorHeatmap
                celulas={visuais[modo]}
                onCelulaPress={(cel) => abrirDia(cel.data)}
              />
            )}

            {banner ? (
              <Text
                style={{
                  color: banner.alerta ? colors.red : colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 14,
                  textAlign: 'center',
                  marginTop: spacing.md,
                }}
                accessibilityLabel={`banner ${banner.texto}`}
              >
                {banner.texto}
              </Text>
            ) : null}
          </>
        ) : null}
      </BottomSheetScrollView>

      <BottomSheet ref={modalRef} snapPoints={SHEET_60} index={-1}>
        {diaSelecionado ? (
          <DiaHumorModal
            data={diaSelecionado}
            registros={registrosModal}
          />
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
