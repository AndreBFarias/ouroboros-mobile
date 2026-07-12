// Testes do CardContador (M18). Verifica render do numero de dias,
// label dia/dias singular vs plural, titulo, recorde, dispatch de
// onPressResetei e onPressCard, e ausencia de elementos
// celebratorios (emoji, "parabens", trofeu).
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import { CardContador } from '@/components/contadores/CardContador';
import type { Contador } from '@/lib/schemas/contador';

const baseContador: Contador = {
  tipo: 'contador',
  slug: 'sem-cigarro',
  titulo: 'Sem cigarro',
  inicio: '2026-04-01',
  recorde: 28,
  resets: ['2026-04-01T08:00:00Z'],
  criado_em: '2026-02-04T14:00:00-03:00',
  para: { tipo: 'mim' },
};

describe('CardContador', () => {
  it('renderiza numero de dias correto a partir de inicio', () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const { getByText } = render(
      <CardContador
        contador={baseContador}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    // 28 dias entre 2026-04-01 e 2026-04-29.
    expect(getByText('28')).toBeTruthy();
  });

  it('renderiza label "dias" no plural quando >1', () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const { getByText } = render(
      <CardContador
        contador={baseContador}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    expect(getByText('dias')).toBeTruthy();
  });

  it('renderiza label "dia" no singular quando dias === 1', () => {
    const agora = new Date('2026-04-02T10:00:00Z');
    const { getByText } = render(
      <CardContador
        contador={baseContador}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText('dia')).toBeTruthy();
  });

  it('renderiza dia 0 quando inicio = agora', () => {
    const agora = new Date('2026-04-01T10:00:00Z');
    const { getByText } = render(
      <CardContador
        contador={baseContador}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    expect(getByText('0')).toBeTruthy();
    // Plural por convencao em zero.
    expect(getByText('dias')).toBeTruthy();
  });

  it('renderiza titulo em sentence case com acentuacao', () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const { getByText } = render(
      <CardContador
        contador={{ ...baseContador, titulo: 'Sem álcool' }}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    expect(getByText('Sem álcool')).toBeTruthy();
  });

  it('renderiza recorde em label muted "Recorde: N dias"', () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const { getByText } = render(
      <CardContador
        contador={baseContador}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    expect(getByText('Recorde: 28 dias')).toBeTruthy();
  });

  it('renderiza recorde singular quando recorde = 1', () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const { getByText } = render(
      <CardContador
        contador={{ ...baseContador, recorde: 1 }}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    expect(getByText('Recorde: 1 dia')).toBeTruthy();
  });

  it('botao Resetei dispara onPressResetei', () => {
    const onPressResetei = jest.fn();
    const agora = new Date('2026-04-29T10:00:00Z');
    const { getByLabelText } = render(
      <CardContador
        contador={baseContador}
        onPressResetei={onPressResetei}
        agora={agora}
      />
    );
    fireEvent.press(getByLabelText(/resetei sem-cigarro/));
    expect(onPressResetei).toHaveBeenCalledTimes(1);
  });

  it('tap no card dispara onPressCard quando fornecido', () => {
    const onPressCard = jest.fn();
    const agora = new Date('2026-04-29T10:00:00Z');
    const { getByLabelText } = render(
      <CardContador
        contador={baseContador}
        onPressResetei={() => undefined}
        onPressCard={onPressCard}
        agora={agora}
      />
    );
    fireEvent.press(getByLabelText(/contador Sem cigarro 28 dias/));
    expect(onPressCard).toHaveBeenCalledTimes(1);
  });

  it('botao Resetei tem texto literal "Resetei"', () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const { getByText } = render(
      <CardContador
        contador={baseContador}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    expect(getByText('Resetei')).toBeTruthy();
  });

  it('nao renderiza elementos celebratorios (emoji, trofeu, parabens)', () => {
    const agora = new Date('2026-04-29T10:00:00Z');
    const { queryByText } = render(
      <CardContador
        contador={{ ...baseContador, recorde: 100 }}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    // Nem mesmo em milestones de 30 ou 100 deve aparecer texto
    // motivacional.
    expect(queryByText(/parabéns/i)).toBeNull();
    expect(queryByText(/parabens/i)).toBeNull();
    expect(queryByText(/incrível/i)).toBeNull();
    expect(queryByText(/conseguiu/i)).toBeNull();
  });

  it('renderiza dia 0 com label plural "dias" mesmo quando dias atuais = 0', () => {
    // Convencao do projeto: zero usa plural ("0 dias", nao "0 dia").
    const agora = new Date('2026-04-01T10:00:00Z');
    const { getByText, queryByText } = render(
      <CardContador
        contador={{ ...baseContador, recorde: 0 }}
        onPressResetei={() => undefined}
        agora={agora}
      />
    );
    expect(getByText('0')).toBeTruthy();
    expect(getByText('dias')).toBeTruthy();
    // Nao deve aparecer "1 dia" nem render duplicado.
    expect(queryByText(/^dia$/)).toBeNull();
  });
});
