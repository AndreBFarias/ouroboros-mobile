// Modo Calendario do Recap (M-RECAP-CALENDARIO-UNIFICAR, L2). Migra a
// agregacao de conquistas do antigo Calendario de Conquistas (Tela 25,
// rota /calendario removida) para um componente embutido no
// RecapScreen. Calendario mensal com dots nos dias que tem conquistas
// + lista vertical das conquistas do dia selecionado abaixo.
//
// Reusa useConquistas (loader + filtros) + react-native-calendars
// (locale PT-BR ja registrado em M37.1.1 via calendarLocalePtBr).
//
// ADR-0021: 2 telas (Recap + Calendario) viraram 1 com toggle modo.
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  Calendar as CalendarIcon,
  SlidersHorizontal,
  Sparkles,
} from '@/lib/icons';
import { BottomSheet, EmptyState, SHEET_80 } from '@/components/ui';
import type { BottomSheetRef } from '@/components/ui';
import { OuroborosLoader } from '@/components/brand';
import { ConquistaCard } from '@/components/data/ConquistaCard';
import { FiltrosBar } from '@/components/calendario/FiltrosBar';
import { useConquistas } from '@/lib/hooks/useConquistas';
import { useFiltroPessoaEfetivo } from '@/lib/stores/filtroEfetivo';
import { FILTROS_DEFAULT } from '@/lib/conquistas/filtros';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
// Side-effect import: garante locale pt-BR registrado caso o
// CalendarGrid (agenda) nao tenha sido carregado primeiro.
import '@/components/agenda/calendarLocalePtBr';
import type { Conquista } from '@/lib/conquistas/types';
import type { FiltrosConquistas } from '@/lib/conquistas/filtros';
import type { PessoaId } from '@/lib/schemas/pessoa';

interface MarkedDate {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
}

