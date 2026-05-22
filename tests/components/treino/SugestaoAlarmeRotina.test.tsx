// Testes do SugestaoAlarmeRotina (R-ROT-1-D). Verifica:
//  - Renderiza motivo e linha com nome da rotina + hora sugerida.
//  - Botao Criar alarme dispara onAceitar.
//  - Botao Agora nao dispara onRejeitar.
//  - accessibilityLabel canonico no container (screen reader).
//  - Acentuacao completa PT-BR nas strings de UI.
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import { SugestaoAlarmeRotina } from '@/components/treino/SugestaoAlarmeRotina';

describe('SugestaoAlarmeRotina', () => {
  function defaults(
    over: Partial<React.ComponentProps<typeof SugestaoAlarmeRotina>> = {}
  ) {
    return {
      nomeRotina: 'Rotina A — peito',
      motivo: 'Você costuma treinar essa rotina por volta das 18:00.',
      hora: '18:00',
      onAceitar: jest.fn(),
      onRejeitar: jest.fn(),
      ...over,
    };
  }

  it('renderiza motivo com acentuacao completa', () => {
    const props = defaults();
    const { getByText } = render(<SugestaoAlarmeRotina {...props} />);
    expect(
      getByText('Você costuma treinar essa rotina por volta das 18:00.')
    ).toBeTruthy();
  });

  it('renderiza pergunta com nome da rotina e hora', () => {
    const props = defaults();
    const { getByText } = render(<SugestaoAlarmeRotina {...props} />);
    expect(
      getByText('Quer criar um alarme para Rotina A — peito às 18:00?')
    ).toBeTruthy();
  });

  it('botao Criar alarme dispara onAceitar', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoAlarmeRotina {...props} />);
    fireEvent.press(getByLabelText('aceitar e criar alarme sugerido para rotina'));
    expect(props.onAceitar).toHaveBeenCalledTimes(1);
    expect(props.onRejeitar).not.toHaveBeenCalled();
  });

  it('botao Agora nao dispara onRejeitar', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoAlarmeRotina {...props} />);
    fireEvent.press(getByLabelText('rejeitar e silenciar sugestao da rotina'));
    expect(props.onRejeitar).toHaveBeenCalledTimes(1);
    expect(props.onAceitar).not.toHaveBeenCalled();
  });

  it('container tem accessibilityLabel canonico', () => {
    const props = defaults();
    const { getByLabelText } = render(<SugestaoAlarmeRotina {...props} />);
    expect(
      getByLabelText(
        'sugestao de alarme com base no historico de execucoes da rotina'
      )
    ).toBeTruthy();
  });

  it('aceita nome de rotina com acentuacao variada', () => {
    const props = defaults({ nomeRotina: 'Saúde física diária' });
    const { getByText } = render(<SugestaoAlarmeRotina {...props} />);
    expect(
      getByText('Quer criar um alarme para Saúde física diária às 18:00?')
    ).toBeTruthy();
  });
});
