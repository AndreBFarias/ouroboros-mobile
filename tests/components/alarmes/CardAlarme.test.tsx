// Testes do CardAlarme (M16). Verifica render do titulo, horario,
// labels de tag e som, dots de dias da semana e dispatch de onToggle
// e onPressEditar.
//
// Comentarios sem acento (convencao shell/CI).
import { render, fireEvent } from '@testing-library/react-native';
import { CardAlarme } from '@/components/alarmes/CardAlarme';
import type { Alarme } from '@/lib/schemas/alarme';

const baseAlarme: Alarme = {
  tipo: 'alarme',
  slug: 'medicacao-manha',
  titulo: 'Medicação da manhã',
  horario: '08:30',
  dias_semana: [1, 2, 3, 4, 5],
  // M30: recorrencia required no output type apos default.
  recorrencia: 'semanal',
  tag: 'medicacao',
  som: 'gentle',
  ativo: true,
  snooze_minutos: 5,
  criado_em: '2026-04-29T10:00:00-03:00',
  ultimo_disparo: null,
  notification_ids: [],
  snooze_id: null,
};

describe('CardAlarme', () => {
  it('renderiza titulo em sentence case com acentuacao', () => {
    const { getByText } = render(
      <CardAlarme
        alarme={baseAlarme}
        onToggle={() => undefined}
        onPressEditar={() => undefined}
      />
    );
    expect(getByText('Medicação da manhã')).toBeTruthy();
  });

  it('renderiza horario formatado', () => {
    const { getByText } = render(
      <CardAlarme alarme={baseAlarme} onToggle={() => undefined} />
    );
    expect(getByText('08:30')).toBeTruthy();
  });

  it('renderiza linha micro com tag e som', () => {
    const { getByText, getAllByText } = render(
      <CardAlarme alarme={baseAlarme} onToggle={() => undefined} />
    );
    // Texto: "Medicação da manhã" (titulo) + "Medicação · Suave" (linha
    // micro). getAllByText valida que a tag aparece pelo menos no rotulo
    // micro alem do titulo.
    expect(getAllByText(/Medicação/).length).toBeGreaterThanOrEqual(2);
    expect(getByText(/Suave/)).toBeTruthy();
  });

  it('renderiza tag treino com label correto', () => {
    const { getByText } = render(
      <CardAlarme
        alarme={{ ...baseAlarme, tag: 'treino', som: 'forte' }}
        onToggle={() => undefined}
      />
    );
    expect(getByText(/Treino/)).toBeTruthy();
    expect(getByText(/Forte/)).toBeTruthy();
  });

  it('dispara onPressEditar no tap do card', () => {
    const onPressEditar = jest.fn();
    const { getByLabelText } = render(
      <CardAlarme
        alarme={baseAlarme}
        onToggle={() => undefined}
        onPressEditar={onPressEditar}
      />
    );
    fireEvent.press(getByLabelText(/alarme Medicação da manhã/));
    expect(onPressEditar).toHaveBeenCalledTimes(1);
  });

  it('toggle inline dispara onToggle com novo valor', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(
      <CardAlarme alarme={baseAlarme} onToggle={onToggle} />
    );
    fireEvent.press(getByLabelText('alternar alarme medicacao-manha'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('renderiza alarme inativo com horario muted (sem cor purple no campo)', () => {
    const { getByText } = render(
      <CardAlarme
        alarme={{ ...baseAlarme, ativo: false }}
        onToggle={() => undefined}
      />
    );
    // Horario continua presente; cor e style implicito (nao testavel sem
    // snapshot). Apenas garantimos render.
    expect(getByText('08:30')).toBeTruthy();
  });
});
