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
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Calendar as CalendarIcon, Sparkles } from '@/lib/icons';
import { EmptyState } from '@/components/ui';
import { OuroborosLoader } from '@/components/brand';
import { ConquistaCard } from '@/components/data/ConquistaCard';
import { useConquistas } from '@/lib/hooks/useConquistas';
import { colors } from '@/theme/tokens';
// Side-effect import: garante locale pt-BR registrado caso o
// CalendarGrid (agenda) nao tenha sido carregado primeiro.
import '@/components/agenda/calendarLocalePtBr';
import type { Conquista } from '@/lib/conquistas/types';

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

export function RecapModoCalendario() {
  const { brutas, conquistas, loading, error } = useConquistas();
  const [selecionado, setSelecionado] = useState<string | null>(null);

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

  if (semAposFiltro) {
    return <EmptyState frase="Nada por aqui ainda." Icon={CalendarIcon} />;
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="recap modo calendario"
    >
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
                  conquistasDoDia.length === 1 ? 'conquista' : 'conquistas'
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
    </ScrollView>
  );
}
