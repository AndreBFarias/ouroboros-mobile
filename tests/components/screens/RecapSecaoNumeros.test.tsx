// R-RECAP-2 (2026-05-16): testes do RecapSecaoNumeros clicavel.
// Valida que cada card de big number navega para
// /recap-lista?tipo=<chave>&de=...&ate=... e que accessibilityLabel
// usa chave canonica sem acento (convencao screen reader).
//
// R-RECAP-NUMEROS-AUDIOVIDEO-CARDS (2026-05-17): grid passa de 6
// para 8 cards. Adicionados cards Audios e Videos com mesmos
// asserts de label, contagem e navegacao.
//
// Padrao herdado de Q24.a e RecapSecaoConquistas (R-RECAP-1).
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { RecapSecaoNumeros } from '@/components/screens/RecapSecaoNumeros';
import type { NumerosRecap, PeriodoRange } from '@/lib/hooks/useRecap';

const range: PeriodoRange = {
  de: new Date('2026-05-09T00:00:00.000Z'),
  ate: new Date('2026-05-16T23:59:59.999Z'),
};

const numeros: NumerosRecap = {
  registros: 12,
  treinos: 3,
  fotos: 7,
  audios: 4,
  videos: 2,
  eventos_positivos: 2,
  eventos_negativos: 1,
  tarefas_concluidas: 5,
};

beforeEach(() => {
  mockPush.mockClear();
});

describe('RecapSecaoNumeros clicavel', () => {
  it('renderiza 8 cards de big number com valores corretos', () => {
    const { getByText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    expect(getByText('12')).toBeTruthy(); // registros
    expect(getByText('3')).toBeTruthy(); // treinos
    expect(getByText('7')).toBeTruthy(); // fotos
    expect(getByText('4')).toBeTruthy(); // audios
    // videos = 2 colide com eventos_positivos = 2; basta validar
    // contagem via accessibilityLabel.
    expect(getByText('Registros')).toBeTruthy();
    expect(getByText('Treinos')).toBeTruthy();
    expect(getByText('Fotos')).toBeTruthy();
    expect(getByText('Áudios')).toBeTruthy();
    expect(getByText('Vídeos')).toBeTruthy();
    expect(getByText('Eventos positivos')).toBeTruthy();
    expect(getByText('Eventos difíceis')).toBeTruthy();
    expect(getByText('Tarefas concluídas')).toBeTruthy();
  });

  it('accessibilityLabel de cada card e sem acento (convencao a11y)', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    // Padrao: `<count> <tipo> no periodo` — sem acento.
    expect(getByLabelText('12 registros no periodo')).toBeTruthy();
    expect(getByLabelText('3 treinos no periodo')).toBeTruthy();
    expect(getByLabelText('7 fotos no periodo')).toBeTruthy();
    expect(getByLabelText('4 audios no periodo')).toBeTruthy();
    expect(getByLabelText('2 videos no periodo')).toBeTruthy();
    expect(getByLabelText('2 eventos positivos no periodo')).toBeTruthy();
    expect(getByLabelText('1 eventos dificeis no periodo')).toBeTruthy();
    expect(getByLabelText('5 tarefas concluidas no periodo')).toBeTruthy();
  });

  it('tap em card registros navega para /recap-lista com tipo=registros', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    fireEvent.press(getByLabelText('12 registros no periodo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recap-lista',
      params: {
        tipo: 'registros',
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  });

  it('tap em card treinos navega para /recap-lista com tipo=treinos', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    fireEvent.press(getByLabelText('3 treinos no periodo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recap-lista',
      params: {
        tipo: 'treinos',
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  });

  it('tap em card fotos navega para /recap-lista com tipo=fotos', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    fireEvent.press(getByLabelText('7 fotos no periodo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recap-lista',
      params: {
        tipo: 'fotos',
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  });

  it('tap em card audios navega para /recap-lista com tipo=audios', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    fireEvent.press(getByLabelText('4 audios no periodo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recap-lista',
      params: {
        tipo: 'audios',
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  });

  it('tap em card videos navega para /recap-lista com tipo=videos', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    fireEvent.press(getByLabelText('2 videos no periodo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recap-lista',
      params: {
        tipo: 'videos',
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  });

  it('tap em card eventos positivos navega para /recap-lista com tipo=eventos_pos', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    fireEvent.press(getByLabelText('2 eventos positivos no periodo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recap-lista',
      params: {
        tipo: 'eventos_pos',
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  });

  it('tap em card eventos dificeis navega para /recap-lista com tipo=eventos_neg', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    fireEvent.press(getByLabelText('1 eventos dificeis no periodo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recap-lista',
      params: {
        tipo: 'eventos_neg',
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  });

  it('tap em card tarefas concluidas navega para /recap-lista com tipo=tarefas', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    fireEvent.press(getByLabelText('5 tarefas concluidas no periodo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recap-lista',
      params: {
        tipo: 'tarefas',
        de: range.de.toISOString(),
        ate: range.ate.toISOString(),
      },
    });
  });

  it('range preservado nos query params em todas as 8 navegacoes', () => {
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={numeros} range={range} />
    );
    const labels = [
      '12 registros no periodo',
      '3 treinos no periodo',
      '7 fotos no periodo',
      '4 audios no periodo',
      '2 videos no periodo',
      '2 eventos positivos no periodo',
      '1 eventos dificeis no periodo',
      '5 tarefas concluidas no periodo',
    ];
    for (const label of labels) {
      fireEvent.press(getByLabelText(label));
    }
    expect(mockPush).toHaveBeenCalledTimes(8);
    for (const call of mockPush.mock.calls) {
      const [arg] = call;
      expect(arg.params.de).toBe(range.de.toISOString());
      expect(arg.params.ate).toBe(range.ate.toISOString());
    }
  });

  it('renderiza cards mesmo com valores zero (cabe ao container ocultar a secao)', () => {
    const zeros: NumerosRecap = {
      registros: 0,
      treinos: 0,
      fotos: 0,
      audios: 0,
      videos: 0,
      eventos_positivos: 0,
      eventos_negativos: 0,
      tarefas_concluidas: 0,
    };
    const { getByLabelText } = render(
      <RecapSecaoNumeros numeros={zeros} range={range} />
    );
    expect(getByLabelText('0 registros no periodo')).toBeTruthy();
    expect(getByLabelText('0 audios no periodo')).toBeTruthy();
    expect(getByLabelText('0 videos no periodo')).toBeTruthy();
    expect(getByLabelText('0 tarefas concluidas no periodo')).toBeTruthy();
  });
});
