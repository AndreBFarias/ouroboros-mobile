// M37.1.1 — Garante que o registro de LocaleConfig['pt-BR'] roda no
// import de src/components/agenda/calendarLocalePtBr e que as labels
// chegam com acentuacao completa em PT-BR.
//
// O mock global de react-native-calendars (jest.setup.cjs) expoe
// LocaleConfig.locales = {} antes do import; depois do side-effect
// o objeto deve conter a chave 'pt-BR'.
//
// Comentarios sem acento (convencao shell/CI). Strings com acento
// porque o conteudo testado e literalmente UI text PT-BR.
import { LocaleConfig } from 'react-native-calendars';

// Side-effect: registra o locale pt-BR no LocaleConfig do mock.
import '@/components/agenda/calendarLocalePtBr';

describe('calendarLocalePtBr', () => {
  test('registra locale pt-BR e define como default', () => {
    expect(LocaleConfig.locales['pt-BR']).toBeDefined();
    expect(LocaleConfig.defaultLocale).toBe('pt-BR');
  });

  test('monthNames trazem 12 meses com acentuacao completa', () => {
    const meses = LocaleConfig.locales['pt-BR'].monthNames;
    expect(meses).toHaveLength(12);
    expect(meses[0]).toBe('Janeiro');
    expect(meses[1]).toBe('Fevereiro');
    expect(meses[2]).toBe('Março');
    expect(meses[3]).toBe('Abril');
    expect(meses[4]).toBe('Maio');
    expect(meses[5]).toBe('Junho');
    expect(meses[6]).toBe('Julho');
    expect(meses[7]).toBe('Agosto');
    expect(meses[8]).toBe('Setembro');
    expect(meses[9]).toBe('Outubro');
    expect(meses[10]).toBe('Novembro');
    expect(meses[11]).toBe('Dezembro');
  });

  test('monthNamesShort trazem 12 abreviacoes de 3 chars', () => {
    const abrev = LocaleConfig.locales['pt-BR'].monthNamesShort;
    expect(abrev).toHaveLength(12);
    expect(abrev).toEqual([
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
    ]);
  });

  test('dayNames trazem 7 dias completos com acentuacao', () => {
    const dias = LocaleConfig.locales['pt-BR'].dayNames;
    expect(dias).toHaveLength(7);
    expect(dias[0]).toBe('Domingo');
    expect(dias[1]).toBe('Segunda-feira');
    expect(dias[2]).toBe('Terça-feira');
    expect(dias[3]).toBe('Quarta-feira');
    expect(dias[4]).toBe('Quinta-feira');
    expect(dias[5]).toBe('Sexta-feira');
    expect(dias[6]).toBe('Sábado');
  });

  test('dayNamesShort trazem abreviacoes com Sab acentuado', () => {
    const abrev = LocaleConfig.locales['pt-BR'].dayNamesShort;
    expect(abrev).toHaveLength(7);
    expect(abrev).toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
    // Sab com acento agudo e a conformidade especifica do PT-BR audit.
    expect(abrev[6]).toBe('Sáb');
  });

  test('today renderiza como Hoje', () => {
    expect(LocaleConfig.locales['pt-BR'].today).toBe('Hoje');
  });
});
