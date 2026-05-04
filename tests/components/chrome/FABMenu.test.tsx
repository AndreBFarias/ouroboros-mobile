// Smoke do FABMenu (M27). Verifica:
//   - Renderiza botao com a11y label correto em rota nao-modal.
//   - Esconde quando pathname casa rotaEsconderFAB.
//   - Tap chama useNavegacao.abrir().
//
// Mock minimo de expo-router (usePathname controlavel) e do store
// useNavegacao via getState() pra assertar mutacao.
import { fireEvent, render } from '@testing-library/react-native';

let mockPathname = '/';
jest.mock('expo-router', () => ({
  __esModule: true,
  usePathname: () => mockPathname,
}));

import { FABMenu } from '@/components/chrome/FABMenu';
import { useNavegacao } from '@/lib/stores/navegacao';

describe('FABMenu', () => {
  beforeEach(() => {
    useNavegacao.setState({ menuAberto: false, sheetCapturaAberto: false });
    mockPathname = '/';
  });

  it('renderiza botao em rota nao-modal', () => {
    const { getByLabelText } = render(<FABMenu />);
    expect(getByLabelText('abrir menu lateral')).toBeTruthy();
  });

  it('esconde em rota modal canonica', () => {
    mockPathname = '/scanner';
    const { queryByLabelText } = render(<FABMenu />);
    expect(queryByLabelText('abrir menu lateral')).toBeNull();
  });

  it('tap dispara abrir() do useNavegacao', () => {
    const { getByLabelText } = render(<FABMenu />);
    expect(useNavegacao.getState().menuAberto).toBe(false);
    fireEvent.press(getByLabelText('abrir menu lateral'));
    expect(useNavegacao.getState().menuAberto).toBe(true);
  });

  // M34.1.1: FAB se desmonta quando MenuCapturaVerde abre o sheet de
  // captura. Ciclo abrir -> flag true -> fechar -> flag false.
  it('M34.1.1: esconde quando sheetCapturaAberto=true e volta quando false', () => {
    const { queryByLabelText, rerender } = render(<FABMenu />);
    expect(queryByLabelText('abrir menu lateral')).toBeTruthy();

    useNavegacao.setState({ sheetCapturaAberto: true });
    rerender(<FABMenu />);
    expect(queryByLabelText('abrir menu lateral')).toBeNull();

    useNavegacao.setState({ sheetCapturaAberto: false });
    rerender(<FABMenu />);
    expect(queryByLabelText('abrir menu lateral')).toBeTruthy();
  });

  it('M34.1.1: setSheetCapturaAberto alterna a flag corretamente', () => {
    expect(useNavegacao.getState().sheetCapturaAberto).toBe(false);
    useNavegacao.getState().setSheetCapturaAberto(true);
    expect(useNavegacao.getState().sheetCapturaAberto).toBe(true);
    useNavegacao.getState().setSheetCapturaAberto(false);
    expect(useNavegacao.getState().sheetCapturaAberto).toBe(false);
  });
});
