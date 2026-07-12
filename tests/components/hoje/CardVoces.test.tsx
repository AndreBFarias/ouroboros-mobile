// Testes do CardVoces (R-HOME-4a). Cobre os quatro cenarios da spec §9:
//   (a) ambos registraram hoje -> dois rotulos de mood.
//   (b) so pessoa_a hoje -> convite para pessoa_b.
//   (c) ninguem -> dois convites.
//   (d) sozinho -> so uma linha, titulo "Voce".
// Mais: tap na linha navega para /humor-rapido (sem pre-trocar pessoa).
//
// Mocka useHumorCasal (dados controlados) e expo-router useRouter; usa
// os stores reais para nome (useNomeDe) e titulo (useOnboarding).
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { HumorPessoa } from '@/lib/hooks/useHumorCasal';

const mockUseHumorCasal = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/hooks/useHumorCasal', () => ({
  __esModule: true,
  useHumorCasal: () => mockUseHumorCasal(),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { CardVoces } from '@/components/hoje/CardVoces';
import { usePessoa } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';

// YYYY-MM-DD de hoje no fuso BRT (para registrouHoje mostrar "hoje").
function hojeBrt(): string {
  const local = new Date(Date.now() + -180 * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function humorMeta(nivel: number): HumorMeta {
  return {
    tipo: 'humor',
    data: hojeBrt(),
    autor: 'pessoa_a',
    humor: nivel,
    energia: 3,
    ansiedade: 3,
    foco: 3,
    tags: [],
  };
}

function registro(nivel: number): HumorPessoa {
  return { meta: humorMeta(nivel), dataYmd: hojeBrt(), registrouHoje: true };
}

beforeEach(() => {
  jest.clearAllMocks();
  usePessoa.setState({ nomes: { pessoa_a: 'Alice', pessoa_b: 'Bob' } });
  useOnboarding.setState({ tipoCompanhia: 'casal' });
});

describe('CardVoces', () => {
  it('(a) ambos registraram hoje -> dois rotulos de mood', () => {
    mockUseHumorCasal.mockReturnValue({
      pessoaA: registro(3), // na media
      pessoaB: registro(5), // radiante
      ehSozinho: false,
      loading: false,
      reload: jest.fn(),
    });
    const { getByText } = render(<CardVoces />);
    expect(getByText('Vocês')).toBeTruthy();
    expect(getByText(/na média · hoje/)).toBeTruthy();
    expect(getByText(/radiante · hoje/)).toBeTruthy();
  });

  it('(b) so pessoa_a hoje -> convite para pessoa_b', () => {
    mockUseHumorCasal.mockReturnValue({
      pessoaA: registro(4), // leve
      pessoaB: { meta: humorMeta(2), dataYmd: '2026-01-01', registrouHoje: false },
      ehSozinho: false,
      loading: false,
      reload: jest.fn(),
    });
    const { getByText, getAllByText } = render(<CardVoces />);
    expect(getByText(/leve · hoje/)).toBeTruthy();
    // Exatamente um convite (pessoa_b).
    expect(getAllByText(/ainda não registrou hoje/)).toHaveLength(1);
  });

  it('(c) ninguem registrou -> dois convites, nenhuma caixa "Nada"', () => {
    mockUseHumorCasal.mockReturnValue({
      pessoaA: null,
      pessoaB: null,
      ehSozinho: false,
      loading: false,
      reload: jest.fn(),
    });
    const { getByText, getAllByText, queryByText } = render(<CardVoces />);
    expect(getByText('Vocês')).toBeTruthy();
    expect(getAllByText(/ainda não registrou hoje/)).toHaveLength(2);
    expect(queryByText(/Nada/)).toBeNull();
  });

  it('(d) sozinho -> uma linha, titulo "Voce", sem pessoa_b', () => {
    useOnboarding.setState({ tipoCompanhia: 'sozinho' });
    mockUseHumorCasal.mockReturnValue({
      pessoaA: registro(3),
      pessoaB: null,
      ehSozinho: true,
      loading: false,
      reload: jest.fn(),
    });
    const { getByText, queryByText } = render(<CardVoces />);
    expect(getByText('Você')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText(/na média · hoje/)).toBeTruthy();
    // Linha de pessoa_b ausente.
    expect(queryByText('Bob')).toBeNull();
  });

  it('loading nao pisca "Nada": mostra titulo + nomes neutros', () => {
    mockUseHumorCasal.mockReturnValue({
      pessoaA: null,
      pessoaB: null,
      ehSozinho: false,
      loading: true,
      reload: jest.fn(),
    });
    const { getByText, queryByText } = render(<CardVoces />);
    expect(getByText('Vocês')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    // Sem convite nem "Nada" durante loading.
    expect(queryByText(/ainda não registrou hoje/)).toBeNull();
    expect(queryByText(/Nada/)).toBeNull();
  });

  it('tap na linha navega para /humor-rapido (sem trocar pessoa)', () => {
    mockUseHumorCasal.mockReturnValue({
      pessoaA: null,
      pessoaB: null,
      ehSozinho: false,
      loading: false,
      reload: jest.fn(),
    });
    const { getAllByRole } = render(<CardVoces />);
    // A linha inteira e um Pressable (role button); pressiona a primeira.
    fireEvent.press(getAllByRole('button')[0]);
    expect(mockPush).toHaveBeenCalledWith('/humor-rapido');
  });
});
