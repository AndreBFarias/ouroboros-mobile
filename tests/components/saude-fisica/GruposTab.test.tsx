// R-SF-1 (Onda R, 2026-05-16): smoke do GruposTab. Cobre:
//   - empty state com frase canonica
//   - listagem de grupos (router.push em tap)
//   - registro da acao contextual "Novo grupo" via onRegistrarAcaoExtra
//
// Mocks seguem padrao das outras tabs (MemoriasExerciciosTab.test.tsx).
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: () => undefined,
}));

let mockGrupos: Array<{
  tipo: 'grupo_treino';
  slug: string;
  nome: string;
  descricao: string | null;
  rotina_slugs: string[];
  data_criacao: string;
  autor: 'pessoa_a' | 'pessoa_b';
}> = [];
jest.mock('@/lib/vault/grupo_treino', () => ({
  __esModule: true,
  listarGrupos: () => Promise.resolve(mockGrupos),
}));

import { GruposTab } from '@/components/saude-fisica/GruposTab';
import { useVault } from '@/lib/stores/vault';

describe('GruposTab (R-SF-1)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGrupos = [];
    useVault.setState({ vaultRoot: '/tmp/test-vault' });
  });

  it('mostra empty state com frase canonica quando lista vazia', async () => {
    const { getByText } = render(<GruposTab />);
    await waitFor(() => {
      expect(
        getByText(
          'Crie um grupo para reunir várias rotinas (Treino A, B, C).'
        )
      ).toBeTruthy();
    });
  });

  it('lista grupos com nome + contagem de rotinas e navega ao tap', async () => {
    mockGrupos = [
      {
        tipo: 'grupo_treino',
        slug: 'treino-do-quaresma',
        nome: 'Treino do Quaresma',
        descricao: null,
        rotina_slugs: ['treino-a', 'treino-b', 'treino-c'],
        data_criacao: '2026-05-16',
        autor: 'pessoa_a',
      },
    ];
    const { getByText, getByLabelText } = render(<GruposTab />);
    await waitFor(() => {
      expect(getByText('Treino do Quaresma')).toBeTruthy();
      expect(getByText('3 rotinas')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('abrir grupo Treino do Quaresma'));
    expect(mockPush).toHaveBeenCalledWith('/grupos/treino-do-quaresma');
  });

  it('singulariza contagem quando grupo tem 1 rotina apenas', async () => {
    mockGrupos = [
      {
        tipo: 'grupo_treino',
        slug: 'so-um',
        nome: 'So um',
        descricao: null,
        rotina_slugs: ['unico'],
        data_criacao: '2026-05-16',
        autor: 'pessoa_a',
      },
    ];
    const { getByText } = render(<GruposTab />);
    await waitFor(() => {
      expect(getByText('1 rotina')).toBeTruthy();
    });
  });

  it('registra acao "Novo grupo" no MenuCapturaVerde via prop', async () => {
    const onRegistrar = jest.fn();
    render(<GruposTab onRegistrarAcaoExtra={onRegistrar} />);
    await waitFor(() => {
      expect(onRegistrar).toHaveBeenCalled();
    });
    const acao = onRegistrar.mock.calls[0]?.[0];
    expect(acao).toBeTruthy();
    expect(acao.label).toBe('Novo grupo');
    expect(acao.accessibilityLabel).toBe('novo grupo');
    expect(typeof acao.onPress).toBe('function');
    // onPress dispara navegacao para /grupos/novo.
    acao.onPress();
    expect(mockPush).toHaveBeenCalledWith('/grupos/novo');
  });
});
