// Testes do card SecaoAindaDeOntem (R-HOME-4b). Cobre:
//   - self-hide: sem rollover (lista vazia OU so tarefa de hoje) o card
//     nao renderiza titulo (feed adaptativo, sem caixa "Nada ...").
//   - com 1 tarefa pendente de ontem: renderiza "Ainda de ontem" + titulo
//     + rotulo "ontem".
//   - fronteira: a tarefa de HOJE presente na mesma lista NAO aparece
//     neste card (vai para o To-do hoje) -> zero duplicacao.
//
// dataLocalYmd e mockado para uma data fixa ('hoje' = 2026-07-10) para
// tornar o teste deterministico independente do relogio; as tarefas usam
// datas fixas relativas a ela.
//
// Comentarios sem acento (convencao shell/CI).
import { render, waitFor } from '@testing-library/react-native';

const HOJE = '2026-07-10';

let mockFixtureTarefas: Array<{
  meta: Record<string, unknown>;
  rel: string;
}> = [];

jest.mock('@/lib/vault/tarefas', () => ({
  __esModule: true,
  listarTarefas: jest.fn(async () => mockFixtureTarefas),
  marcarFeito: jest.fn(async () => ({})),
}));

jest.mock('@/lib/datetime/local', () => ({
  __esModule: true,
  // Literal inline: jest.mock factory nao pode referenciar const de
  // modulo (HOJE). Mantido igual a HOJE abaixo.
  dataLocalYmd: () => '2026-07-10',
}));

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');
  return {
    __esModule: true,
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

import { SecaoAindaDeOntem } from '@/components/hoje/SecaoAindaDeOntem';
import { useVault } from '@/lib/stores/vault';

function mkMeta(data: string, feito: boolean, titulo: string) {
  return {
    tipo: 'tarefa',
    data,
    autor: 'pessoa_a',
    titulo,
    feito,
    feito_em: feito ? '2026-07-10T10:00:00-03:00' : null,
    categoria: 'outro',
    pessoa_destino: { tipo: 'mim' },
    alarme: null,
    silenciar_sugestao_ate: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFixtureTarefas = [];
  useVault.setState({ vaultRoot: 'content://test/vault' });
});

describe('SecaoAindaDeOntem', () => {
  it('self-hide: sem tarefas nao renderiza o card', async () => {
    mockFixtureTarefas = [];
    const { queryByText } = render(<SecaoAindaDeOntem />);
    await waitFor(() => {
      expect(queryByText('Ainda de ontem')).toBeNull();
    });
  });

  it('self-hide: so tarefa de hoje pendente nao renderiza o card', async () => {
    mockFixtureTarefas = [
      { meta: mkMeta(HOJE, false, 'Tarefa de hoje'), rel: 'markdown/tarefa-hoje.md' },
    ];
    const { queryByText } = render(<SecaoAindaDeOntem />);
    await waitFor(() => {
      // A tarefa de hoje pertence ao To-do hoje, nunca a este card.
      expect(queryByText('Ainda de ontem')).toBeNull();
    });
    expect(queryByText('Tarefa de hoje')).toBeNull();
  });

  it('renderiza titulo + rotulo "ontem" para tarefa pendente de ontem', async () => {
    mockFixtureTarefas = [
      {
        meta: mkMeta('2026-07-09', false, 'Comprar presente'),
        rel: 'markdown/tarefa-presente.md',
      },
    ];
    const { getByText } = render(<SecaoAindaDeOntem />);
    await waitFor(() => {
      expect(getByText('Ainda de ontem')).toBeTruthy();
    });
    expect(getByText('Comprar presente')).toBeTruthy();
    expect(getByText('ontem')).toBeTruthy();
  });

  it('fronteira: tarefa de hoje nao aparece junto no card de rollover', async () => {
    mockFixtureTarefas = [
      { meta: mkMeta(HOJE, false, 'Terminar relatorio'), rel: 'markdown/tarefa-hoje.md' },
      {
        meta: mkMeta('2026-07-09', false, 'Comprar presente'),
        rel: 'markdown/tarefa-presente.md',
      },
    ];
    const { getByText, queryByText } = render(<SecaoAindaDeOntem />);
    await waitFor(() => {
      expect(getByText('Comprar presente')).toBeTruthy();
    });
    // A de hoje fica de fora deste card (vai para o To-do hoje).
    expect(queryByText('Terminar relatorio')).toBeNull();
  });

  it('rotulo "ha N dias" para tarefa de varios dias atras', async () => {
    mockFixtureTarefas = [
      {
        meta: mkMeta('2026-07-07', false, 'Ligar para o medico'),
        rel: 'markdown/tarefa-medico.md',
      },
    ];
    const { getByText } = render(<SecaoAindaDeOntem />);
    await waitFor(() => {
      expect(getByText('há 3 dias')).toBeTruthy();
    });
  });
});
