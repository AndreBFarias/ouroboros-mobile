// Testes do SecaoEvolucaoCorporal (M11.4). Cobre:
//  - empty state quando nao ha medidas
//  - render de N cards mensais com peso e delta vs anterior
//  - botao "Registrar evolucao" navega para /medidas/novo
//  - tap em card chama router.push para /medidas com focus param
//  - subtitulo "Ultima medida ha X dias." formatado em PT-BR
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import { SecaoEvolucaoCorporal } from '@/components/screens/EvolucaoCorporalTab/SecaoEvolucaoCorporal';
import type { Medida } from '@/lib/schemas/medidas';

// Mock do useRouter para capturar navegacao sem montar o expo stack.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useFocusEffect: () => undefined,
}));

// Estado controlado do useMedidas para cada teste.
let mockMedidas: Medida[] = [];
jest.mock('@/lib/hooks/useMedidas', () => ({
  __esModule: true,
  useMedidas: () => ({
    medidas: mockMedidas,
    loading: false,
    error: null,
    recarregar: jest.fn(),
  }),
}));

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: (sel: (s: { vaultRoot: string | null }) => unknown) =>
    sel({ vaultRoot: 'file:///vault' }),
}));

function medida(over: Partial<Medida>): Medida {
  return {
    tipo: 'medidas',
    data: '2026-04-01',
    autor: 'pessoa_a',
    fotos: [],
    ...over,
  };
}

beforeEach(() => {
  mockPush.mockReset();
  mockMedidas = [];
});

describe('SecaoEvolucaoCorporal', () => {
  it('mostra empty state quando nao ha medidas', () => {
    mockMedidas = [];
    const { getByText, queryByText } = render(<SecaoEvolucaoCorporal />);

    expect(getByText('Evolução corporal')).toBeTruthy();
    expect(getByText('Sem registros corporais ainda.')).toBeTruthy();
    expect(getByText('O primeiro registro abre a evolução visual.')).toBeTruthy();
    // Subtitulo de "ultima medida" nao aparece sem dados.
    expect(queryByText(/Última medida/)).toBeNull();
  });

  it('renderiza cards com peso e delta vs anterior', () => {
    // Ordem desc por data (ja vem do useMedidas/listarMedidas).
    mockMedidas = [
      medida({ data: '2026-04-01', peso: 78.0 }),
      medida({ data: '2026-03-01', peso: 79.5 }),
    ];
    const { getByText, getAllByLabelText } = render(<SecaoEvolucaoCorporal />);

    // Dois cards renderizados.
    const cards = getAllByLabelText(/abrir medida de/);
    expect(cards).toHaveLength(2);

    // Pesos formatados em PT-BR (virgula, 1 decimal).
    expect(getByText('78,0')).toBeTruthy();
    expect(getByText('79,5')).toBeTruthy();

    // Delta do card mais recente (2026-04-01) vs anterior cronologico
    // (2026-03-01): 78,0 - 79,5 = -1,5 -> "-1,5 kg vs anterior".
    expect(getByText('-1,5 kg vs anterior')).toBeTruthy();
  });

  it('mostra travessao quando peso ausente', () => {
    mockMedidas = [medida({ data: '2026-04-01', cintura: 80 })];
    const { getByText } = render(<SecaoEvolucaoCorporal />);
    expect(getByText('—')).toBeTruthy();
  });

  it('botao registrar evolucao navega para /medidas/novo', () => {
    mockMedidas = [];
    const { getByLabelText } = render(<SecaoEvolucaoCorporal />);

    const botao = getByLabelText('registrar evolucao');
    fireEvent.press(botao);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/medidas/novo');
  });

  it('tap em card chama router.push para /medidas com focus', () => {
    mockMedidas = [medida({ data: '2026-04-15', peso: 77.0 })];
    const { getByLabelText } = render(<SecaoEvolucaoCorporal />);

    const card = getByLabelText(/abrir medida de/);
    fireEvent.press(card);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/medidas',
      params: { focus: '2026-04-15' },
    });
  });

  it('subtitulo "Última medida há N dias." em PT-BR', () => {
    // Hoje fixo para teste deterministico: 2026-05-04.
    const hoje = new Date(Date.UTC(2026, 4, 4));
    mockMedidas = [medida({ data: '2026-04-20', peso: 78.0 })];

    const { getByText } = render(<SecaoEvolucaoCorporal hoje={hoje} />);
    expect(getByText('Última medida há 14 dias.')).toBeTruthy();
  });

  it('subtitulo singular "Última medida ontem." quando 1 dia', () => {
    const hoje = new Date(Date.UTC(2026, 4, 4));
    mockMedidas = [medida({ data: '2026-05-03', peso: 78.0 })];

    const { getByText } = render(<SecaoEvolucaoCorporal hoje={hoje} />);
    expect(getByText('Última medida ontem.')).toBeTruthy();
  });

  it('subtitulo "Última medida hoje." quando mesmo dia', () => {
    const hoje = new Date(Date.UTC(2026, 4, 4));
    mockMedidas = [medida({ data: '2026-05-04', peso: 78.0 })];

    const { getByText } = render(<SecaoEvolucaoCorporal hoje={hoje} />);
    expect(getByText('Última medida hoje.')).toBeTruthy();
  });
});
