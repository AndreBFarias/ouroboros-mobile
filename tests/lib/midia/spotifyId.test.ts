// Testes da extracao de track_id do Spotify (M07.x). Cobre URL
// canonica, com query string ?si=... e com prefixo de regiao.
import { extractSpotifyTrackId } from '@/lib/midia/spotifyId';

describe('extractSpotifyTrackId', () => {
  it('extrai track_id de URL canonica', () => {
    expect(
      extractSpotifyTrackId(
        'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv'
      )
    ).toBe('4u7EnebtmKWzUH433cf5Qv');
  });

  it('extrai track_id ignorando query string ?si=', () => {
    expect(
      extractSpotifyTrackId(
        'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv?si=abcdef'
      )
    ).toBe('4u7EnebtmKWzUH433cf5Qv');
  });

  it('extrai track_id com prefixo de regiao intl-pt', () => {
    expect(
      extractSpotifyTrackId(
        'https://open.spotify.com/intl-pt/track/4u7EnebtmKWzUH433cf5Qv'
      )
    ).toBe('4u7EnebtmKWzUH433cf5Qv');
  });

  it('rejeita link de album', () => {
    expect(
      extractSpotifyTrackId('https://open.spotify.com/album/abc123')
    ).toBeNull();
  });

  it('rejeita link nao-spotify', () => {
    expect(extractSpotifyTrackId('https://music.youtube.com/abc')).toBeNull();
  });

  it('retorna null para string vazia', () => {
    expect(extractSpotifyTrackId('')).toBeNull();
  });

  it('retorna null para input nao-string', () => {
    expect(extractSpotifyTrackId(null as unknown as string)).toBeNull();
  });
});
