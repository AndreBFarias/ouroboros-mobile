// Testes do SugestaoSnoozeBanner (R-ROT-1-A). Verifica:
//  - Renderiza motivo e horario antigo->novo.
//  - Botao Aceitar dispara onAceitar.
//  - Botao Rejeitar dispara onRejeitar.
//  - accessibilityLabel canonico no container (screen reader).
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import { SugestaoSnoozeBanner } from '@/components/alarmes/SugestaoSnoozeBanner';

describe('SugestaoSnoozeBanner', () => {
  function defaults(over: Partial<React.ComponentProps<typeof SugestaoSnoozeBanner>> = {}) {
    return {
      motivo: 'Você costuma adiar 15 minutos.',
      horarioAtual: '07:00',
      novaHora: '07:15',
      onAceitar: jest.fn(),
      onRejeitar: jest.fn(),
      ...over,
    };
  }

  it('renderiza motivo com acentuacao completa', () => {
    const props = defaults();
    const { getByText } = render(<SugestaoSnoozeBanner {...props} />);
    expect(getByText('Você costuma adiar 15 minutos.')).toBeTruthy();
  });

  it('renderiza pergunta com horario atual e nova hora', () => {
    const props = defaults();
    const { getByText } = render(<SugestaoSnoozeBanner {...props} />);
    expect(getByText('Quer mover de 07:00 para 07:15?')).toBeTruthy();
  });

  it('botao Aceitar dispara onAceitar', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoSnoozeBanner {...props} />);
    fireEvent.press(getByLabelText('aceitar nova hora sugerida'));
    expect(props.onAceitar).toHaveBeenCalledTimes(1);
    expect(props.onRejeitar).not.toHaveBeenCalled();
  });

  it('botao Rejeitar dispara onRejeitar', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoSnoozeBanner {...props} />);
    fireEvent.press(getByLabelText('rejeitar e silenciar sugestao'));
    expect(props.onRejeitar).toHaveBeenCalledTimes(1);
    expect(props.onAceitar).not.toHaveBeenCalled();
  });

  it('container tem accessibilityLabel canonico', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoSnoozeBanner {...props} />);
    expect(
      getByLabelText('sugestao de novo horario com base no historico')
    ).toBeTruthy();
  });
});
