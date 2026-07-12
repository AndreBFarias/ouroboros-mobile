// Testes de listarFaixasParaPicker (R-INT-4-SPOTIFY-PICKER).
//
// Cobre:
//   - Sem token (refreshIfNeeded -> null): lista vazia, sem chamar client.
//   - Agrega recently-played + top-tracks, mapeia para FaixaPicker.
//   - Dedup por track_id preservando a primeira ocorrencia (recencia).
//   - Ordem: recently-played antes de top-tracks.
//   - Falha de um endpoint nao derruba o outro (lista parcial).
//
// Mocka client.ts e o store useSpotifyAuth. Comentarios sem acento.

const mockGetRecentlyPlayed = jest.fn();
const mockGetTopTracks = jest.fn();
const mockRefreshIfNeeded = jest.fn();

jest.mock('@/lib/integracoes/spotify/client', () => ({
  __esModule: true,
  getRecentlyPlayed: (...args: unknown[]) => mockGetRecentlyPlayed(...args),
  getTopTracks: (...args: unknown[]) => mockGetTopTracks(...args),
}));

jest.mock('@/lib/integracoes/spotify/store', () => ({
  __esModule: true,
  useSpotifyAuth: {
    getState: () => ({ refreshIfNeeded: mockRefreshIfNeeded }),
  },
}));

import { listarFaixasParaPicker } from '@/lib/integracoes/spotify/biblioteca';

function track(id: string, name: string, artista = 'Artista') {
  return {
    id,
    name,
    artists: [{ name: artista }],
    album: { name: 'Album', images: [{ url: `https://x/${id}.jpg` }] },
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarFaixasParaPicker', () => {
  test('sem token devolve lista vazia e nao chama o client', async () => {
    mockRefreshIfNeeded.mockResolvedValueOnce(null);
    const r = await listarFaixasParaPicker();
    expect(r).toEqual([]);
    expect(mockGetRecentlyPlayed).not.toHaveBeenCalled();
    expect(mockGetTopTracks).not.toHaveBeenCalled();
  });

  test('token vazio devolve lista vazia', async () => {
    mockRefreshIfNeeded.mockResolvedValueOnce('');
    const r = await listarFaixasParaPicker();
    expect(r).toEqual([]);
    expect(mockGetRecentlyPlayed).not.toHaveBeenCalled();
  });

  test('agrega recently-played e top-tracks no shape FaixaPicker', async () => {
    mockRefreshIfNeeded.mockResolvedValueOnce('tok');
    mockGetRecentlyPlayed.mockResolvedValueOnce([track('a', 'Recente A')]);
    mockGetTopTracks.mockResolvedValueOnce([track('b', 'Top B')]);

    const r = await listarFaixasParaPicker();

    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      track_id: 'a',
      titulo: 'Recente A',
      artista: 'Artista',
      album: 'Album',
      url: 'https://open.spotify.com/track/a',
      capa: 'https://x/a.jpg',
    });
    expect(r[1].track_id).toBe('b');
  });

  test('recently-played vem antes de top-tracks', async () => {
    mockRefreshIfNeeded.mockResolvedValueOnce('tok');
    mockGetRecentlyPlayed.mockResolvedValueOnce([
      track('r1', 'R1'),
      track('r2', 'R2'),
    ]);
    mockGetTopTracks.mockResolvedValueOnce([track('t1', 'T1')]);

    const r = await listarFaixasParaPicker();
    expect(r.map((f) => f.track_id)).toEqual(['r1', 'r2', 't1']);
  });

  test('dedup por track_id mantem a primeira ocorrencia (recencia)', async () => {
    mockRefreshIfNeeded.mockResolvedValueOnce('tok');
    // 'dup' aparece em recently-played (titulo recente) e em top-tracks.
    mockGetRecentlyPlayed.mockResolvedValueOnce([track('dup', 'Versao Recente')]);
    mockGetTopTracks.mockResolvedValueOnce([
      track('dup', 'Versao Top'),
      track('outro', 'Outro'),
    ]);

    const r = await listarFaixasParaPicker();
    expect(r).toHaveLength(2);
    const dup = r.find((f) => f.track_id === 'dup');
    expect(dup?.titulo).toBe('Versao Recente');
  });

  test('artistas multiplos viram string separada por virgula', async () => {
    mockRefreshIfNeeded.mockResolvedValueOnce('tok');
    mockGetRecentlyPlayed.mockResolvedValueOnce([
      {
        id: 'm',
        name: 'Multi',
        artists: [{ name: 'A' }, { name: 'B' }],
      },
    ]);
    mockGetTopTracks.mockResolvedValueOnce([]);

    const r = await listarFaixasParaPicker();
    expect(r[0].artista).toBe('A, B');
    // Sem album/capa/url opcionais nao incluidos no shape.
    expect(r[0].album).toBeUndefined();
    expect(r[0].capa).toBeUndefined();
    expect(r[0].url).toBeUndefined();
  });

  test('falha de recently-played nao derruba top-tracks', async () => {
    mockRefreshIfNeeded.mockResolvedValueOnce('tok');
    mockGetRecentlyPlayed.mockRejectedValueOnce(new Error('rede'));
    mockGetTopTracks.mockResolvedValueOnce([track('ok', 'OK')]);

    const r = await listarFaixasParaPicker();
    expect(r).toHaveLength(1);
    expect(r[0].track_id).toBe('ok');
  });

  test('ambos endpoints falhando devolve lista vazia', async () => {
    mockRefreshIfNeeded.mockResolvedValueOnce('tok');
    mockGetRecentlyPlayed.mockRejectedValueOnce(new Error('rede'));
    mockGetTopTracks.mockRejectedValueOnce(new Error('rede'));

    const r = await listarFaixasParaPicker();
    expect(r).toEqual([]);
  });
});
