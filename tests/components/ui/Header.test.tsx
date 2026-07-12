import { fireEvent, render } from '@testing-library/react-native';
import { Header } from '@/components/ui/Header';

describe('Header', () => {
  it('renderiza titulo', () => {
    const { getByText } = render(<Header title="hoje" />);
    expect(getByText('hoje')).toBeTruthy();
  });

  it('mostra botao voltar quando onBack e fornecido', () => {
    const onBack = jest.fn();
    const { getByLabelText } = render(
      <Header title="detalhe" onBack={onBack} />
    );
    fireEvent.press(getByLabelText('voltar'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('omite botao voltar quando onBack ausente', () => {
    const { queryByLabelText } = render(<Header title="hoje" />);
    expect(queryByLabelText('voltar')).toBeNull();
  });
});
