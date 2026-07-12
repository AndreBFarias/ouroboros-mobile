// K3 (M-MENU-FOTO-EDITAVEL, 2026-05-07): smoke da tela
// /settings/editar-pessoa. Verifica:
//   - Render basico mostra Header e botao Salvar.
//   - Editar nome A + Salvar chama usePessoa.setNome com o novo valor
//     e dispara router.back().
//   - Em tipoCompanhia 'sozinho', o BlocoPessoa B nao aparece.
//   - Em tipoCompanhia 'duo', ambos os BlocoPessoa aparecem.
//
// Mocks: expo-router (router.back spiavel), AvatarPicker stub leve
// para nao tocar expo-image-picker, expo-haptics no-op.
// Comentarios sem acento (convencao shell/CI).

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/components/ui/AvatarPicker', () => {
  const ReactLocal = require('react');
  const RNLocal = require('react-native');
  return {
    __esModule: true,
    AvatarPicker: ({ pessoa }: { pessoa: string }) =>
      ReactLocal.createElement(RNLocal.View, {
        accessibilityLabel: `avatar picker ${pessoa}`,
      }),
  };
});

// useToast precisa de ToastProvider; em ambiente de teste isolado o
// provider nao existe. Stub dispensa o requisito sem mockar a UI.
const mockToastShow = jest.fn();
jest.mock('@/components/ui/Toast', () => {
  const actual = jest.requireActual('@/components/ui/Toast');
  return {
    ...actual,
    useToast: () => ({ show: mockToastShow }),
  };
});

import { fireEvent, render } from '@testing-library/react-native';
import EditarPessoa from '@/../app/settings/editar-pessoa';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSettings } from '@/lib/stores/settings';

describe('app/settings/editar-pessoa (K3)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockToastShow.mockClear();
    usePessoa.setState({
      nomes: { pessoa_a: 'Nome_A', pessoa_b: 'Nome_B' },
      fotos: { pessoa_a: null, pessoa_b: null },
      pessoaAtiva: 'pessoa_a',
    });
    useSettings.getState().resetar();
  });

  it('render basico mostra avatar e botao Salvar', () => {
    const { getByText, getByLabelText } = render(<EditarPessoa />);
    expect(getByText('Salvar')).toBeTruthy();
    expect(getByLabelText('avatar picker pessoa_a')).toBeTruthy();
  });

  it('Salvar com nome A novo persiste em usePessoa.setNome e navega back', () => {
    const setNomeSpy = jest.spyOn(usePessoa.getState(), 'setNome');
    const { getByLabelText, getByText } = render(<EditarPessoa />);

    const inputA = getByLabelText('nome pessoa_a');
    fireEvent.changeText(inputA, 'NomeNovo');
    fireEvent.press(getByText('Salvar'));

    expect(setNomeSpy).toHaveBeenCalledWith('pessoa_a', 'NomeNovo');
    expect(mockBack).toHaveBeenCalled();
  });

  it('em tipoCompanhia solo, BlocoPessoa B nao aparece', () => {
    useSettings.setState((state) => ({
      pessoa: { ...state.pessoa, tipoCompanhia: 'sozinho' },
    }));
    const { queryByLabelText } = render(<EditarPessoa />);
    expect(queryByLabelText('avatar picker pessoa_b')).toBeNull();
  });

  it('em tipoCompanhia duo, ambos os BlocoPessoa aparecem', () => {
    useSettings.setState((state) => ({
      pessoa: { ...state.pessoa, tipoCompanhia: 'duo' },
    }));
    const { getByLabelText } = render(<EditarPessoa />);
    expect(getByLabelText('avatar picker pessoa_a')).toBeTruthy();
    expect(getByLabelText('avatar picker pessoa_b')).toBeTruthy();
  });

  it('nome A vazio dispara toast e nao chama setNome', () => {
    const setNomeSpy = jest.spyOn(usePessoa.getState(), 'setNome');
    setNomeSpy.mockClear();
    const { getByLabelText, getByText } = render(<EditarPessoa />);
    const inputA = getByLabelText('nome pessoa_a');
    fireEvent.changeText(inputA, '   ');
    fireEvent.press(getByText('Salvar'));
    expect(setNomeSpy).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalled();
  });
});
