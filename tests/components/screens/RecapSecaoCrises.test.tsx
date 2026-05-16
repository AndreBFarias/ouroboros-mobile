// R-RECAP-1: testes do RecapSecaoCrises clicavel.
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { ToastProvider } from '@/components/ui';
import { RecapSecaoCrises } from '@/components/screens/RecapSecaoCrises';
import type { CriseItem } from '@/lib/hooks/useRecap';

function renderComToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('RecapSecaoCrises clicavel', () => {
  it('nao renderiza nada quando lista vazia', () => {
    const { queryByLabelText } = renderComToast(
      <RecapSecaoCrises itens={[]} />
    );
    expect(queryByLabelText('secao crises')).toBeNull();
  });

  it('tap em diario_trigger navega para /diario-emocional com slug', () => {
    const itens: CriseItem[] = [
      {
        id: 'diario_trigger:2026-05-15:pessoa_a',
        origem: 'diario_trigger',
        data: '2026-05-15',
        intensidade: 4,
        frase: 'Momento dificil',
      },
    ];
    const { getByLabelText } = renderComToast(<RecapSecaoCrises itens={itens} />);
    fireEvent.press(
      getByLabelText('crise diario_trigger:2026-05-15:pessoa_a')
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/diario-emocional',
      params: { slug: 'diario_trigger:2026-05-15:pessoa_a' },
    });
  });

  it('tap em evento_negativo nao navega (sem destino canonico ainda)', () => {
    const itens: CriseItem[] = [
      {
        id: 'evento_negativo:2026-05-12:pessoa_a',
        origem: 'evento_negativo',
        data: '2026-05-12',
        intensidade: 3,
        frase: 'Evento dificil',
      },
    ];
    const { getByLabelText } = renderComToast(<RecapSecaoCrises itens={itens} />);
    fireEvent.press(getByLabelText('crise evento_negativo:2026-05-12:pessoa_a'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
