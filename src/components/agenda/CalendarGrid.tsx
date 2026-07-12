// Wrapper de react-native-calendars com tema Dracula + JetBrains Mono.
// Recebe lista de eventos e mapeia dots por dia. onDayPress notifica
// parent com a data ISO 'YYYY-MM-DD'.
//
// Em testes (jest.setup.cjs), Calendar e mockado por View neutra; aqui
// nao testamos comportamento visual interno da lib, apenas a montagem.
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo } from 'react';
import { Calendar } from 'react-native-calendars';
import type { EventoCalendar } from '@/lib/services/calendarApi';
import { colors } from '@/theme/tokens';
// Side-effect import: registra LocaleConfig['pt-BR'] no boot.
// M37.1.1 — header passa a mostrar "Maio de 2026" e dias com acento.
import './calendarLocalePtBr';

interface CalendarGridProps {
  eventos: EventoCalendar[];
  onDayPress: (dataIso: string) => void;
  selecionado?: string;
}

interface MarkedDate {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
}

function dataIsoFromInicio(inicio: string): string | null {
  const partes = inicio.slice(0, 10);
  if (partes.length !== 10) return null;
  if (partes[4] !== '-' || partes[7] !== '-') return null;
  return partes;
}

export function CalendarGrid({
  eventos,
  onDayPress,
  selecionado,
}: CalendarGridProps) {
  const markedDates = useMemo<Record<string, MarkedDate>>(() => {
    const map: Record<string, MarkedDate> = {};
    for (const e of eventos) {
      const iso = dataIsoFromInicio(e.inicio);
      if (iso === null) continue;
      map[iso] = { marked: true, dotColor: colors.purple };
    }
    if (typeof selecionado === 'string' && selecionado.length > 0) {
      map[selecionado] = {
        ...(map[selecionado] ?? {}),
        selected: true,
        selectedColor: colors.purple,
      };
    }
    return map;
  }, [eventos, selecionado]);

  return (
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
      onDayPress={(day: { dateString: string }) => onDayPress(day.dateString)}
      enableSwipeMonths={true}
      firstDay={0}
      monthFormat={"MMMM 'de' yyyy"}
    />
  );
}
