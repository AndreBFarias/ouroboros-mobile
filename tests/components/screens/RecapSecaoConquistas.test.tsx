// R-RECAP-1: testes do RecapSecaoConquistas clicavel. Valida que
// tap em item de conquista navega para a rota canonica e que itens
// sem destino disparam toast "Edicao em breve.".
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { ToastProvider } from '@/components/ui';
import { RecapSecaoConquistas } from '@/components/screens/RecapSecaoConquistas';
import type { ConquistaItem } from '@/lib/hooks/useRecap';

function renderComToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('RecapSecaoConquistas clicavel', () => {
  it('nao renderiza nada quando lista vazia', () => {
    const { queryByLabelText } = renderComToast(
      <RecapSecaoConquistas itens={[]} />
    );
    expect(queryByLabelText('secao conquistas')).toBeNull();
  });

  it('tap em diario_vitoria navega para /diario-emocional com slug', () => {
    const itens: ConquistaItem[] = [
      {
        id: 'diario_vitoria:2026-05-15:pessoa_a',
        origem: 'diario_vitoria',
        data: '2026-05-15',
        frase: 'Conquista',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoConquistas itens={itens} />
    );
    fireEvent.press(
      getByLabelText('conquista diario_vitoria:2026-05-15:pessoa_a')
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/diario-emocional',
      params: { slug: 'diario_vitoria:2026-05-15:pessoa_a' },
    });
  });

  it('tap em marco navega para /galeria/detalhe/[slug] com slug', () => {
    const itens: ConquistaItem[] = [
      {
        id: 'marco:2026-05-14:pessoa_a',
        origem: 'marco',
        data: '2026-05-14',
        frase: 'Marco',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoConquistas itens={itens} />
    );
    fireEvent.press(getByLabelText('conquista marco:2026-05-14:pessoa_a'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/galeria/detalhe/[slug]',
      params: { slug: 'marco:2026-05-14:pessoa_a' },
    });
  });

  it('tap em tarefa_concluida navega para /todo com focus', () => {
    const itens: ConquistaItem[] = [
      {
        id: 'tarefa:2026-05-13:Comprar pao',
        origem: 'tarefa_concluida',
        data: '2026-05-13',
        frase: 'Comprar pao',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoConquistas itens={itens} />
    );
    fireEvent.press(getByLabelText('conquista tarefa:2026-05-13:Comprar pao'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/todo',
      params: { focus: 'tarefa:2026-05-13:Comprar pao' },
    });
  });

  it('tap em contador_sequencia navega para /contadores/[slug] com slug extraido', () => {
    const itens: ConquistaItem[] = [
      {
        id: 'contador:agua_diaria',
        origem: 'contador_sequencia',
        data: '2026-04-15',
        frase: 'Beber agua — 30 dias em sequência.',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoConquistas itens={itens} />
    );
    fireEvent.press(getByLabelText('conquista contador:agua_diaria'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/contadores/[slug]',
      params: { slug: 'agua_diaria' },
    });
  });

  it('tap em evento_positivo nao navega (sem destino canonico ainda)', () => {
    const itens: ConquistaItem[] = [
      {
        id: 'evento_positivo:2026-05-12:pessoa_a',
        origem: 'evento_positivo',
        data: '2026-05-12',
        frase: 'Evento',
      },
    ];
    const { getByLabelText } = renderComToast(
      <RecapSecaoConquistas itens={itens} />
    );
    fireEvent.press(
      getByLabelText('conquista evento_positivo:2026-05-12:pessoa_a')
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
