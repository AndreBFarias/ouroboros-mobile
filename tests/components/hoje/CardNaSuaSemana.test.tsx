// Testes do CardNaSuaSemana (R-HOME-4c). Cobre:
//   - Funcao pura montarDestaqueSemana (spec §7): pluralizacao PT-BR e
//     fallback ao volume de registros.
//   - Render condicional (auto-ocultacao): sem vaultRoot, loading e
//     registros===0 -> null; registros>=1 -> "Na sua semana" visivel.
//   - Tap: com onPress injetado chama o caller; sem onPress navega para
//     /recap?periodo=semana.
//
// Mocka useRecap (dado controlado) preservando resolverPeriodo real via
// requireActual; usa o store real de vault para vaultRoot; mocka
// expo-router para aferir a navegacao.
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import type {
  NumerosRecap,
  ConquistaItem,
  CriseItem,
  RecapData,
} from '@/lib/hooks/useRecap';

const mockUseRecap = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/hooks/useRecap', () => {
  const actual = jest.requireActual('@/lib/hooks/useRecap');
  return {
    __esModule: true,
    ...actual,
    useRecap: (range: unknown) => mockUseRecap(range),
  };
});

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
}));

import {
  CardNaSuaSemana,
  montarDestaqueSemana,
} from '@/components/hoje/CardNaSuaSemana';
import { useVault } from '@/lib/stores/vault';

function numeros(registros: number): NumerosRecap {
  return {
    registros,
    treinos: 0,
    fotos: 0,
    audios: 0,
    videos: 0,
    eventos_positivos: 0,
    eventos_negativos: 0,
    tarefas_concluidas: 0,
  };
}

function conquista(i: number): ConquistaItem {
  return { id: `c${i}`, origem: 'marco', data: '2026-07-01', frase: 'x' };
}

function crise(i: number): CriseItem {
  return {
    id: `x${i}`,
    origem: 'evento_negativo',
    data: '2026-07-01',
    intensidade: 3,
    frase: 'y',
  };
}

function lista<T>(n: number, fn: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => fn(i));
}

function recapData(opts: {
  registros: number;
  conquistas?: number;
  crises?: number;
}): RecapData {
  return {
    conquistas: lista(opts.conquistas ?? 0, conquista),
    crises: lista(opts.crises ?? 0, crise),
    reflexoes: [],
    evolucoes: [],
    tarefasConcluidas: [],
    numeros: numeros(opts.registros),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useVault.setState({ vaultRoot: 'content://test/vault' });
});

describe('montarDestaqueSemana', () => {
  it('conquistas=4, crises=1 -> "4 conquistas, 1 crise"', () => {
    expect(
      montarDestaqueSemana(numeros(10), lista(4, conquista), [crise(0)])
    ).toBe('4 conquistas, 1 crise');
  });

  it('conquistas=1, crises=0 -> "1 conquista" (singular)', () => {
    expect(montarDestaqueSemana(numeros(3), [conquista(0)], [])).toBe(
      '1 conquista'
    );
  });

  it('conquistas=0, crises=0, registros=3 -> "3 registros" (fallback)', () => {
    expect(montarDestaqueSemana(numeros(3), [], [])).toBe('3 registros');
  });

  it('conquistas=0, crises=0, registros=1 -> "1 registro" (singular)', () => {
    expect(montarDestaqueSemana(numeros(1), [], [])).toBe('1 registro');
  });

  it('so crises -> "2 crises" (sem parte de conquista)', () => {
    expect(montarDestaqueSemana(numeros(2), [], lista(2, crise))).toBe(
      '2 crises'
    );
  });
});

describe('CardNaSuaSemana (auto-ocultacao)', () => {
  it('registros===0 -> nao renderiza (null), sem caixa "nada esta semana"', () => {
    mockUseRecap.mockReturnValue({
      data: recapData({ registros: 0 }),
      loading: false,
    });
    const { queryByText } = render(<CardNaSuaSemana />);
    expect(queryByText('Na sua semana')).toBeNull();
    expect(queryByText(/nada/i)).toBeNull();
  });

  it('loading -> nao renderiza (null)', () => {
    mockUseRecap.mockReturnValue({ data: null, loading: true });
    const { queryByText } = render(<CardNaSuaSemana />);
    expect(queryByText('Na sua semana')).toBeNull();
  });

  it('sem vaultRoot -> nao renderiza (null)', () => {
    useVault.setState({ vaultRoot: null });
    mockUseRecap.mockReturnValue({
      data: recapData({ registros: 5 }),
      loading: false,
    });
    const { queryByText } = render(<CardNaSuaSemana />);
    expect(queryByText('Na sua semana')).toBeNull();
  });
});

describe('CardNaSuaSemana (render + tap)', () => {
  it('registros>=1 -> "Na sua semana" + destaque; tap chama onPress', () => {
    mockUseRecap.mockReturnValue({
      data: recapData({ registros: 7, conquistas: 4, crises: 1 }),
      loading: false,
    });
    const onPress = jest.fn();
    const { getByText, getByRole } = render(
      <CardNaSuaSemana onPress={onPress} />
    );
    expect(getByText('Na sua semana')).toBeTruthy();
    expect(getByText('4 conquistas, 1 crise')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
    // Com onPress injetado, nao navega internamente.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sem onPress -> tap navega para /recap?periodo=semana', () => {
    mockUseRecap.mockReturnValue({
      data: recapData({ registros: 2 }),
      loading: false,
    });
    const { getByText, getByRole } = render(<CardNaSuaSemana />);
    expect(getByText('2 registros')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/recap?periodo=semana');
  });
});
