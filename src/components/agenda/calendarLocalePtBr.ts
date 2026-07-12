// Registro do locale pt-BR para react-native-calendars. Side-effect
// idempotente em module-top-level: o require cache garante execucao
// unica no boot do app. Importado por CalendarGrid.tsx.
//
// Decisao (M37.1.1): isolado em arquivo proprio em vez de inline no
// CalendarGrid para que o registro fique evidente no diff e para que
// outros wrappers (CalendarList, Agenda) possam reusar via mesmo
// import sem duplicar literais.
//
// Acentuacao completa obrigatoria nas labels: PT-BR audit hook
// bloqueia se faltar (ex: 'Marco' em vez de 'Marco', 'Sab' sem
// acento). dayNamesShort[6] = 'Sab' garante conformidade no header
// abreviado (cabe em 3 chars ainda que com diacritico).
//
// Comentarios sem acento (convencao shell/CI). Strings de UI com
// acentuacao completa.
import { LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['pt-BR'] = {
  monthNames: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ],
  monthNamesShort: [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ],
  dayNames: [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje',
};

LocaleConfig.defaultLocale = 'pt-BR';
