import { render } from '@testing-library/react-native';
import { CardStatus } from '@/components/settings/CardStatus';

describe('CardStatus', () => {
  it('renderiza titulo e subtitulo', () => {
    const { getByText } = render(
      <CardStatus
        cor="verde"
        titulo="Sincronizado"
        subtitulo="Vault: ~/Protocolo-Ouroboros/"
      />
    );
    expect(getByText('Sincronizado')).toBeTruthy();
    expect(getByText('Vault: ~/Protocolo-Ouroboros/')).toBeTruthy();
  });

  it('aceita as 4 cores canonicas sem quebrar', () => {
    const cores = ['verde', 'amarelo', 'vermelho', 'desconhecido'] as const;
    for (const cor of cores) {
      const { getByText } = render(
        <CardStatus cor={cor} titulo={`status ${cor}`} />
      );
      expect(getByText(`status ${cor}`)).toBeTruthy();
    }
  });

  it('a11y label default sem acento expoe a cor', () => {
    const { getByLabelText } = render(
      <CardStatus cor="amarelo" titulo="Atrasado" />
    );
    expect(getByLabelText('card status sync amarelo')).toBeTruthy();
  });

  it('a11y label customizado e respeitado', () => {
    const { getByLabelText } = render(
      <CardStatus
        cor="vermelho"
        titulo="Conflito"
        accessibilityLabel="status sync conflito"
      />
    );
    expect(getByLabelText('status sync conflito')).toBeTruthy();
  });

  it('subtitulo opcional nao renderiza Text quando ausente', () => {
    const { queryByText } = render(
      <CardStatus cor="verde" titulo="Pronto" />
    );
    expect(queryByText('Vault')).toBeNull();
  });
});
