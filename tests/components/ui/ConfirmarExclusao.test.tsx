// R-NAV-3-V2 -- testes do componente ConfirmarExclusao reutilizavel.
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import { ConfirmarExclusao } from '@/components/ui/ConfirmarExclusao';

describe('ConfirmarExclusao', () => {
  it('renderiza titulo e dois botoes quando visible=true', () => {
    const { getByText, getByLabelText } = render(
      <ConfirmarExclusao
        visible
        titulo="Excluir contador?"
        onConfirmar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    expect(getByText('Excluir contador?')).toBeTruthy();
    expect(getByLabelText('excluir')).toBeTruthy();
    expect(getByLabelText('cancelar')).toBeTruthy();
  });

  it('renderiza descricao quando fornecida', () => {
    const { getByText } = render(
      <ConfirmarExclusao
        visible
        titulo="Excluir alarme?"
        descricao="O alarme será removido."
        onConfirmar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    expect(getByText('O alarme será removido.')).toBeTruthy();
  });

  it('omite descricao quando nao fornecida', () => {
    const { queryByText } = render(
      <ConfirmarExclusao
        visible
        titulo="Excluir contador?"
        onConfirmar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    // Apenas o titulo deve aparecer (a descricao seria um Text adicional).
    expect(queryByText(/sera removido/i)).toBeNull();
  });

  it('tap em Cancelar dispara onCancelar', () => {
    const onCancelar = jest.fn();
    const onConfirmar = jest.fn();
    const { getByLabelText } = render(
      <ConfirmarExclusao
        visible
        titulo="Excluir?"
        onConfirmar={onConfirmar}
        onCancelar={onCancelar}
      />
    );
    fireEvent.press(getByLabelText('cancelar'));
    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('tap em Excluir dispara onConfirmar', () => {
    const onCancelar = jest.fn();
    const onConfirmar = jest.fn();
    const { getByLabelText } = render(
      <ConfirmarExclusao
        visible
        titulo="Excluir?"
        onConfirmar={onConfirmar}
        onCancelar={onCancelar}
      />
    );
    fireEvent.press(getByLabelText('excluir'));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('quando excluindo=true desabilita ambos os botoes', () => {
    const onCancelar = jest.fn();
    const onConfirmar = jest.fn();
    const { getByLabelText } = render(
      <ConfirmarExclusao
        visible
        excluindo
        titulo="Excluir?"
        onConfirmar={onConfirmar}
        onCancelar={onCancelar}
      />
    );
    fireEvent.press(getByLabelText('excluir'));
    fireEvent.press(getByLabelText('cancelar'));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('visible=false nao renderiza conteudo no DOM', () => {
    const { queryByText } = render(
      <ConfirmarExclusao
        visible={false}
        titulo="Excluir?"
        onConfirmar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    // Modal RN com visible=false oculta o filho.
    expect(queryByText('Excluir?')).toBeNull();
  });
});
