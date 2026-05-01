// Testes do CardGaleria. Verifica render do nome, placeholder quando
// gif ausente, dispatch de onPress no tap.
import { render, fireEvent } from '@testing-library/react-native';
import { CardGaleria } from '@/components/exercicios/CardGaleria';
import type { Exercicio } from '@/lib/schemas/exercicio';

const exercicioBase: Exercicio = {
  tipo: 'exercicio',
  slug: 'agachamento-livre',
  nome: 'Agachamento livre',
  grupo_muscular: ['pernas'],
  nivel: 'intermediario',
  equipamento: 'barra',
  instrucao: 'desca ate paralela e suba.',
  dicas: [],
  gif: '',
  historico: [],
};

describe('CardGaleria', () => {
  it('renderiza nome do exercicio em sentence case com acento', () => {
    const { getByText } = render(
      <CardGaleria
        exercicio={exercicioBase}
        gifUri={null}
        onPress={() => undefined}
      />
    );
    expect(getByText('Agachamento livre')).toBeTruthy();
  });

  it('mostra placeholder "Sem mídia" quando gif ausente', () => {
    const { getByText } = render(
      <CardGaleria
        exercicio={exercicioBase}
        gifUri={null}
        onPress={() => undefined}
      />
    );
    expect(getByText('Sem mídia')).toBeTruthy();
  });

  it('renderiza Image quando gifUri presente', () => {
    const { getByLabelText } = render(
      <CardGaleria
        exercicio={exercicioBase}
        gifUri="content://test/assets/exercicios/agachamento-livre.gif"
        onPress={() => undefined}
      />
    );
    expect(getByLabelText('gif agachamento-livre')).toBeTruthy();
  });

  it('dispara onPress no tap do card', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <CardGaleria
        exercicio={exercicioBase}
        gifUri={null}
        onPress={onPress}
      />
    );
    fireEvent.press(getByLabelText('abrir exercicio agachamento-livre'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