function dataIsoFromConquista(c: Conquista): string | null {
  // c.data e ISO (timestamp completo). Pega so YYYY-MM-DD em UTC para
  // que o markedDates do Calendar bata com o onDayPress (que devolve
  // dateString no mesmo formato local-naive UTC).
  const d = new Date(c.data);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// AUDIT-P2-11: quantos dos quatro filtros expostos estao fora do
// repouso. Nao conta 'mes' -- o Recap nao expoe esse controle e o
// campo fica no default.
//
// A base de comparacao para 'pessoa' NAO e FILTROS_DEFAULT.pessoa
// ('ambos') e sim o filtro global de pessoa do app, que o
// useConquistas ja injeta no estado inicial e no resetarFiltros. Sem
// isso o indicador acenderia sozinho para todo usuario que tem o
// filtro global ligado, apontando um filtro que este controle nao
// aplicou.
function contarFiltrosAtivos(
  f: FiltrosConquistas,
  pessoaEmRepouso: PessoaId
): number {
  let n = 0;
  if (f.pessoa !== pessoaEmRepouso) n += 1;
  if (f.tipoMidia !== FILTROS_DEFAULT.tipoMidia) n += 1;
  if (
    f.intensidade.min !== FILTROS_DEFAULT.intensidade.min ||
    f.intensidade.max !== FILTROS_DEFAULT.intensidade.max
  ) {
    n += 1;
  }
  if (f.bairro.trim() !== '') n += 1;
  return n;
}

export function RecapModoCalendario() {
  const {
    brutas,
    conquistas,
    loading,
    error,
    filtros,
    setFiltroPessoa,
    setFiltroMes,
    setFiltroTipoMidia,
    setFiltroIntensidade,
    setFiltroBairro,
    resetarFiltros,
  } = useConquistas();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const filtrosRef = useRef<BottomSheetRef>(null);
  const pessoaEmRepouso = useFiltroPessoaEfetivo();

  const filtrosAtivos = useMemo(
    () => contarFiltrosAtivos(filtros, pessoaEmRepouso),
    [filtros, pessoaEmRepouso]
  );

  const abrirFiltros = () => {
    haptics.selection();
    filtrosRef.current?.expand();
  };

  const limparFiltros = () => {
    haptics.selection();
    resetarFiltros();
  };

  // Agrupa conquistas filtradas por dia (YYYY-MM-DD). Usado para
  // marcar dots no Calendar e para listar abaixo.
  const conquistasPorDia = useMemo(() => {
    const mapa = new Map<string, Conquista[]>();
    for (const c of conquistas) {
      const iso = dataIsoFromConquista(c);
      if (iso === null) continue;
      const lista = mapa.get(iso) ?? [];
      lista.push(c);
      mapa.set(iso, lista);
    }
    return mapa;
  }, [conquistas]);

  const markedDates = useMemo<Record<string, MarkedDate>>(() => {
    const map: Record<string, MarkedDate> = {};
    for (const dia of conquistasPorDia.keys()) {
      map[dia] = { marked: true, dotColor: colors.purple };
    }
    if (typeof selecionado === 'string' && selecionado.length > 0) {
      map[selecionado] = {
        ...(map[selecionado] ?? {}),
        selected: true,
        selectedColor: colors.purple,
      };
    }
    return map;
  }, [conquistasPorDia, selecionado]);

  const conquistasDoDia = useMemo<Conquista[]>(() => {
    if (selecionado === null) return [];
    return conquistasPorDia.get(selecionado) ?? [];
  }, [selecionado, conquistasPorDia]);

  const sem = !loading && brutas.length === 0;
  const semAposFiltro =
    !loading && brutas.length > 0 && conquistas.length === 0;

  if (error !== null) {
    return (
      <EmptyState
        frase="Não foi possível carregar as conquistas."
        Icon={CalendarIcon}
      />
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 48,
        }}
        accessibilityLabel="carregando calendario"
      >
        <OuroborosLoader compacto />
      </View>
    );
  }

  if (sem) {
    return (
      <EmptyState
        frase="Sua primeira conquista vai aparecer aqui."
        Icon={Sparkles}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="recap modo calendario"
      >
        <ControleFiltros
          ativos={filtrosAtivos}
          onAbrir={abrirFiltros}
          onLimpar={limparFiltros}
        />

        {semAposFiltro ? (
          <EmptyState
            frase="Nenhuma conquista passa pelos filtros de agora."
            Icon={CalendarIcon}
          />
        ) : (
          <>
            <Calendar
              theme={{
                backgroundColor: colors.bgPage,
                calendarBackground: colors.bgPage,
                textSectionTitleColor: colors.muted,
                selectedDayBackgroundColor: colors.purple,
                selectedDayTextColor: colors.bgPage,
                todayTextColor: colors.cyan,
                dayTextColor: colors.fg,
                textDisabledColor: colors.mutedDecor,
                dotColor: colors.purple,
                selectedDotColor: colors.bgPage,
                arrowColor: colors.purple,
                monthTextColor: colors.fg,
                textDayFontFamily: 'JetBrainsMono_400Regular',
                textMonthFontFamily: 'JetBrainsMono_500Medium',
                textDayHeaderFontFamily: 'JetBrainsMono_400Regular',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
              markedDates={markedDates}
              onDayPress={(day: { dateString: string }) =>
                setSelecionado(day.dateString)
              }
              enableSwipeMonths={true}
              firstDay={0}
              monthFormat={"MMMM 'de' yyyy"}
            />

            {selecionado !== null ? (
              <View style={{ gap: 12 }} accessibilityLabel="conquistas do dia">
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    lineHeight: 16,
                  }}
                >
                  {conquistasDoDia.length === 0
                    ? 'Nenhuma conquista neste dia.'
                    : `${conquistasDoDia.length} ${
                        conquistasDoDia.length === 1
                          ? 'conquista'
                          : 'conquistas'
                      } neste dia.`}
                </Text>
                {conquistasDoDia.length > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    {conquistasDoDia.map((c) => (
                      <ConquistaCard key={c.id} conquista={c} />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <Text
                style={{
                  color: colors.mutedDecor,
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                Toque em um dia marcado para ver as conquistas.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <BottomSheet ref={filtrosRef} snapPoints={SHEET_80} index={-1}>
        <BottomSheetView style={{ padding: spacing.base, gap: spacing.md }}>
          <FiltrosBar
            filtros={filtros}
            onPessoa={setFiltroPessoa}
            onMes={setFiltroMes}
            onTipoMidia={setFiltroTipoMidia}
            onIntensidade={setFiltroIntensidade}
            onBairro={setFiltroBairro}
            mostrarMes={false}
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

// AUDIT-P2-11: linha de controle da barra de filtros.
//
// Fica no topo do modo Calendario, e nao no header do RecapScreen, por
// duas razoes. O header e compartilhado pelos tres modos (Lista,
// Calendario, Memorias) e um controle que so serve a um deles vira
// affordance morta nos outros dois. E o useConquistas vive dentro
// deste componente: levar os setters ao header exigiria subir o hook,
// que o escopo da sprint marca como NAO-objetivo.
//
// O "Limpar" so aparece com filtro ativo -- botao permanentemente
// inerte ensina o usuario a ignorar a regiao. O contador ao lado de
// "Filtros" existe porque, com a barra escondida no sheet, o estado
// fica invisivel: sem ele o usuario filtra, esquece, e le a lista
// curta como defeito.
function ControleFiltros({
  ativos,
  onAbrir,
  onLimpar,
}: {
  ativos: number;
  onAbrir: () => void;
  onLimpar: () => void;
}) {
  const ativo = ativos > 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
      }}
    >
      <Pressable
        onPress={onAbrir}
        accessibilityRole="button"
        accessibilityLabel={
          ativo
            ? `abrir filtros de conquistas, ${ativos} ativo${ativos > 1 ? 's' : ''}`
            : 'abrir filtros de conquistas'
        }
        accessibilityState={{ expanded: false }}
        hitSlop={8}
        style={({ pressed }) => ({
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.chip,
          borderWidth: 1,
          borderColor: ativo ? colors.purple : colors.bgElev,
          backgroundColor: pressed ? colors.bgElev : 'transparent',
        })}
      >
        <SlidersHorizontal
          size={16}
          color={ativo ? colors.purple : colors.muted}
        />
        <Text
          style={{
            color: ativo ? colors.fg : colors.muted,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          Filtros
        </Text>
        {ativo ? (
          <View
            style={{
              minWidth: 18,
              height: 18,
              paddingHorizontal: 5,
              borderRadius: 9,
              backgroundColor: colors.purple,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.bgPage,
                fontSize: 11,
                lineHeight: 14,
              }}
            >
              {ativos}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {ativo ? (
        <Pressable
          onPress={onLimpar}
          accessibilityRole="button"
          accessibilityLabel="limpar filtros de conquistas"
          hitSlop={8}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: spacing.md,
            borderRadius: radius.chip,
            backgroundColor: pressed ? colors.bgElev : 'transparent',
          })}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Limpar
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
