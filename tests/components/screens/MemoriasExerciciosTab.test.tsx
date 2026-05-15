// Smoke do MemoriasExerciciosTab (sprint L1, 2026-05-07). Cobre:
//   - render do filtro "Grupo muscular" e do campo de busca
//   - empty state quando lista vazia
//   - registro da acao contextual "Adicionar exercicio" via prop
//     onRegistrarAcaoExtra (M34.3)
//
// Mocks: expo-router (router.push spiavel), useVault (vaultRoot fixo),
// listarExercicios (devolve lista controlavel via let module-scope).
// Comentarios sem acento (convencao shell/CI).
import { render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: () => undefined,
}));

let mockListaExercicios: Array<{ slug: string; nome: string; gif: string }> =
  [];
jest.mock('@/lib/vault/exercicios', () => ({
  __esModule: true,
  listarExercicios: () => Promise.resolve(mockListaExercicios),
  lerExercicio: () => Promise.resolve(null),
  escreverExercicio: () => Promise.resolve({ uri: '' }),
  excluirExercicio: () => Promise.resolve({ lixeiraPath: '' }),
}));

import { MemoriasExerciciosTab } from '@/components/screens/MemoriasExerciciosTab';
import { useVault } from '@/lib/stores/vault';

describe('MemoriasExerciciosTab (sprint L1)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockListaExercicios = [];
    // Vault root fixo para que o useEffect do componente passe pelo
    // caminho de listarExercicios em vez do early-return.
    useVault.setState({ vaultRoot: '/tmp/test-vault' });
  });

  it('renderiza filtro grupo muscular e campo de busca', async () => {
    const { getByText, getByLabelText } = render(<MemoriasExerciciosTab />);
    await waitFor(() => {
      expect(getByText('Grupo muscular')).toBeTruthy();
      expect(getByLabelText('campo de busca de exercicio')).toBeTruthy();
    });
  });

  it('mostra empty state quando nenhum exercicio cadastrado', async () => {
    const { getByText } = render(<MemoriasExerciciosTab />);
    await waitFor(() => {
      expect(
        getByText('Nenhum exercício cadastrado ainda. Use o + para criar.')
      ).toBeTruthy();
    });
  });

  it('M34.3: registra acao "Adicionar exercicio" no MenuCapturaVerde via prop', async () => {
    const onRegistrar = jest.fn();
    render(<MemoriasExerciciosTab onRegistrarAcaoExtra={onRegistrar} />);
    await waitFor(() => {
      expect(onRegistrar).toHaveBeenCalled();
    });
    // Primeira chamada e' a acao com label.
    const acao = onRegistrar.mock.calls[0]?.[0];
    expect(acao).toBeTruthy();
    expect(acao.label).toBe('Adicionar exercício');
    expect(acao.accessibilityLabel).toBe('adicionar exercicio');
    expect(typeof acao.onPress).toBe('function');
  });
});
