// Testes do SheetNovaTarefa (M17). Cobre render do header, modos
// criar/editar e dispatch de onSalvar quando ha titulo.
//
// Mock inline de @gorhom/bottom-sheet: jest.setup.cjs ja cobre os
// simbolos canonicos (BottomSheet default, BottomSheetView,
// BottomSheetBackdrop), mas nao expoe BottomSheetTextInput. Aqui
// adicionamos o mock especifico.
//
// Comentarios sem acento (convencao shell/CI).
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactInner = require('react');
  const RNInner = require('react-native');
  return {
    __esModule: true,
    BottomSheetView: ({ children, ...rest }: Record<string, unknown>) =>
      ReactInner.createElement(RNInner.View, rest, children as unknown),
    BottomSheetTextInput: (props: Record<string, unknown>) =>
      ReactInner.createElement(RNInner.TextInput, props),
    BottomSheetBackdrop: (props: Record<string, unknown>) =>
      ReactInner.createElement(RNInner.View, props),
    default: ReactInner.forwardRef(
      (
        props: { children: unknown },
        ref: unknown
      ) => {
        ReactInner.useImperativeHandle(ref, () => ({
          expand: () => undefined,
          close: () => undefined,
          snapToIndex: () => undefined,
        }));
        return ReactInner.createElement(RNInner.View, null, props.children);
      }
    ),
  };
});

import { render, fireEvent } from '@testing-library/react-native';
import { SheetNovaTarefa } from '@/components/todo/SheetNovaTarefa';

describe('SheetNovaTarefa', () => {
  it('renderiza header "Nova tarefa" no modo criar', () => {
    const { getByText } = render(
      <SheetNovaTarefa
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    expect(getByText('Nova tarefa')).toBeTruthy();
  });

  it('renderiza header "Editar tarefa" no modo editar', () => {
    const { getByText } = render(
      <SheetNovaTarefa
        modo="editar"
        tituloInicial="Comprar pão"
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    expect(getByText('Editar tarefa')).toBeTruthy();
  });

  it('inicia campo com tituloInicial', () => {
    const { getByLabelText } = render(
      <SheetNovaTarefa
        modo="editar"
        tituloInicial="Comprar pão"
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    const input = getByLabelText('campo titulo da tarefa');
    expect(input.props.value).toBe('Comprar pão');
  });

  it('dispara onSalvar com titulo trim', () => {
    const onSalvar = jest.fn();
    const { getByLabelText, getByText } = render(
      <SheetNovaTarefa
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    const input = getByLabelText('campo titulo da tarefa');
    fireEvent.changeText(input, '  Comprar leite  ');
    fireEvent.press(getByText('Salvar'));
    expect(onSalvar).toHaveBeenCalledWith('Comprar leite');
  });

  it('botao Salvar disabled quando titulo vazio', () => {
    const onSalvar = jest.fn();
    const { getByLabelText } = render(
      <SheetNovaTarefa
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    fireEvent.press(getByLabelText('Salvar'));
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('dispara onCancelar no botao Cancelar', () => {
    const onCancelar = jest.fn();
    const { getByText } = render(
      <SheetNovaTarefa
        onSalvar={() => undefined}
        onCancelar={onCancelar}
      />
    );
    fireEvent.press(getByText('Cancelar'));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('label do botao primario muda em modo editar', () => {
    const { getByText } = render(
      <SheetNovaTarefa
        modo="editar"
        tituloInicial="x"
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    expect(getByText('Atualizar')).toBeTruthy();
  });
});
