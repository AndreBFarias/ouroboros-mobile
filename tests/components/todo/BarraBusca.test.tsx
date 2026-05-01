// Testes do BarraBusca (M17). Verifica render, propagacao de
// onChangeText e botao limpar.
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import {
  BarraBusca,
  normalizarBusca,
} from '@/components/todo/BarraBusca';

describe('BarraBusca', () => {
  it('renderiza placeholder default', () => {
    const { getByPlaceholderText } = render(
      <BarraBusca value="" onChangeText={() => undefined} />
    );
    expect(getByPlaceholderText('Buscar tarefas')).toBeTruthy();
  });

  it('propaga onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <BarraBusca value="" onChangeText={onChangeText} />
    );
    const input = getByLabelText('campo de busca de tarefas');
    fireEvent.changeText(input, 'pao');
    expect(onChangeText).toHaveBeenCalledWith('pao');
  });

  it('mostra botao limpar quando ha valor', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <BarraBusca value="pao" onChangeText={onChangeText} />
    );
    expect(getByLabelText('limpar busca')).toBeTruthy();
  });

  it('botao limpar dispara onChangeText("")', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <BarraBusca value="pao" onChangeText={onChangeText} />
    );
    fireEvent.press(getByLabelText('limpar busca'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('botao limpar nao aparece com value vazio', () => {
    const { queryByLabelText } = render(
      <BarraBusca value="" onChangeText={() => undefined} />
    );
    expect(queryByLabelText('limpar busca')).toBeNull();
  });
});

describe('normalizarBusca', () => {
  it('remove acentos', () => {
    expect(normalizarBusca('Pão')).toBe('pao');
  });

  it('lowercase', () => {
    expect(normalizarBusca('LIVROS')).toBe('livros');
  });

  it('combina acento + maiuscula', () => {
    expect(normalizarBusca('Médico')).toBe('medico');
  });

  it('preserva numeros e simbolos basicos', () => {
    expect(normalizarBusca('Item 3-A')).toBe('item 3-a');
  });
});
