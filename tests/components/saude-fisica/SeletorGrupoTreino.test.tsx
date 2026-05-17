// R-SF-1 (Onda R, 2026-05-16): smoke do SeletorGrupoTreino. Cobre:
//   - cabecalho "Iniciar treino" + subtitulo
//   - empty state com CTA "Criar grupo" navegando para /grupos/novo
//   - listagem de grupos com contagem de rotinas
//   - onSelect disparado com o slug correto ao tap
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
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

// gorhom: BottomSheetView vira View nativo no mock canonico de testes.
jest.mock('@gorhom/bottom-sheet', () => {
  const RN = jest.requireActual('react-native');
  const r = jest.requireActual('react');
  return {
    __esModule: true,
    BottomSheetView: function BottomSheetView(props: {
      children: unknown;
      style?: unknown;
    }) {
      return r.createElement(RN.View, { style: props.style }, props.children);
    },
  };
});

import { SeletorGrupoTreino } from '@/components/saude-fisica/SeletorGrupoTreino';
import { useVault } from '@/lib/stores/vault';

describe('SeletorGrupoTreino (R-SF-1)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGrupos = [];
    useVault.setState({ vaultRoot: '/tmp/test-vault' });
  });

  it('renderiza cabecalho "Iniciar treino" + subtitulo guia', async () => {
    const { getByText } = render(
      <SeletorGrupoTreino onSelect={jest.fn()} onCancelar={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('Iniciar treino')).toBeTruthy();
      expect(
        getByText('Escolha um grupo para abrir o detalhe e iniciar.')
      ).toBeTruthy();
    });
  });

  it('mostra empty state com CTA "Criar grupo" quando nao ha grupos', async () => {
    const onCancelar = jest.fn();
    const { getByText, getByLabelText } = render(
      <SeletorGrupoTreino onSelect={jest.fn()} onCancelar={onCancelar} />
    );
    await waitFor(() => {
      expect(
        getByText('Nenhum grupo cadastrado ainda. Crie um para começar.')
      ).toBeTruthy();
    });
    expect(getByLabelText('nenhum grupo cadastrado')).toBeTruthy();
    fireEvent.press(getByText('Criar grupo'));
    expect(onCancelar).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/grupos/novo');
  });

  it('lista grupos e dispara onSelect com slug ao tap', async () => {
    mockGrupos = [
      {
        tipo: 'grupo_treino',
        slug: 'treino-do-quaresma',
        nome: 'Treino do Quaresma',
        descricao: null,
        rotina_slugs: ['treino-a', 'treino-b'],
        data_criacao: '2026-05-16',
        autor: 'pessoa_a',
      },
    ];
    const onSelect = jest.fn();
    const { getByText, getByLabelText } = render(
      <SeletorGrupoTreino onSelect={onSelect} onCancelar={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('Treino do Quaresma')).toBeTruthy();
      expect(getByText('2 rotinas')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('iniciar grupo Treino do Quaresma'));
    expect(onSelect).toHaveBeenCalledWith('treino-do-quaresma');
  });
});
