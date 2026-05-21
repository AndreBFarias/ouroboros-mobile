// R-RECAP-3: testes especificos do empty state nao-toxico do
// RecapScreen.
//
// Cobertura:
//  - cenario "tudo vazio" -> EmptyState global com frase do pool.
//  - cenario "numeros > 0 mas listas vazias" -> sem EmptyState, e
//    grid Numeros aparece (totalNumeros conta).
//  - cenario "numeros zero mas listas com itens" -> sem grid Numeros
//    (ocultado), mas listas aparecem.
//
// Estrategia: mockamos useRecap para devolver RecapData controlada,
// sem precisar mockar cada helper de vault.
//
// R-RECAP-1: cenarios com itens nas listas precisam de ToastProvider
// na arvore porque RecapSecao* invocam useToast para mostrar
// "Edicao em breve." em itens sem destino navegavel.
import type { ReactElement } from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '@/components/ui';

function renderComToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

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
  // R-RECAP-PERIODO-DIA: RecapScreen le `?periodo` para escolher modo
  // inicial. Mock retorna objeto vazio aqui (suite empty-states nao
  // exercita query param; default 'semana' aplica).
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: (selector: (s: { vaultRoot: string | null }) => unknown) =>
    selector({ vaultRoot: 'content://test/vault' }),
}));

// useConquistas: nao toca neste fluxo (so' modo Calendario).
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

// Mock direto do useRecap para controlar data sem rodar I/O.
const mockUseRecap = jest.fn();
jest.mock('@/lib/hooks/useRecap', () => {
  const actual = jest.requireActual('@/lib/hooks/useRecap');
  return {
    __esModule: true,
    ...actual,
    useRecap: (range: unknown) => mockUseRecap(range),
  };
});

import { RecapScreen } from '@/components/screens/RecapScreen';

const numerosZerados = {
  registros: 0,
  treinos: 0,
  fotos: 0,
  audios: 0,
  videos: 0,
  eventos_positivos: 0,
  eventos_negativos: 0,
  tarefas_concluidas: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(false);
});

describe('RecapScreen R-RECAP-3 empty states', () => {
  it('tudo vazio -> exibe EmptyState global do pool', async () => {
    mockUseRecap.mockReturnValue({
      data: {
        conquistas: [],
        crises: [],
        reflexoes: [],
        evolucoes: [],
        tarefasConcluidas: [],
        numeros: numerosZerados,
      },
      loading: false,
    });
    const { findByLabelText } = render(<RecapScreen />);
    const empty = await findByLabelText(/^vazio: /);
    expect(empty).toBeTruthy();
  });

  it('data === null -> exibe EmptyState global do pool', async () => {
    mockUseRecap.mockReturnValue({ data: null, loading: false });
    const { findByLabelText } = render(<RecapScreen />);
    const empty = await findByLabelText(/^vazio: /);
    expect(empty).toBeTruthy();
  });

  it('numeros > 0 com listas vazias -> sem EmptyState global, grid Numeros aparece', async () => {
    mockUseRecap.mockReturnValue({
      data: {
        conquistas: [],
        crises: [],
        reflexoes: [],
        evolucoes: [],
        tarefasConcluidas: [],
        numeros: {
          ...numerosZerados,
          registros: 3,
        },
      },
      loading: false,
    });
    const { queryByLabelText, findByLabelText } = renderComToast(
      <RecapScreen />
    );
    // Grid Numeros visivel.
    expect(await findByLabelText('secao numeros')).toBeTruthy();
    // Nao deve haver EmptyState global.
    expect(queryByLabelText(/^vazio: /)).toBeNull();
  });

  it('listas com itens mas numeros zerados -> grid Numeros ocultado', async () => {
    mockUseRecap.mockReturnValue({
      data: {
        conquistas: [
          {
            id: 'q1',
            data: '2026-05-15',
            origem: 'marco',
            frase: 'Conquista de exemplo',
            cor: 'green',
          },
        ],
        crises: [],
        reflexoes: [],
        evolucoes: [],
        tarefasConcluidas: [],
        numeros: numerosZerados,
      },
      loading: false,
    });
    const { queryByLabelText } = renderComToast(<RecapScreen />);
    await waitFor(() => {
      // Grid Numeros ocultado (todos os campos zerados).
      expect(queryByLabelText('secao numeros')).toBeNull();
    });
    // Nao deve haver EmptyState global.
    expect(queryByLabelText(/^vazio: /)).toBeNull();
  });
});
