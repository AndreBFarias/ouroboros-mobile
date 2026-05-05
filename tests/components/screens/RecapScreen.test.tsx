// Smoke do RecapScreen (M36). Foco no estado vazio e no troca de
// periodo via ChipGroup. Os agregados sao testados em
// useRecap.test.ts; aqui validamos render condicional e navegacao.
//
// Mocks:
//  - useVault: vaultRoot fixo.
//  - vault helpers (humor/diario/eventos/marcos/contadores/treinos/
//    tarefas) retornam listas vazias para forcar empty state previsivel.
//  - expo-router: useRouter mockado.
import { render, waitFor } from '@testing-library/react-native';

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

  it('renderiza chips de periodo Semana / Mes / Ano / Personalizado', async () => {
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
});
