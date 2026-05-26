// R-INT-2-CALENDAR-RECAP-CARD: testes do RecapSecaoAgenda. Valida
// render condicional (sem evento -> secao oculta; com evento -> mostra
// titulo, contagem e resumo formatados em PT-BR) e navegacao do card
// para /agenda. Componente puro: recebe o AgendaRecap por prop (o
// calculo e coberto em tests/lib/recap/agenda.test.ts).
//
// Comentarios sem acento.
import { fireEvent, render } from '@testing-library/react-native';
import type { AgendaRecap } from '@/lib/recap/agenda';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { RecapSecaoAgenda } from '@/components/screens/RecapSecaoAgenda';

const agendaCheia: AgendaRecap = {
  totalEventos: 8,
  diasComEvento: 3,
  proximoTitulo: 'Consulta médica',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RecapSecaoAgenda - render condicional', () => {
  it('agenda null (carregando ou sem vault), secao fica oculta', () => {
    const { queryByLabelText } = render(<RecapSecaoAgenda agenda={null} />);
    expect(queryByLabelText('secao agenda')).toBeNull();
  });

  it('totalEventos zero, secao fica oculta', () => {
    const { queryByLabelText } = render(
      <RecapSecaoAgenda
        agenda={{ totalEventos: 0, diasComEvento: 0, proximoTitulo: null }}
      />
    );
    expect(queryByLabelText('secao agenda')).toBeNull();
  });

  it('com eventos, mostra titulo, contagem e resumo formatados', () => {
    const { getByText, getByLabelText } = render(
      <RecapSecaoAgenda agenda={agendaCheia} />
    );
    expect(getByLabelText('secao agenda')).toBeTruthy();
    expect(getByText('Agenda essa semana')).toBeTruthy();
    expect(getByText('8 eventos')).toBeTruthy();
    expect(
      getByText('3 dias com compromisso · próximo: Consulta médica')
    ).toBeTruthy();
  });
});

describe('RecapSecaoAgenda - plural e parcial', () => {
  it('usa singular para 1 evento e 1 dia', () => {
    const { getByText } = render(
      <RecapSecaoAgenda
        agenda={{ totalEventos: 1, diasComEvento: 1, proximoTitulo: null }}
      />
    );
    expect(getByText('1 evento')).toBeTruthy();
    expect(getByText('1 dia com compromisso')).toBeTruthy();
  });

  it('sem proximo titulo, resumo mostra so os dias', () => {
    const { getByText, queryByText } = render(
      <RecapSecaoAgenda
        agenda={{ totalEventos: 2, diasComEvento: 2, proximoTitulo: null }}
      />
    );
    expect(getByText('2 dias com compromisso')).toBeTruthy();
    expect(queryByText(/próximo:/)).toBeNull();
  });
});

describe('RecapSecaoAgenda - navegacao', () => {
  it('tap no card navega para /agenda', () => {
    const { getByLabelText } = render(<RecapSecaoAgenda agenda={agendaCheia} />);
    fireEvent.press(getByLabelText('8 eventos na agenda do periodo'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/agenda' });
  });
});
