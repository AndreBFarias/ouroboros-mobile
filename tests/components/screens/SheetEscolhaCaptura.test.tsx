// Testes do SheetEscolhaCaptura (M-CAPTURA-UNIFICADA, atualizado em
// R-FAB-2). Cobre:
//   - render dos 2 cards com titulo + subtitulo canonicos pos R-FAB-2
//     ("Reflexao com foto" no lugar de "Registrar momento").
//   - tap em "Reflexao com foto" dispara callback correspondente.
//   - tap em "Escanear documento" dispara callback correspondente.
//   - accessibility labels canonicos (sem acento) presentes.
//   - smoke check: nenhuma string antiga "Registrar momento" no DOM.
//
// Mocks: nenhum store/router necessario -- componente puro recebe
// callbacks via props. Mock global de @gorhom/bottom-sheet (View)
// vem de jest.setup.cjs.
import { fireEvent, render } from '@testing-library/react-native';
import { SheetEscolhaCaptura } from '@/components/screens/SheetEscolhaCaptura';

describe('SheetEscolhaCaptura', () => {
  function setup() {
    const onReflexaoComFoto = jest.fn();
    const onEscanearDocumento = jest.fn();
    const utils = render(
      <SheetEscolhaCaptura
        onReflexaoComFoto={onReflexaoComFoto}
        onEscanearDocumento={onEscanearDocumento}
      />
    );
    return { ...utils, onReflexaoComFoto, onEscanearDocumento };
  }

  it('renderiza os dois cards com titulos PT-BR sentence case (R-FAB-2)', () => {
    const { getByText } = setup();
    expect(getByText('Reflexão com foto')).toBeTruthy();
    expect(getByText('Escanear documento')).toBeTruthy();
  });

  it('renderiza subtitulos descrevendo cada ramo', () => {
    const { getByText } = setup();
    expect(getByText('Foto + diário emocional.')).toBeTruthy();
    expect(getByText('Nota fiscal, comprovante.')).toBeTruthy();
  });

  it('expoe accessibility labels sem acento', () => {
    const { getByLabelText } = setup();
    expect(getByLabelText('escolha o que registrar')).toBeTruthy();
    expect(getByLabelText('reflexao com foto')).toBeTruthy();
    expect(getByLabelText('escanear documento')).toBeTruthy();
  });

  it('tap em "Reflexao com foto" dispara onReflexaoComFoto', () => {
    const { getByLabelText, onReflexaoComFoto, onEscanearDocumento } = setup();
    fireEvent.press(getByLabelText('reflexao com foto'));
    expect(onReflexaoComFoto).toHaveBeenCalledTimes(1);
    expect(onEscanearDocumento).not.toHaveBeenCalled();
  });

  it('tap em "Escanear documento" dispara onEscanearDocumento', () => {
    const { getByLabelText, onReflexaoComFoto, onEscanearDocumento } = setup();
    fireEvent.press(getByLabelText('escanear documento'));
    expect(onEscanearDocumento).toHaveBeenCalledTimes(1);
    expect(onReflexaoComFoto).not.toHaveBeenCalled();
  });

  it('nao expoe mais a string antiga "Registrar momento" (R-FAB-2)', () => {
    const { queryByText, queryByLabelText } = setup();
    expect(queryByText('Registrar momento')).toBeNull();
    expect(queryByLabelText('registrar momento')).toBeNull();
  });
});
