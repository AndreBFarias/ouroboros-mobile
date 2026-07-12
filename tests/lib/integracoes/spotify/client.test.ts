// Testes do client Spotify Web API (R-INT-4).
// Mocka global.fetch e testa:
//   - getNowPlaying: status 204 -> null; item null -> null; 401 ->
//     SpotifyTokenExpiradoError; sucesso -> track parsed.
//   - getRecentlyPlayed: limit clamp; lista de tracks.
//   - getTopTracks: range query param; lista de tracks.
//
// Comentarios sem acento.
import {
  getNowPlaying,
  getRecentlyPlayed,
  getTopTracks,
  SpotifyTokenExpiradoError,
} from '@/lib/integracoes/spotify/client';

const TRACK_FAKE = {
  id: 't1',
  name: 'Some Track',
  artists: [{ name: 'Some Artist', id: 'a1' }],
  album: { name: 'Some Album', images: [{ url: 'https://x/y.jpg' }] },
  duration_ms: 200_000,
  external_urls: { spotify: 'https://open.spotify.com/track/t1' },
};

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('getNowPlaying', () => {
  test('status 204 devolve null', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 204,
    } as unknown as Response);
    const r = await getNowPlaying('tok');
    expect(r).toBeNull();
  });

  test('item null devolve null', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ item: null, is_playing: false }),
    } as unknown as Response);
    const r = await getNowPlaying('tok');
    expect(r).toBeNull();
  });

  test('sucesso devolve track parsed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        item: TRACK_FAKE,
        is_playing: true,
        progress_ms: 12345,
      }),
    } as unknown as Response);
    const r = await getNowPlaying('tok');
    expect(r).not.toBeNull();
    expect(r?.name).toBe('Some Track');
    expect(r?.artists[0]?.name).toBe('Some Artist');
  });

  test('401 lanca SpotifyTokenExpiradoError', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as unknown as Response);
    await expect(getNowPlaying('tok')).rejects.toBeInstanceOf(
      SpotifyTokenExpiradoError
    );
  });

  test('Bearer header enviado corretamente', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 204,
    } as unknown as Response);
    await getNowPlaying('my-token-xyz');
    const [, init] = spy.mock.calls[0]!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer my-token-xyz');
  });
});

describe('getRecentlyPlayed', () => {
  test('devolve lista de tracks', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          { track: TRACK_FAKE, played_at: '2026-01-01T00:00:00Z' },
          { track: { ...TRACK_FAKE, id: 't2', name: 'Other Track' } },
        ],
      }),
    } as unknown as Response);
    const r = await getRecentlyPlayed('tok');
    expect(r).toHaveLength(2);
    expect(r[0]?.name).toBe('Some Track');
    expect(r[1]?.name).toBe('Other Track');
  });

  test('limit clamp em 1..50', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as unknown as Response);
    await getRecentlyPlayed('tok', 999);
    const [url] = spy.mock.calls[0]!;
    expect(url).toContain('limit=50');
  });

  test('items vazio devolve array vazio', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as unknown as Response);
    const r = await getRecentlyPlayed('tok');
    expect(r).toEqual([]);
  });
});

describe('getTopTracks', () => {
  test('range default e short_term', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [TRACK_FAKE] }),
    } as unknown as Response);
    await getTopTracks('tok');
    const [url] = spy.mock.calls[0]!;
    expect(url).toContain('time_range=short_term');
  });

  test('range custom propagado pra URL', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as unknown as Response);
    await getTopTracks('tok', 'long_term', 5);
    const [url] = spy.mock.calls[0]!;
    expect(url).toContain('time_range=long_term');
    expect(url).toContain('limit=5');
  });

  test('401 propaga SpotifyTokenExpiradoError', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as unknown as Response);
    await expect(getTopTracks('tok')).rejects.toBeInstanceOf(
      SpotifyTokenExpiradoError
    );
  });
});
