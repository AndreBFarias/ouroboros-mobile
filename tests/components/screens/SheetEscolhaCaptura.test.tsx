// Testes do SheetEscolhaCaptura (M-CAPTURA-UNIFICADA). Cobre:
//   - render dos 2 cards com titulo + subtitulo.
//   - tap em "Registrar momento" dispara callback correspondente.
//   - tap em "Escanear documento" dispara callback correspondente.
//   - accessibility labels canonicos (sem acento) presentes.
//
// Mocks: nenhum store/router necessario -- componente puro recebe
// callbacks via props. Mock global de @gorhom/bottom-sheet (View)
// vem de jest.setup.cjs.
import { fireEvent, render } from '@testing-library/react-native';
import { SheetEscolhaCaptura } from '@/components/screens/SheetEscolhaCaptura';

describe('SheetEscolhaCaptura', () => {
  function setup() {
    const onRegistrarMomento = jest.fn();
    const onEscanearDocumento = jest.fn();
    const utils = render(
      <SheetEscolhaCaptura
        onRegistrarMomento={onRegistrarMomento}
        onEscanearDocumento={onEscanearDocumento}
      />
    );
    return { ...utils, onRegistrarMomento, onEscanearDocumento };
  }

  it('renderiza os dois cards com titulos PT-BR sentence case', () => {
    const { getByText } = setup();
    expect(getByText('Registrar momento')).toBeTruthy();
    expect(getByText('Escanear documento')).toBeTruthy();
  });

  it('renderiza subtitulos descrevendo cada ramo', () => {
    const { getByText } = setup();
    expect(getByText('Foto, música, vídeo ou frase.')).toBeTruthy();
    expect(getByText('Nota fiscal, comprovante.')).toBeTruthy();
  });

  it('expoe accessibility labels sem acento', () => {
    const { getByLabelText } = setup();
    expect(getByLabelText('escolha o que registrar')).toBeTruthy();
    expect(getByLabelText('registrar momento')).toBeTruthy();
    expect(getByLabelText('escanear documento')).toBeTruthy();
  });

  it('tap em "Registrar momento" dispara onRegistrarMomento', () => {
    const { getByLabelText, onRegistrarMomento, onEscanearDocumento } = setup();
    fireEvent.press(getByLabelText('registrar momento'));
    expect(onRegistrarMomento).toHaveBeenCalledTimes(1);
    expect(onEscanearDocumento).not.toHaveBeenCalled();
  });

  it('tap em "Escanear documento" dispara onEscanearDocumento', () => {
    const { getByLabelText, onRegistrarMomento, onEscanearDocumento } = setup();
    fireEvent.press(getByLabelText('escanear documento'));
    expect(onEscanearDocumento).toHaveBeenCalledTimes(1);
    expect(onRegistrarMomento).not.toHaveBeenCalled();
  });
});
