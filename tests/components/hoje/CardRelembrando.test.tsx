// Testes do CardRelembrando (R-HOME-4d). Cobre:
//   - loading -> nada visivel (null).
//   - cold start (relembranca null) -> boas-vindas contemplativo (dono
//     §12): frase presente, sem exclamacao, sem "voce fez"; nao oculta.
//   - com lembranca -> frase + rotulo de tempo; tap navega para o
//     destino (reflexao/conquista -> /diario-emocional; humor -> /humor).
//   - efeméride -> rotulo acrescenta " · nesta data".
//
// Mocka useRelembrando (estado controlado) e expo-router (afere push).
// destinoRelembranca e a store de onboarding entram de verdade.
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import type { Relembranca } from '@/lib/relembrando/selecionar';

const mockUseRelembrando = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/hooks/useRelembrando', () => ({
  __esModule: true,
  useRelembrando: () => mockUseRelembrando(),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import { CardRelembrando } from '@/components/hoje/CardRelembrando';
import { useOnboarding } from '@/lib/stores/onboarding';

function relembranca(over: Partial<Relembranca> = {}): Relembranca {
  return {
    origem: 'reflexao',
    id: 'diario_reflexao:2025-01-05:pessoa_a',
    frase: 'Tarde tranquila e leve',
    data: '2025-01-05',
    rotuloTempo: 'há 1 ano',
    efemeride: false,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useOnboarding.setState({ tipoCompanhia: 'casal' });
});

describe('CardRelembrando — loading', () => {
  it('loading -> nada visivel (null)', () => {
    mockUseRelembrando.mockReturnValue({ relembranca: null, loading: true });
    const { toJSON } = render(<CardRelembrando />);
    expect(toJSON()).toBeNull();
  });
});

describe('CardRelembrando — cold start (boas-vindas)', () => {
  it('pool vazio -> boas-vindas contemplativo, sem exclamacao nem CTA', () => {
    mockUseRelembrando.mockReturnValue({ relembranca: null, loading: false });
    const { getByText, queryByText } = render(<CardRelembrando />);
    // Titulo garantido continua presente (nao oculta).
    expect(getByText('Relembrando')).toBeTruthy();
    const boas = getByText(
      'Um lugar para guardar o que vocês viverem, a partir de hoje.'
    );
    expect(boas).toBeTruthy();
    // Tom ADR-010: nenhuma exclamacao, nenhuma linha meta.
    expect(queryByText(/!/)).toBeNull();
    expect(queryByText(/aparece.*com o tempo/i)).toBeNull();
  });

  it('modo sozinho usa "voce" na boas-vindas', () => {
    useOnboarding.setState({ tipoCompanhia: 'sozinho' });
    mockUseRelembrando.mockReturnValue({ relembranca: null, loading: false });
    const { getByText } = render(<CardRelembrando />);
    expect(
      getByText('Um lugar para guardar o que você viver, a partir de hoje.')
    ).toBeTruthy();
  });
});

describe('CardRelembrando — com lembranca', () => {
  it('reflexao -> frase + rotulo; tap navega para /diario-emocional', () => {
    mockUseRelembrando.mockReturnValue({
      relembranca: relembranca(),
      loading: false,
    });
    const { getByText, getByRole } = render(<CardRelembrando />);
    expect(getByText('Tarde tranquila e leve')).toBeTruthy();
    expect(getByText('— há 1 ano')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/diario-emocional',
      params: { slug: 'diario_reflexao:2025-01-05:pessoa_a' },
    });
  });

  it('humor -> tap navega para /humor (sem params)', () => {
    mockUseRelembrando.mockReturnValue({
      relembranca: relembranca({
        origem: 'humor',
        id: 'humor:2025-06-01',
        frase: 'Um dia devagar',
        rotuloTempo: 'há 1 mês',
      }),
      loading: false,
    });
    const { getByRole } = render(<CardRelembrando />);
    fireEvent.press(getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/humor',
      params: undefined,
    });
  });

  it('efeméride -> rotulo acrescenta "· nesta data"', () => {
    mockUseRelembrando.mockReturnValue({
      relembranca: relembranca({ efemeride: true }),
      loading: false,
    });
    const { getByText } = render(<CardRelembrando />);
    expect(getByText('— há 1 ano · nesta data')).toBeTruthy();
  });
});
