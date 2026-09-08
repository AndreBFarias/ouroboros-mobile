// P3 (2026-09-08): smoke da tela /settings/adicionar-segunda-pessoa.
//
// Dois defeitos que este arquivo trava:
//
//   1. A tela escrevia `setPessoa('tipoCompanhia', 'duo')` direto em
//      useSettings e nao tocava useOnboarding. O BootHook
//      reconciliarTipoCompanhiaHook copia onboarding -> settings a
//      cada boot, entao a segunda pessoa adicionada aqui desaparecia
//      na abertura seguinte. Agora a escrita entra pelo store
//      canonico e os dois ficam coerentes.
//   2. 'duo' presumia casal. A pergunta "voces sao casal ou amigos"
//      passa a ser feita, como no onboarding.
//
// Mocks: expo-router, AvatarPicker (nao tocar expo-image-picker),
// useToast (a tela nao esta dentro de um ToastProvider aqui).
//
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

const mockToastShow = jest.fn();
jest.mock('@/components/ui/Toast', () => {
  const actual = jest.requireActual('@/components/ui/Toast');
  return {
    ...actual,
    useToast: () => ({ show: mockToastShow }),
  };
});

import { fireEvent, render } from '@testing-library/react-native';
import AdicionarSegundaPessoa from '../../../app/settings/adicionar-segunda-pessoa';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.getState().resetar();
  useOnboarding.getState().resetar();
  usePessoa.getState().setNome('pessoa_b', 'Nome_B');
});

describe('adicionar segunda pessoa', () => {
  it('salvar sem escolher casal ou amigos avisa e nao muda nada', () => {
    const { getByText, getByLabelText } = render(<AdicionarSegundaPessoa />);
    fireEvent.changeText(getByLabelText('nome pessoa b'), 'Zorvax');
    fireEvent.press(getByText('Salvar'));

    expect(mockToastShow).toHaveBeenCalledWith(
      'Escolha se vocês são casal ou amigos.',
      'warn'
    );
    expect(useOnboarding.getState().tipoCompanhia).toBe('sozinho');
    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('sozinho');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('salvar sem nome avisa, mesmo com a companhia escolhida', () => {
    const { getByText, getByLabelText } = render(<AdicionarSegundaPessoa />);
    fireEvent.press(getByLabelText('chip Casal'));
    fireEvent.press(getByText('Salvar'));

    expect(mockToastShow).toHaveBeenCalledWith(
      'Digite o nome da segunda pessoa.',
      'warn'
    );
    expect(useOnboarding.getState().tipoCompanhia).toBe('sozinho');
  });

  it.each(['Casal', 'Amigos'] as const)(
    'escolher %s grava nos DOIS stores, nao so em settings',
    (rotulo) => {
      const esperado = rotulo === 'Casal' ? 'casal' : 'amigos';
      const { getByText, getByLabelText } = render(<AdicionarSegundaPessoa />);
      fireEvent.press(getByLabelText(`chip ${rotulo}`));
      fireEvent.changeText(getByLabelText('nome pessoa b'), 'Zorvax');
      fireEvent.press(getByText('Salvar'));

      expect(usePessoa.getState().nomes.pessoa_b).toBe('Zorvax');
      // O store canonico e' useOnboarding: e' dele que o BootHook
      // reconstroi useSettings a cada boot. Gravar so' em settings
      // fazia a segunda pessoa sumir na abertura seguinte.
      expect(useOnboarding.getState().tipoCompanhia).toBe(esperado);
      expect(useSettings.getState().pessoa.tipoCompanhia).toBe(esperado);
      expect(mockBack).toHaveBeenCalled();
    }
  );
});
