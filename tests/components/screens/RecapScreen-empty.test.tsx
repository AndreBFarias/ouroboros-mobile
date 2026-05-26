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

// R-INT-3-HC-RECAP-CARD-FOLLOWUP: o RecapScreen eleva o calculo de saude.
// Mockamos o agregador para controlar o cenario "so dado de saude".
// Default: tudo null (sem dado HC) para nao interferir nos cenarios
// legados de empty state.
const mockCalcularSaude = jest.fn();
jest.mock('@/lib/recap/saude', () => ({
  __esModule: true,
  calcularSaudeRecap: (...args: unknown[]) => mockCalcularSaude(...args),
}));

// R-INT-2-CALENDAR-RECAP-CARD: o RecapScreen tambem eleva o calculo de
// agenda. Mockamos o agregador para controlar o cenario "so agenda".
// Default: null (sem evento) para nao interferir nos empty states
// legados.
const mockCalcularAgenda = jest.fn();
jest.mock('@/lib/recap/agenda', () => ({
  __esModule: true,
  calcularAgendaRecap: (...args: unknown[]) => mockCalcularAgenda(...args),
}));

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

const SAUDE_VAZIA = {
  passos: null,
  treinos: null,
  sono: null,
  medidaUltima: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(false);
  // Default: sem dado de saude (mantem empty states legados previsiveis).
  mockCalcularSaude.mockResolvedValue(SAUDE_VAZIA);
  // Default: sem evento na agenda (null), mantem empty states legados.
  mockCalcularAgenda.mockResolvedValue(null);
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

  // R-INT-3-HC-RECAP-CARD-FOLLOWUP (acceptance #1): usuario com SOMENTE
  // dado de saude (passos/treinos/sono/medidas vindos do autopull HC) e
  // nenhum outro registro deve ver a secao Saude, nao o EmptyState. Antes
  // o predicado de vazio so somava conquistas/numeros/etc e a secao Saude
  // era engolida pelo EmptyState.
  it('so dado de saude (listas e numeros zerados) -> renderiza secao Saude, sem EmptyState', async () => {
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
    mockCalcularSaude.mockResolvedValue({
      passos: { total: 57300, mediaDia: 8186 },
      treinos: null,
      sono: null,
      medidaUltima: null,
    });
    const { findByLabelText, queryByLabelText } = renderComToast(
      <RecapScreen />
    );
    // Secao Saude visivel.
    expect(await findByLabelText('secao saude')).toBeTruthy();
    // EmptyState global NAO aparece.
    expect(queryByLabelText(/^vazio: /)).toBeNull();
  });

  // Sem dado de saude E sem outros registros -> EmptyState (gate antigo
  // preservado: saude null nao torna o recap nao-vazio).
  it('sem saude e sem registros -> mantem EmptyState global', async () => {
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
    // mockCalcularSaude ja devolve SAUDE_VAZIA por default.
    const { findByLabelText } = render(<RecapScreen />);
    expect(await findByLabelText(/^vazio: /)).toBeTruthy();
  });

  // R-INT-2-CALENDAR-RECAP-CARD: usuario com SOMENTE evento na agenda
  // (listas e numeros zerados, sem saude) deve ver a secao Agenda, nao
  // o EmptyState. Predicado temDadoAgenda torna o recap nao-vazio.
  it('so dado de agenda (listas e numeros zerados) -> renderiza secao Agenda, sem EmptyState', async () => {
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
    mockCalcularAgenda.mockResolvedValue({
      totalEventos: 5,
      diasComEvento: 2,
      proximoTitulo: 'Reunião',
    });
    const { findByLabelText, queryByLabelText } = renderComToast(
      <RecapScreen />
    );
    // Secao Agenda visivel.
    expect(await findByLabelText('secao agenda')).toBeTruthy();
    // EmptyState global NAO aparece.
    expect(queryByLabelText(/^vazio: /)).toBeNull();
  });
});
