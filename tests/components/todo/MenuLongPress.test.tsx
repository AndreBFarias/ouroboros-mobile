// Testes do MenuLongPress (M17). Verifica visibilidade controlada,
// render do titulo alvo, dispatch de Editar/Excluir/Cancelar.
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import { MenuLongPress } from '@/components/todo/MenuLongPress';

describe('MenuLongPress', () => {
  it('nao renderiza conteudo quando visible=false', () => {
    const { queryByLabelText } = render(
      <MenuLongPress
        visible={false}
        onEditar={() => undefined}
        onExcluir={() => undefined}
        onFechar={() => undefined}
      />
    );
    expect(queryByLabelText('editar tarefa')).toBeNull();
  });

  it('renderiza titulo alvo quando fornecido', () => {
    const { getByText } = render(
      <MenuLongPress
        visible
        tituloAlvo="Comprar pão"
        onEditar={() => undefined}
        onExcluir={() => undefined}
        onFechar={() => undefined}
      />
    );
    expect(getByText('Comprar pão')).toBeTruthy();
  });

  it('dispara onEditar', () => {
    const onEditar = jest.fn();
    const { getByLabelText } = render(
      <MenuLongPress
        visible
        onEditar={onEditar}
        onExcluir={() => undefined}
        onFechar={() => undefined}
      />
    );
    fireEvent.press(getByLabelText('editar tarefa'));
    expect(onEditar).toHaveBeenCalledTimes(1);
  });

  it('dispara onExcluir', () => {
    const onExcluir = jest.fn();
    const { getByLabelText } = render(
      <MenuLongPress
        visible
        onEditar={() => undefined}
        onExcluir={onExcluir}
        onFechar={() => undefined}
      />
    );
    fireEvent.press(getByLabelText('excluir tarefa'));
    expect(onExcluir).toHaveBeenCalledTimes(1);
  });

  it('dispara onFechar no botao Cancelar', () => {
    const onFechar = jest.fn();
    const { getByLabelText } = render(
      <MenuLongPress
        visible
        onEditar={() => undefined}
        onExcluir={() => undefined}
        onFechar={onFechar}
      />
    );
    fireEvent.press(getByLabelText('cancelar menu'));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
