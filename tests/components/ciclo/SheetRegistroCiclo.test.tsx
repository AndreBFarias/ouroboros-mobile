// R-NAV-1 (Onda R, 2026-05-16): smoke do SheetRegistroCiclo. Cobre:
//   - Render dos 3 itens canonicos (registrar hoje, sintoma, anotacao).
//   - Tap em cada item navega para /ciclo/registrar.
//   - Helper montarAcaoExtraCiclo devolve AcaoExtraCaptura valido com
//     label "Registrar ciclo" e onPress que aciona o callback recebido.
//
// Mocks do gorhom/bottom-sheet seguem padrao das outras telas que
// usam BottomSheet (saude-fisica.test.tsx).
//
// Comentarios sem acento (convencao shell/CI).
import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

// Mock gorhom/bottom-sheet identico ao tests/app/saude-fisica.test.tsx.
// O sheet sempre renderiza o conteudo (sem state interno de open/close)
// para que os itens fiquem visiveis na arvore e os asserts funcionem.
jest.mock('@gorhom/bottom-sheet', () => {
  const RN = jest.requireActual('react-native');
  const r = jest.requireActual('react');
  const Empty = r.forwardRef(function Empty(p: { children?: unknown }, _ref: unknown) {
    return r.createElement(RN.View, null, p.children);
  });
  return {
    __esModule: true,
    default: Empty,
    BottomSheetBackdrop: () => null,
    BottomSheetView: function BottomSheetView(props: {
      children: unknown;
      style?: unknown;
    }) {
      return r.createElement(RN.View, { style: props.style }, props.children);
    },
    BottomSheetTextInput: function BottomSheetTextInput(props: unknown) {
      return r.createElement(RN.TextInput, props as object);
    },
  };
});

import {
  SheetRegistroCiclo,
  montarAcaoExtraCiclo,
  type SheetRegistroCicloRef,
} from '@/components/ciclo/SheetRegistroCiclo';

describe('SheetRegistroCiclo (R-NAV-1)', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renderiza titulo "Registrar ciclo" e os 3 itens canonicos', () => {
    const { getByText, getByLabelText } = render(<SheetRegistroCiclo />);
    expect(getByText('Registrar ciclo')).toBeTruthy();
    expect(getByText('Registrar hoje')).toBeTruthy();
    expect(getByText('Adicionar sintoma')).toBeTruthy();
    expect(getByText('Anotação livre')).toBeTruthy();
    expect(getByLabelText('registrar hoje')).toBeTruthy();
    expect(getByLabelText('adicionar sintoma')).toBeTruthy();
    expect(getByLabelText('anotacao livre')).toBeTruthy();
  });

  it('tap em "Registrar hoje" navega para /ciclo/registrar', () => {
    const { getByLabelText } = render(<SheetRegistroCiclo />);
    fireEvent.press(getByLabelText('registrar hoje'));
    expect(mockPush).toHaveBeenCalledWith('/ciclo/registrar');
  });

  it('tap em "Adicionar sintoma" navega para /ciclo/registrar', () => {
    const { getByLabelText } = render(<SheetRegistroCiclo />);
    fireEvent.press(getByLabelText('adicionar sintoma'));
    expect(mockPush).toHaveBeenCalledWith('/ciclo/registrar');
  });

  it('tap em "Anotação livre" navega para /ciclo/registrar', () => {
    const { getByLabelText } = render(<SheetRegistroCiclo />);
    fireEvent.press(getByLabelText('anotacao livre'));
    expect(mockPush).toHaveBeenCalledWith('/ciclo/registrar');
  });

  it('expoe ref com metodos abrir/fechar', () => {
    const ref = createRef<SheetRegistroCicloRef>();
    render(<SheetRegistroCiclo ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current?.abrir).toBe('function');
    expect(typeof ref.current?.fechar).toBe('function');
  });

  it('montarAcaoExtraCiclo devolve AcaoExtraCaptura com label "Registrar ciclo"', () => {
    const abrir = jest.fn();
    const acao = montarAcaoExtraCiclo(abrir);
    expect(acao.label).toBe('Registrar ciclo');
    expect(acao.accessibilityLabel).toBe('registrar ciclo');
    expect(typeof acao.onPress).toBe('function');
    acao.onPress();
    expect(abrir).toHaveBeenCalledTimes(1);
  });
});
