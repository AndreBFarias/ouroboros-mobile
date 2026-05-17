// Testes de render do RecapContador (R-RECAP-5, 2026-05-16). Cobre:
//   - empty state (zero eventos)
//   - render de eventos com descricao, humor, tags
//   - slideshow renderizado apenas quando ha fotos
//   - tap no slideshow alterna pause/retomar
//   - contagem de midias por tipo
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import { RecapContador } from '@/components/screens/RecapContador';
import type { EventoContador } from '@/lib/schemas/evento_contador';

function fixture(over: Partial<EventoContador> = {}): EventoContador {
  return {
    tipo: 'evento_contador',
    contadorId: 'sem-cigarro',
    data: '2026-05-16',
    slug: 'aaa',
    humor: 4,
    descricao: 'Almoco com amigos',
    tags: [],
    midias: [],
    criado_em: '2026-05-16T14:00:00-03:00',
    autor: 'pessoa_a',
    para: { tipo: 'mim' },
    ...over,
  };
}

describe('RecapContador empty state', () => {
  it('mostra mensagem quando lista vazia', () => {
    const { getByLabelText, queryByLabelText } = render(
      <RecapContador eventos={[]} vaultRoot={null} />
    );
    expect(getByLabelText('recap contador vazio')).toBeTruthy();
    expect(queryByLabelText('recap contador')).toBeNull();
  });
});

describe('RecapContador com eventos', () => {
  it('renderiza container quando ha eventos', () => {
    const eventos = [fixture()];
    const { getByLabelText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(getByLabelText('recap contador')).toBeTruthy();
  });

  it('mostra descricao do evento', () => {
    const eventos = [fixture({ descricao: 'Cafe no parque' })];
    const { getByText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(getByText('Cafe no parque')).toBeTruthy();
  });

  it('mostra humor do evento como X/5', () => {
    const eventos = [fixture({ humor: 3 })];
    const { getByText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(getByText('Humor 3/5')).toBeTruthy();
  });

  it('formata data YYYY-MM-DD para DD/MM/YYYY', () => {
    const eventos = [fixture({ data: '2026-05-16' })];
    const { getByText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(getByText('16/05/2026')).toBeTruthy();
  });

  it('renderiza tags com prefixo #', () => {
    const eventos = [fixture({ tags: ['foco', 'paz'] })];
    const { getByText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(getByText('#foco')).toBeTruthy();
    expect(getByText('#paz')).toBeTruthy();
  });

  it('omite descricao quando vazia', () => {
    const eventos = [
      fixture({
        descricao: '',
        midias: [{ tipo: 'foto', path: 'jpg/x.jpg' }],
      }),
    ];
    const { queryByText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    // Sem texto fixo da descricao, mas humor segue presente.
    expect(queryByText('Almoco com amigos')).toBeNull();
  });

  it('mostra contagem de midias quando ha alguma', () => {
    const eventos = [
      fixture({
        midias: [
          { tipo: 'foto', path: 'jpg/x.jpg' },
          { tipo: 'audio', path: 'm4a/x.m4a' },
        ],
      }),
    ];
    const { getByText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(getByText('2 mídias')).toBeTruthy();
  });

  it('mostra "1 mídia" no singular', () => {
    const eventos = [
      fixture({
        midias: [{ tipo: 'foto', path: 'jpg/x.jpg' }],
      }),
    ];
    const { getByText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(getByText('1 mídia')).toBeTruthy();
  });

  it('renderiza multiplos eventos', () => {
    const eventos = [
      fixture({ slug: 'a', descricao: 'Primeiro' }),
      fixture({
        slug: 'b',
        descricao: 'Segundo',
        criado_em: '2026-05-15T10:00:00-03:00',
      }),
    ];
    const { getByText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(getByText('Primeiro')).toBeTruthy();
    expect(getByText('Segundo')).toBeTruthy();
  });

  it('nao renderiza slideshow quando nenhum evento tem foto', () => {
    const eventos = [fixture()];
    const { queryByLabelText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    expect(queryByLabelText('pausar slideshow')).toBeNull();
    expect(queryByLabelText('retomar slideshow')).toBeNull();
  });

  it('renderiza slideshow quando ha pelo menos uma foto', () => {
    const eventos = [
      fixture({
        midias: [{ tipo: 'foto', path: 'jpg/foto-1.jpg' }],
      }),
    ];
    const { getByLabelText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    // Estado inicial = nao pausado -> label "pausar slideshow".
    expect(getByLabelText('pausar slideshow')).toBeTruthy();
  });

  it('tap no slideshow alterna pause/retomar', () => {
    const eventos = [
      fixture({
        midias: [{ tipo: 'foto', path: 'jpg/foto-1.jpg' }],
      }),
    ];
    const { getByLabelText } = render(
      <RecapContador eventos={eventos} vaultRoot="content://x" />
    );
    const slide = getByLabelText('pausar slideshow');
    fireEvent.press(slide);
    expect(getByLabelText('retomar slideshow')).toBeTruthy();
  });
});
