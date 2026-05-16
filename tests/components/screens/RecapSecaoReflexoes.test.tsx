// R-RECAP-1: testes do RecapSecaoReflexoes clicavel.
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { ToastProvider } from '@/components/ui';
import { RecapSecaoReflexoes } from '@/components/screens/RecapSecaoReflexoes';
import type { ReflexaoItem } from '@/lib/hooks/useRecap';

function renderComToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('RecapSecaoReflexoes clicavel', () => {
  it('nao renderiza nada quando lista vazia', () => {
    const { queryByLabelText } = renderComToast(
      <RecapSecaoReflexoes itens={[]} />
    );
    expect(queryByLabelText('secao reflexoes')).toBeNull();
  });

  it('tap em reflexao navega para /diario-emocional com slug', () => {
    const itens: ReflexaoItem[] = [
      {
        id: 'diario_reflexao:2026-05-15:pessoa_a',
        data: '2026-05-15',
        intensidade: 3,
        frase: 'Reflexao do dia',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoReflexoes itens={itens} />
    );
    fireEvent.press(
      getByLabelText('reflexao diario_reflexao:2026-05-15:pessoa_a')
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/diario-emocional',
      params: { slug: 'diario_reflexao:2026-05-15:pessoa_a' },
    });
  });
});
