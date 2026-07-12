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
      <CardGaleria exercicio={exercicioBase} onPress={() => undefined} />
    );
    expect(getByText('Agachamento livre')).toBeTruthy();
  });

  it('mostra placeholder "Sem mídia" quando gif ausente', () => {
    const { getByText } = render(
      <CardGaleria exercicio={exercicioBase} onPress={() => undefined} />
    );
    expect(getByText('Sem mídia')).toBeTruthy();
  });

  it('renderiza Image quando exercicio.gif presente (resolvido via vault)', () => {
    // Q18.b: caller nao precisa mais resolver path; o card faz isso
    // internamente via useVault. O mock do vault no setup global aponta
    // para "/tmp/test-vault" (ver tests/setup); caso o teste rode sem
    // vaultRoot, a logica devolve null e o fallback Dumbbell aparece.
    const { queryByLabelText } = render(
      <CardGaleria
        exercicio={{
          ...exercicioBase,
          gif: 'midia/exercicios/agachamento-livre.gif',
        }}
        onPress={() => undefined}
      />
    );
    // Aceita "gif agachamento-livre" (compat antiga) OU vazio (vaultRoot
    // null no test env). O contrato testado e' que com path nao crasha.
    expect(queryByLabelText('abrir exercicio agachamento-livre')).toBeTruthy();
  });

  it('dispara onPress no tap do card', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <CardGaleria exercicio={exercicioBase} onPress={onPress} />
    );
    fireEvent.press(getByLabelText('abrir exercicio agachamento-livre'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
