// R-RECAP-1: testes do RecapSecaoTarefas clicavel.
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { RecapSecaoTarefas } from '@/components/screens/RecapSecaoTarefas';
import type { TarefaConcluidaItem } from '@/lib/hooks/useRecap';

beforeEach(() => {
  mockPush.mockClear();
});

describe('RecapSecaoTarefas clicavel', () => {
  it('nao renderiza nada quando lista vazia', () => {
    const { queryByLabelText } = render(<RecapSecaoTarefas itens={[]} />);
    expect(queryByLabelText('secao tarefas concluidas')).toBeNull();
  });

  it('tap em tarefa navega para /todo com focus no id', () => {
    const itens: TarefaConcluidaItem[] = [
      {
        id: 'tarefa:2026-05-13:Comprar pao',
        titulo: 'Comprar pao',
        categoria: 'casa',
        feito_em: '2026-05-13T08:00:00-03:00',
      },
    ];
    const { getByLabelText } = render(<RecapSecaoTarefas itens={itens} />);
    fireEvent.press(getByLabelText('tarefa Comprar pao'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/todo',
      params: { focus: 'tarefa:2026-05-13:Comprar pao' },
    });
  });

  it('agrupa por categoria e cada linha e clicavel', () => {
    const itens: TarefaConcluidaItem[] = [
      {
        id: 'tarefa:2026-05-13:Lavar louca',
        titulo: 'Lavar louca',
        categoria: 'casa',
        feito_em: '2026-05-13T08:00:00-03:00',
      },
      {
        id: 'tarefa:2026-05-12:Comprar pao',
        titulo: 'Comprar pao',
        categoria: 'casa',
        feito_em: '2026-05-12T07:00:00-03:00',
      },
      {
        id: 'tarefa:2026-05-11:Estudar',
        titulo: 'Estudar',
        categoria: 'desenvolvimento_pessoal',
        feito_em: '2026-05-11T20:00:00-03:00',
      },
    ];
    const { getByLabelText } = render(<RecapSecaoTarefas itens={itens} />);
    fireEvent.press(getByLabelText('tarefa Estudar'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/todo',
      params: { focus: 'tarefa:2026-05-11:Estudar' },
    });
  });
});
