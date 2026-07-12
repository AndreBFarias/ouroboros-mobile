// Testes do MidiaSpotifyTab (R-INT-4-SPOTIFY-PICKER).
//
// Cobre os dois caminhos do modelo "Google Fotos":
//   - Conectado: carrega a biblioteca, renderiza as faixas e ao tocar
//     uma faixa chama onAdd com a MidiaSpotify correspondente.
//   - Conectado + lista vazia: mostra a mensagem de vazio e o input.
//   - Desconectado: mostra CTA "Conectar Spotify" (navega para
//     Integracoes) e mantem o input de URL.
//   - URL: o fluxo de colar link continua funcionando (regex + onAdd).
//
// Mocka o store useSpotifyAuth (seletor), biblioteca e expo-router.
// Comentarios sem acento.

let mockConta = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  expiraEm: 0,
  ultimaConexao: 0,
  invalido: false,
  scope: null as string | null,
};

jest.mock('@/lib/integracoes/spotify/store', () => ({
  __esModule: true,
  useSpotifyAuth: <T,>(sel: (s: { conta: typeof mockConta }) => T): T =>
    sel({ conta: mockConta }),
}));

const mockListarFaixas = jest.fn();
jest.mock('@/lib/integracoes/spotify/biblioteca', () => ({
  __esModule: true,
  listarFaixasParaPicker: () => mockListarFaixas(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { ToastProvider } from '@/components/ui';
import { MidiaSpotifyTab } from '@/components/midia/MidiaSpotifyTab';
import type { MidiaSpotify } from '@/lib/schemas/midia';

function conectada() {
  mockConta = {
    accessToken: 'tok',
    refreshToken: 'ref',
    expiraEm: Date.now() + 3600_000,
    ultimaConexao: Date.now(),
    invalido: false,
    scope: 'user-read-recently-played',
  };
}

function desconectada() {
  mockConta = {
    accessToken: null,
    refreshToken: null,
    expiraEm: 0,
    ultimaConexao: 0,
    invalido: false,
    scope: null,
  };
}

function renderTab(onAdd: (m: MidiaSpotify) => void) {
  return render(
    <ToastProvider>
      <MidiaSpotifyTab onAdd={onAdd} />
    </ToastProvider>
  );
}

beforeAll(() => {
  // fetch para o fluxo oEmbed (URL). 200 vazio = midia minima.
  // @ts-expect-error -- global de teste
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  );
});

beforeEach(() => {
  jest.clearAllMocks();
  desconectada();
});

describe('MidiaSpotifyTab conectado', () => {
  test('renderiza a lista da biblioteca e seleciona uma faixa', async () => {
    conectada();
    mockListarFaixas.mockResolvedValueOnce([
      {
        track_id: 'abc',
        titulo: 'Faixa Teste',
        artista: 'Artista X',
        url: 'https://open.spotify.com/track/abc',
        capa: 'https://x/abc.jpg',
      },
    ]);
    const onAdd = jest.fn();
    const { getByLabelText } = renderTab(onAdd);

    await waitFor(() => getByLabelText('faixa Faixa Teste'));
    fireEvent.press(getByLabelText('faixa Faixa Teste'));

    expect(onAdd).toHaveBeenCalledWith({
      tipo: 'spotify',
      track_id: 'abc',
      titulo: 'Faixa Teste',
      artista: 'Artista X',
    });
  });

  test('lista vazia mostra mensagem e mantem o input de URL', async () => {
    conectada();
    mockListarFaixas.mockResolvedValueOnce([]);
    const { getByLabelText } = renderTab(jest.fn());

    await waitFor(() => getByLabelText('biblioteca spotify vazia'));
    // Input de URL continua disponivel como alternativa.
    expect(getByLabelText('campo link spotify')).toBeTruthy();
  });
});

describe('MidiaSpotifyTab desconectado', () => {
  test('mostra CTA Conectar Spotify e navega para Integracoes', async () => {
    desconectada();
    const { getByLabelText, queryByLabelText } = renderTab(jest.fn());

    // CTA presente, biblioteca ausente.
    expect(getByLabelText('conectar spotify')).toBeTruthy();
    expect(queryByLabelText('biblioteca spotify')).toBeNull();

    fireEvent.press(getByLabelText('conectar spotify'));
    expect(mockPush).toHaveBeenCalledWith('/settings/integracoes');
    expect(mockListarFaixas).not.toHaveBeenCalled();
  });

  test('input de URL continua emitindo MidiaSpotify via colar link', async () => {
    desconectada();
    const onAdd = jest.fn();
    const { getByLabelText } = renderTab(onAdd);

    fireEvent.changeText(
      getByLabelText('campo link spotify'),
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
    );
    fireEvent.press(getByLabelText('Adicionar'));

    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'spotify',
          track_id: '4iV5W9uYEdYUVa79Axb7Rh',
        })
      )
    );
  });
});
