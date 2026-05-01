// Testes do BlocoInstrucao.
import { render } from '@testing-library/react-native';
import { BlocoInstrucao } from '@/components/exercicios/BlocoInstrucao';

describe('BlocoInstrucao', () => {
  it('renderiza titulo default e texto', () => {
    const { getByText } = render(
      <BlocoInstrucao texto="Posicione a barra e desça." />
    );
    expect(getByText('Instrução')).toBeTruthy();
    expect(getByText('Posicione a barra e desça.')).toBeTruthy();
  });

  it('aceita titulo customizado', () => {
    const { getByText } = render(
      <BlocoInstrucao titulo="Dicas" texto="Mantenha o tronco ereto." />
    );
    expect(getByText('Dicas')).toBeTruthy();
    expect(getByText('Mantenha o tronco ereto.')).toBeTruthy();
  });

  it('separa paragrafos por quebra de linha dupla', () => {
    const { getByText } = render(
      <BlocoInstrucao texto={'Primeiro parágrafo.\n\nSegundo parágrafo.'} />
    );
    expect(getByText('Primeiro parágrafo.')).toBeTruthy();
    expect(getByText('Segundo parágrafo.')).toBeTruthy();
  });
});
