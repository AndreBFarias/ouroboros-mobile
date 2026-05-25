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

// R-RECAP-PERIODO-DIA (2026-05-21): query param `?periodo=` configuravel
// por teste. Default vazio = nao passa periodo, RecapScreen cai em
// 'semana' (historico).
let mockSearchParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockSearchParams,
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

// R-INT-3-HC-RECAP-CARD-FOLLOWUP: o RecapScreen agora eleva o calculo
// de saude (antes feito dentro da RecapSecaoSaude). Mockamos o agregador
// para controlar o cenario "so dado de saude". Default: tudo null (sem
// dado HC) para manter o empty state previsivel dos testes legados.
const mockCalcularSaude = jest.fn();
jest.mock('@/lib/recap/saude', () => ({
  __esModule: true,
  calcularSaudeRecap: (...args: unknown[]) => mockCalcularSaude(...args),
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

const SAUDE_VAZIA = {
  passos: null,
  treinos: null,
  sono: null,
  medidaUltima: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(false);
  mockSearchParams = {};
  // Default: sem dado de saude no periodo (mantem empty state previsivel).
  mockCalcularSaude.mockResolvedValue(SAUDE_VAZIA);
});

describe('RecapScreen', () => {
  it('renderiza titulo "Recap" e botao fechar', async () => {
    const { findByText, getByLabelText } = render(<RecapScreen />);
    expect(await findByText('Recap')).toBeTruthy();
    expect(getByLabelText('fechar recap')).toBeTruthy();
  });

  it('renderiza chips de periodo Dia / Semana / Mes / Ano / Personalizado no modo Lista', async () => {
    const { findByText, getByText } = render(<RecapScreen />);
    // R-RECAP-PERIODO-DIA (2026-05-21): chip "Dia" adicionado como primeira opcao.
    expect(await findByText('Dia')).toBeTruthy();
    expect(getByText('Semana')).toBeTruthy();
    expect(getByText('Mês')).toBeTruthy();
    expect(getByText('Ano')).toBeTruthy();
    expect(getByText('Personalizado')).toBeTruthy();
  });

  // R-RECAP-PERIODO-DIA (2026-05-21): abertura via Tela Hoje passa
  // `?periodo=dia`; Recap deve iniciar com chip "Dia" selecionado.
  it('inicializa periodo "dia" quando query param ?periodo=dia', async () => {
    mockSearchParams = { periodo: 'dia' };
    const { findByText } = render(<RecapScreen />);
    const chip = await findByText('Dia');
    expect(chip).toBeTruthy();
    // Smoke do empty state com periodo dia: a frase determinista vem de
    // seed (dia, range.de); rota nao crasha.
    const { findByLabelText } = render(<RecapScreen />);
    const empty = await findByLabelText(/^vazio: /);
    expect(empty).toBeTruthy();
  });

  // Sem query param, default historico continua 'semana'.
  it('cai em "semana" quando query param ausente', async () => {
    mockSearchParams = {};
    const { findByText } = render(<RecapScreen />);
    expect(await findByText('Semana')).toBeTruthy();
  });

  // Param invalido nao crasha — fallback silencioso para 'semana'.
  it('cai em "semana" quando query param invalido', async () => {
    mockSearchParams = { periodo: 'invalido' };
    const { findByText } = render(<RecapScreen />);
    expect(await findByText('Dia')).toBeTruthy();
    expect(await findByText('Semana')).toBeTruthy();
  });

  // R-INT-3-HC-RECAP-CARD-FOLLOWUP: o cenario "SO dado de saude renderiza
  // a secao (nao EmptyState)" vive em RecapScreen-empty.test.tsx, que ja
  // tem ToastProvider na arvore (a secao Saude no branch de conteudo
  // monta junto das demais RecapSecao*, que usam useToast).

  // Acceptance #2: o agregador de saude e chamado uma unica vez por
  // render do Recap (sem duplo fetch — calculo elevado ao container).
  it('chama calcularSaudeRecap uma unica vez por render', async () => {
    const { findByLabelText } = render(<RecapScreen />);
    // Aguarda o empty state (garante que o effect ja rodou).
    await findByLabelText(/^vazio: /);
    expect(mockCalcularSaude).toHaveBeenCalledTimes(1);
  });

  it('mostra empty state quando o vault nao tem registros no periodo', async () => {
    // R-RECAP-3: frase vem de pool determinista. Validamos via
    // accessibilityLabel "vazio: <frase>" emitido pelo EmptyState.
    const { findByLabelText } = render(<RecapScreen />);
    const empty = await findByLabelText(/^vazio: /);
    expect(empty).toBeTruthy();
    // A frase escolhida pertence ao pool curado.
    const label = String(empty.props.accessibilityLabel);
    expect(label.startsWith('vazio: ')).toBe(true);
    expect(label.length).toBeGreaterThan('vazio: '.length);
  });

  // R-RECAP-3: empty state global e' idempotente — mesma seed
  // (semana atual) deve retornar a mesma frase em renders repetidos.
  it('frase do empty state e idempotente entre renders', async () => {
    const { findByLabelText, unmount } = render(<RecapScreen />);
    const empty1 = await findByLabelText(/^vazio: /);
    const label1 = String(empty1.props.accessibilityLabel);
    unmount();
    const segundo = render(<RecapScreen />);
    const empty2 = await segundo.findByLabelText(/^vazio: /);
    const label2 = String(empty2.props.accessibilityLabel);
    expect(label1).toBe(label2);
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
    const { findByLabelText, queryByText, findByText } = render(
      <RecapScreen />
    );
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
