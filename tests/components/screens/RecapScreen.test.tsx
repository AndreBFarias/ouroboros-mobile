// Smoke do RecapScreen (M36 + L2 M-RECAP-CALENDARIO-UNIFICAR).
// Foco no estado vazio, troca de periodo via ChipGroup e toggle
// de modo Lista/Calendario (L2). Os agregados sao testados em
// useRecap.test.ts; aqui validamos render condicional, toggle e
// navegacao.
//
// Mocks:
//  - useVault: vaultRoot fixo.
//  - vault helpers (humor/diario/eventos/marcos/contadores/treinos/
//    tarefas) retornam listas vazias para forcar empty state previsivel.
//  - expo-router: useRouter mockado.
//  - useConquistas (modo Calendario): retorna listas vazias.
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => false);

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: (selector: (s: { vaultRoot: string | null }) => unknown) =>
    selector({ vaultRoot: 'content://test/vault' }),
}));

jest.mock('@/lib/vault/humor', () => ({
  __esModule: true,
  listarHumor: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/vault/diario', () => ({
  __esModule: true,
  listarDiarios: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/vault/eventos', () => ({
  __esModule: true,
  listarEventos: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/vault/marcos', () => ({
  __esModule: true,
  listarMarcos: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/vault/contadores', () => ({
  __esModule: true,
  listarContadores: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/vault/treinos', () => ({
  __esModule: true,
  listarTreinos: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/vault/tarefas', () => ({
  __esModule: true,
  listarTarefas: jest.fn().mockResolvedValue([]),
}));

// L2: mock do useConquistas para o modo Calendario nao tentar I/O.
jest.mock('@/lib/hooks/useConquistas', () => ({
  __esModule: true,
  useConquistas: () => ({
    brutas: [],
    conquistas: [],
    totaisPorOrigem: { evento_positivo: 0, diario_vitoria: 0 },
    loading: false,
    error: null,
    filtros: {
      pessoa: 'ambos',
      mes: null,
      tipoMidia: 'todos',
      intensidade: null,
      bairro: '',
    },
    setFiltroPessoa: jest.fn(),
    setFiltroMes: jest.fn(),
    setFiltroTipoMidia: jest.fn(),
    setFiltroIntensidade: jest.fn(),
    setFiltroBairro: jest.fn(),
    resetarFiltros: jest.fn(),
    recarregar: jest.fn().mockResolvedValue(undefined),
  }),
}));

// react-native-calendars mock: View neutra com aria-label para nao
// renderizar arvore real do Calendar (testado em CalendarGrid.test).
jest.mock('react-native-calendars', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    Calendar: () =>
      ReactNative.createElement(ReactNative.View, {
        accessibilityLabel: 'mock-calendar',
      }),
    LocaleConfig: { locales: {}, defaultLocale: 'pt-BR' },
  };
});

import { RecapScreen } from '@/components/screens/RecapScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(false);
});

describe('RecapScreen', () => {
  it('renderiza titulo "Recap" e botao fechar', async () => {
    const { findByText, getByLabelText } = render(<RecapScreen />);
    expect(await findByText('Recap')).toBeTruthy();
    expect(getByLabelText('fechar recap')).toBeTruthy();
  });

  it('renderiza chips de periodo Semana / Mes / Ano / Personalizado no modo Lista', async () => {
    const { findByText, getByText } = render(<RecapScreen />);
    expect(await findByText('Semana')).toBeTruthy();
    expect(getByText('Mês')).toBeTruthy();
    expect(getByText('Ano')).toBeTruthy();
    expect(getByText('Personalizado')).toBeTruthy();
  });

  it('mostra empty state quando o vault nao tem registros no periodo', async () => {
    const { findByText } = render(<RecapScreen />);
    expect(
      await findByText('Nenhum registro neste período.')
    ).toBeTruthy();
  });

  // L2 (M-RECAP-CALENDARIO-UNIFICAR)
  it('renderiza toggle de modo Lista/Calendario com Lista ativo por default', async () => {
    const { findByLabelText } = render(<RecapScreen />);
    const lista = await findByLabelText('modo lista');
    const calendario = await findByLabelText('modo calendario');
    expect(lista).toBeTruthy();
    expect(calendario).toBeTruthy();
    // Estado de selecao: Lista comeca selecionado.
    expect(lista.props.accessibilityState?.selected).toBe(true);
    expect(calendario.props.accessibilityState?.selected).toBe(false);
  });

  it('alterna para modo Calendario ao tocar no botao Calendario', async () => {
    const { findByLabelText, queryByText, findByText } = render(<RecapScreen />);
    const calendario = await findByLabelText('modo calendario');
    fireEvent.press(calendario);
    await waitFor(() => {
      // ChipGroup do periodo so aparece no modo Lista; ao trocar
      // para Calendario os chips somem.
      expect(queryByText('Semana')).toBeNull();
    });
    // Mock de useConquistas tem brutas=[], entao o modo Calendario
    // renderiza EmptyState com a frase "Sua primeira conquista vai
    // aparecer aqui." — sinal de que migrou para o modo Calendario.
    expect(
      await findByText('Sua primeira conquista vai aparecer aqui.')
    ).toBeTruthy();
  });

  it('chips de periodo somem no modo Calendario e voltam ao trocar para Lista', async () => {
    const { findByLabelText, getByText, queryByText } = render(<RecapScreen />);
    fireEvent.press(await findByLabelText('modo calendario'));
    await waitFor(() => {
      expect(queryByText('Semana')).toBeNull();
    });
    fireEvent.press(await findByLabelText('modo lista'));
    await waitFor(() => {
      expect(getByText('Semana')).toBeTruthy();
    });
  });
});
