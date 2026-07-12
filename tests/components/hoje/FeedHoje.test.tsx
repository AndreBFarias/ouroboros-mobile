// Testes do registry FeedHoje (R-HOME-4a; ampliado em 4b/4c/4d). Cobre:
//   - ordem canonica de FEED_CARDS (mae §2), agora com ainda-de-ontem (4)
//     e relembrando (7).
//   - com hooks vazios, os DOIS cards garantidos ("Voces" no topo e
//     "Relembrando" no rodape, este em boas-vindas) aparecem; nenhuma
//     caixa "Nada nas próximas horas" / "Sem tarefas pendentes"; os
//     cards self-hide (Próximos/To-do/Passos) somem.
//
// Mocks: useHumorCasal (vazio), useProximos (vazio), listarTarefas ([]),
// lerPassosHojeHC (null), useRelembrando (cold start) e expo-router.
// Stores reais para nome/titulo.
//
// Comentarios sem acento (convencao shell/CI).
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/hooks/useHumorCasal', () => ({
  __esModule: true,
  useHumorCasal: () => ({
    pessoaA: null,
    pessoaB: null,
    ehSozinho: false,
    loading: false,
    reload: () => undefined,
  }),
}));

jest.mock('@/lib/hooks/useProximos', () => ({
  __esModule: true,
  useProximos: () => ({
    itens: [],
    loading: false,
    error: null,
    reload: () => undefined,
  }),
}));

jest.mock('@/lib/vault/tarefas', () => ({
  __esModule: true,
  listarTarefas: jest.fn(async () => []),
  marcarFeito: jest.fn(async () => ({})),
}));

jest.mock('@/lib/health/passosHoje', () => ({
  __esModule: true,
  lerPassosHojeHC: jest.fn(async () => null),
}));

// R-HOME-4d: mock de useRelembrando para o card garantido "Relembrando"
// cair deterministicamente no cold start (pool vazio -> boas-vindas), sem
// tocar o Vault real no ambiente de teste.
jest.mock('@/lib/hooks/useRelembrando', () => ({
  __esModule: true,
  useRelembrando: () => ({ relembranca: null, loading: false }),
}));

// R-HOME-4c: mock de useRecap para o card "Na sua semana" fazer
// self-hide deterministico (data null -> null) no cenario de feed vazio,
// sem tocar o Vault real. resolverPeriodo real preservado via
// requireActual.
jest.mock('@/lib/hooks/useRecap', () => {
  const actual = jest.requireActual('@/lib/hooks/useRecap');
  return {
    __esModule: true,
    ...actual,
    useRecap: () => ({ data: null, loading: false }),
  };
});

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

import { FeedHoje, FEED_CARDS } from '@/components/hoje/FeedHoje';
import { ToastProvider } from '@/components/ui';
import { usePessoa } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';

beforeEach(() => {
  jest.clearAllMocks();
  usePessoa.setState({ nomes: { pessoa_a: 'Alice', pessoa_b: 'Bob' } });
  useOnboarding.setState({ tipoCompanhia: 'casal' });
  useVault.setState({ vaultRoot: 'content://test/vault' });
});

function renderFeed() {
  return render(
    <ToastProvider>
      <FeedHoje />
    </ToastProvider>
  );
}

describe('FeedHoje', () => {
  it('FEED_CARDS segue a ordem canonica', () => {
    expect(FEED_CARDS.map((c) => c.id)).toEqual([
      'voces',
      'proximos',
      'todo',
      'ainda-de-ontem',
      'passos',
      'na-sua-semana',
      'relembrando',
    ]);
  });

  it('feed vazio: os dois cards garantidos aparecem, sem caixa "Nada"', async () => {
    const { getByText, queryByText } = renderFeed();

    // Cards garantidos presentes: Voces (topo) e Relembrando (rodape,
    // em boas-vindas no cold start).
    expect(getByText('Vocês')).toBeTruthy();
    expect(getByText('Relembrando')).toBeTruthy();
    expect(
      getByText('Um lugar para guardar o que vocês viverem, a partir de hoje.')
    ).toBeTruthy();

    await waitFor(() => {
      // Cards self-hide sumiram (sem titulo).
      expect(queryByText('Próximos')).toBeNull();
      expect(queryByText('To-do hoje')).toBeNull();
      // R-HOME-4b: sem rollover (listarTarefas -> []), o card "Ainda de
      // ontem" tambem se auto-oculta (feed adaptativo).
      expect(queryByText('Ainda de ontem')).toBeNull();
    });

    // Nenhuma caixa de empty state toxica.
    expect(queryByText('Nada nas próximas horas.')).toBeNull();
    expect(queryByText('Sem tarefas pendentes. Toque + para criar.')).toBeNull();
    // Passos oculto (leitura null).
    expect(queryByText(/passos/)).toBeNull();
  });
});
