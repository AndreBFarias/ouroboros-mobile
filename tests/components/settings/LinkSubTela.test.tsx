import { fireEvent, render } from '@testing-library/react-native';
import { LinkSubTela } from '@/components/settings/LinkSubTela';

describe('LinkSubTela', () => {
  it('chama onPress ao pressionar', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <LinkSubTela
        titulo="Editar nomes e fotos"
        onPress={onPress}
        accessibilityLabel="editar nomes e fotos"
      />
    );
    fireEvent.press(getByLabelText('editar nomes e fotos'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renderiza subtitulo opcional', () => {
    const { getByText } = render(
      <LinkSubTela
        titulo="Adicionar segunda pessoa"
        subtitulo="Configure pessoa B."
        onPress={() => undefined}
      />
    );
    expect(getByText('Adicionar segunda pessoa')).toBeTruthy();
    expect(getByText('Configure pessoa B.')).toBeTruthy();
  });

  it('a11y default deriva do titulo lowercase', () => {
    const { getByLabelText } = render(
      <LinkSubTela
        titulo="Editar nomes e fotos"
        onPress={() => undefined}
      />
    );
    expect(getByLabelText('editar nomes e fotos')).toBeTruthy();
  });
});
