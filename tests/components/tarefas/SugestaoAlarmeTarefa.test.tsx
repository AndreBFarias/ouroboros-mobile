// Testes do SugestaoAlarmeTarefa (R-ROT-1-B). Verifica:
//  - Renderiza motivo e linha com titulo + hora sugerida.
//  - Botao Criar alarme dispara onAceitar.
//  - Botao Agora nao dispara onRejeitar.
//  - accessibilityLabel canonico no container (screen reader).
//  - Acentuacao completa PT-BR nas strings de UI.
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import { SugestaoAlarmeTarefa } from '@/components/tarefas/SugestaoAlarmeTarefa';

describe('SugestaoAlarmeTarefa', () => {
  function defaults(
    over: Partial<React.ComponentProps<typeof SugestaoAlarmeTarefa>> = {}
  ) {
    return {
      tituloTarefa: 'Tomar remédio',
      motivo: 'Você costuma marcar essa tarefa por volta das 20:00.',
      hora: '20:00',
      onAceitar: jest.fn(),
      onRejeitar: jest.fn(),
      ...over,
    };
  }

  it('renderiza motivo com acentuacao completa', () => {
    const props = defaults();
    const { getByText } = render(<SugestaoAlarmeTarefa {...props} />);
    expect(
      getByText('Você costuma marcar essa tarefa por volta das 20:00.')
    ).toBeTruthy();
  });

  it('renderiza pergunta com titulo e hora', () => {
    const props = defaults();
    const { getByText } = render(<SugestaoAlarmeTarefa {...props} />);
    expect(
      getByText('Quer criar um alarme para Tomar remédio às 20:00?')
    ).toBeTruthy();
  });

  it('botao Criar alarme dispara onAceitar', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoAlarmeTarefa {...props} />);
    fireEvent.press(getByLabelText('aceitar e criar alarme sugerido'));
    expect(props.onAceitar).toHaveBeenCalledTimes(1);
    expect(props.onRejeitar).not.toHaveBeenCalled();
  });

  it('botao Agora nao dispara onRejeitar', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoAlarmeTarefa {...props} />);
    fireEvent.press(getByLabelText('rejeitar e silenciar sugestao'));
    expect(props.onRejeitar).toHaveBeenCalledTimes(1);
    expect(props.onAceitar).not.toHaveBeenCalled();
  });

  it('container tem accessibilityLabel canonico', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoAlarmeTarefa {...props} />);
    expect(
      getByLabelText('sugestao de alarme com base no historico de marcacoes')
    ).toBeTruthy();
  });

  it('aceita titulo com acentuacao variada', () => {
    const props = defaults({ tituloTarefa: 'Beber água' });
    const { getByText } = render(<SugestaoAlarmeTarefa {...props} />);
    expect(
      getByText('Quer criar um alarme para Beber água às 20:00?')
    ).toBeTruthy();
  });
});
