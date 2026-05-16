// Testes do wrapper EmocaoChips. Verifica que prop modo troca o
// conjunto de chips e que multi-select chega no onChange.
// R0 lexical: modos canonicos 'gatilho' | 'conquista' | 'reflexao'.
import { render, fireEvent } from '@testing-library/react-native';
import { EmocaoChips } from '@/components/diario/EmocaoChips';

describe('EmocaoChips modo gatilho', () => {
  it('renderiza os 6 chips negativos com acento PT-BR', () => {
    const { getByLabelText } = render(
      <EmocaoChips modo="gatilho" value={[]} onChange={() => undefined} />
    );
    // chips expostos via accessibilityLabel 'chip <label>'.
    expect(getByLabelText('chip Tristeza')).toBeTruthy();
    expect(getByLabelText('chip Raiva')).toBeTruthy();
    expect(getByLabelText('chip Ansiedade')).toBeTruthy();
    expect(getByLabelText('chip Frustração')).toBeTruthy();
    expect(getByLabelText('chip Medo')).toBeTruthy();
    expect(getByLabelText('chip Solidão')).toBeTruthy();
  });

  it('clique em chip dispara onChange com slug snake_case', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <EmocaoChips modo="gatilho" value={[]} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('chip Frustração'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['frustracao']);
  });
});

describe('EmocaoChips modo conquista', () => {
  it('renderiza os 6 chips positivos com acento PT-BR', () => {
    const { getByLabelText } = render(
      <EmocaoChips modo="conquista" value={[]} onChange={() => undefined} />
    );
    expect(getByLabelText('chip Alegria')).toBeTruthy();
    expect(getByLabelText('chip Alívio')).toBeTruthy();
    expect(getByLabelText('chip Gratidão')).toBeTruthy();
    expect(getByLabelText('chip Conexão')).toBeTruthy();
    expect(getByLabelText('chip Paz')).toBeTruthy();
    expect(getByLabelText('chip Orgulho')).toBeTruthy();
  });

  it('nao expoe chips negativos quando modo eh conquista', () => {
    const { queryByLabelText } = render(
      <EmocaoChips modo="conquista" value={[]} onChange={() => undefined} />
    );
    expect(queryByLabelText('chip Tristeza')).toBeNull();
    expect(queryByLabelText('chip Frustração')).toBeNull();
  });
});

describe('EmocaoChips troca de modo', () => {
  it('atualiza o conjunto de chips ao receber novo prop modo', () => {
    const { rerender, getByLabelText, queryByLabelText } = render(
      <EmocaoChips modo="gatilho" value={[]} onChange={() => undefined} />
    );
    expect(getByLabelText('chip Frustração')).toBeTruthy();

    rerender(
      <EmocaoChips modo="conquista" value={[]} onChange={() => undefined} />
    );
    expect(queryByLabelText('chip Frustração')).toBeNull();
    expect(getByLabelText('chip Gratidão')).toBeTruthy();
  });
});

describe('EmocaoChips multi-select', () => {
  it('mantem ordem de selecao e remove ao re-clicar', () => {
    const onChange = jest.fn();
    const { getByLabelText, rerender } = render(
      <EmocaoChips modo="gatilho" value={[]} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('chip Tristeza'));
    expect(onChange).toHaveBeenLastCalledWith(['tristeza']);

    // Simula proximo render com o slug ja selecionado.
    rerender(
      <EmocaoChips modo="gatilho" value={['tristeza']} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('chip Raiva'));
    expect(onChange).toHaveBeenLastCalledWith(['tristeza', 'raiva']);

    rerender(
      <EmocaoChips
        modo="gatilho"
        value={['tristeza', 'raiva']}
        onChange={onChange}
      />
    );
    fireEvent.press(getByLabelText('chip Tristeza'));
    expect(onChange).toHaveBeenLastCalledWith(['raiva']);
  });
});
