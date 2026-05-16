// R-RECAP-1: testes do RecapSecaoEvolucoes clicavel.
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { ToastProvider } from '@/components/ui';
import { RecapSecaoEvolucoes } from '@/components/screens/RecapSecaoEvolucoes';
import type { EvolucaoItem } from '@/lib/hooks/useRecap';

function renderComToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('RecapSecaoEvolucoes clicavel', () => {
  it('nao renderiza nada quando lista vazia', () => {
    const { queryByLabelText } = renderComToast(
      <RecapSecaoEvolucoes itens={[]} />
    );
    expect(queryByLabelText('secao evolucoes')).toBeNull();
  });

  it('tap em humor_medio navega para /humor', () => {
    const itens: EvolucaoItem[] = [
      {
        id: 'evolucao:humor_medio',
        rotulo: 'Humor medio',
        detalhe: '3.5 de 5',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoEvolucoes itens={itens} />
    );
    fireEvent.press(getByLabelText('evolucao evolucao:humor_medio'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/humor',
      params: undefined,
    });
  });

  it('tap em treinos navega para /treinos', () => {
    const itens: EvolucaoItem[] = [
      {
        id: 'evolucao:treinos',
        rotulo: 'Treinos concluidos',
        detalhe: '5 sessoes',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoEvolucoes itens={itens} />
    );
    fireEvent.press(getByLabelText('evolucao evolucao:treinos'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/treinos',
      params: undefined,
    });
  });

  it('tap em contador navega para /contadores/[slug] com slug extraido', () => {
    const itens: EvolucaoItem[] = [
      {
        id: 'evolucao:contador:agua_diaria',
        rotulo: 'Beber agua',
        detalhe: '30 dias em sequencia',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoEvolucoes itens={itens} />
    );
    fireEvent.press(getByLabelText('evolucao evolucao:contador:agua_diaria'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/contadores/[slug]',
      params: { slug: 'agua_diaria' },
    });
  });
});
