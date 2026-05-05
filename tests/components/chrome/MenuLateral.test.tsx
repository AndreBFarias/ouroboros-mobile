// Smoke do MenuLateral (M27). Verifica:
//   - Quando fechado, nao renderiza nada.
//   - Quando aberto, renderiza secoes Ver e Registrar.
//   - Secao Opcionais aparece somente quando ao menos um toggle on.
//   - Tap em item navega via router.push e fecha o menu.
//   - Backdrop fecha o menu.
//
// Mocks: expo-router (router.push spiavel) + useSettings e useNavegacao
// via getState().setState para simular variantes.
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

import { MenuLateral } from '@/components/chrome/MenuLateral';
import { useNavegacao } from '@/lib/stores/navegacao';
import { useSettings } from '@/lib/stores/settings';

describe('MenuLateral', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useNavegacao.setState({ menuAberto: false });
    useSettings.getState().resetar();
  });

  it('quando fechado, nao renderiza secoes', () => {
    const { queryByLabelText } = render(<MenuLateral />);
    expect(queryByLabelText('item hoje')).toBeNull();
  });

  it('quando aberto, renderiza secoes Ver e Registrar com itens', () => {
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText, queryByLabelText } = render(<MenuLateral />);

    // Ver
    expect(getByLabelText('item hoje')).toBeTruthy();
    expect(getByLabelText('item memorias')).toBeTruthy();
    expect(getByLabelText('item humor')).toBeTruthy();
    // M35: item "financas" so aparece quando o toggle
    // mostrarFinancasEmDesenvolvimento esta ON. Default OFF aqui
    // (resetar() em beforeEach), entao o item nao deve aparecer.
    expect(queryByLabelText('item financas')).toBeNull();
    // Registrar
    expect(getByLabelText('registrar humor')).toBeTruthy();
    expect(getByLabelText('registrar voz')).toBeTruthy();
    expect(getByLabelText('registrar camera')).toBeTruthy();
    expect(getByLabelText('registrar exercicios')).toBeTruthy();
    expect(getByLabelText('registrar conquista')).toBeTruthy();
    expect(getByLabelText('registrar crise')).toBeTruthy();
  });

  it('M35: item "financas" aparece quando mostrarFinancasEmDesenvolvimento on', () => {
    useSettings
      .getState()
      .setFeatureToggle('mostrarFinancasEmDesenvolvimento', true);
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText } = render(<MenuLateral />);
    expect(getByLabelText('item financas')).toBeTruthy();
  });

  it('Opcionais nao aparece quando todos os toggles estao off', () => {
    // Sprint M29: defaults v2 trazem todos os featureToggles ON. Forca
    // explicitamente off para exercitar o caminho de "menu sem opcionais".
    useSettings.getState().setFeatureToggle('todoLeve', false);
    useSettings.getState().setFeatureToggle('alarmePessoal', false);
    useSettings.getState().setFeatureToggle('contadorDiasSem', false);
    useSettings.getState().setFeatureToggle('cicloMenstrual', false);
    useSettings.getState().setFeatureToggle('calendarioConquistas', false);
    useNavegacao.setState({ menuAberto: true });
    const { queryByLabelText } = render(<MenuLateral />);
    expect(queryByLabelText('item tarefas')).toBeNull();
    expect(queryByLabelText('item alarmes')).toBeNull();
    expect(queryByLabelText('item contadores')).toBeNull();
    expect(queryByLabelText('item ciclo')).toBeNull();
  });

  it('Opcionais filtra por featureToggles individualmente', () => {
    // Sprint M29: defaults v2 trazem todos os featureToggles ON. Para
    // testar o filtro, ligamos so dois e desligamos os outros explicitos.
    useSettings.getState().setFeatureToggle('todoLeve', true);
    useSettings.getState().setFeatureToggle('cicloMenstrual', true);
    useSettings.getState().setFeatureToggle('alarmePessoal', false);
    useSettings.getState().setFeatureToggle('contadorDiasSem', false);
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText, queryByLabelText } = render(<MenuLateral />);

    expect(getByLabelText('item tarefas')).toBeTruthy();
    expect(getByLabelText('item ciclo')).toBeTruthy();
    expect(queryByLabelText('item alarmes')).toBeNull();
    expect(queryByLabelText('item contadores')).toBeNull();
  });

  it('tap em item Ver navega via router.push e fecha o menu', () => {
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText } = render(<MenuLateral />);
    fireEvent.press(getByLabelText('item memorias'));
    expect(mockPush).toHaveBeenCalledWith('/memoria');
    expect(useNavegacao.getState().menuAberto).toBe(false);
  });

  it('tap em backdrop fecha o menu', () => {
    useNavegacao.setState({ menuAberto: true });
    const { getByLabelText } = render(<MenuLateral />);
    fireEvent.press(getByLabelText('fechar menu lateral'));
    expect(useNavegacao.getState().menuAberto).toBe(false);
  });
});
