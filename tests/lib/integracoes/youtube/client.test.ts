// Testes do client YouTube Data API v3 (R-INT-4).
// Cobre:
//   - getLiked: lista de videos da playlist LL.
//   - getWatchLater: lista de videos da playlist WL.
//   - 401 -> YouTubeTokenExpiradoError.
//   - 403 em WL -> YouTubeWatchLaterIndisponivelError.
//   - flatten: thumbnail HQ preferida; channelTitle fallback.
//
// Comentarios sem acento.
import {
  getLiked,
  getWatchLater,
  YouTubeTokenExpiradoError,
  YouTubeWatchLaterIndisponivelError,
} from '@/lib/integracoes/youtube/client';

function fakePlaylistItem(id: string, title: string) {
  return {
    id: `item-${id}`,
    snippet: {
      title,
      videoOwnerChannelTitle: 'Canal Owner',
      channelTitle: 'Canal Fallback',
      publishedAt: '2026-01-01T00:00:00Z',
      thumbnails: {
        default: { url: 'https://i.ytimg.com/vi/x/default.jpg' },
        medium: { url: 'https://i.ytimg.com/vi/x/medium.jpg' },
        high: { url: 'https://i.ytimg.com/vi/x/high.jpg' },
      },
    },
    contentDetails: {
      videoId: id,
      videoPublishedAt: '2026-01-01T00:00:00Z',
    },
  };
}

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('getLiked', () => {
  test('devolve lista de videos com shape canonico', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [fakePlaylistItem('v1', 'Video 1'), fakePlaylistItem('v2', 'Video 2')],
      }),
    } as unknown as Response);
    const r = await getLiked('tok');
    expect(r).toHaveLength(2);
    expect(r[0]?.videoId).toBe('v1');
    expect(r[0]?.title).toBe('Video 1');
    // Thumbnail HQ preferida sobre medium/default.
    expect(r[0]?.thumbnailUrl).toBe('https://i.ytimg.com/vi/x/high.jpg');
    // channelTitle vem do videoOwnerChannelTitle se presente.
    expect(r[0]?.channelTitle).toBe('Canal Owner');
  });

  test('GET monta path /playlistItems?playlistId=LL', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as unknown as Response);
    await getLiked('tok');
    const [url] = spy.mock.calls[0]!;
    expect(url).toContain('/playlistItems?playlistId=LL');
    expect(url).toContain('part=snippet,contentDetails');
  });

  test('401 lanca YouTubeTokenExpiradoError', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as unknown as Response);
    await expect(getLiked('tok')).rejects.toBeInstanceOf(
      YouTubeTokenExpiradoError
    );
  });

  test('lista vazia devolve array vazio', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as unknown as Response);
    const r = await getLiked('tok');
    expect(r).toEqual([]);
  });

  test('limit clamp aceita maximo 50', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as unknown as Response);
    await getLiked('tok', 999);
    const [url] = spy.mock.calls[0]!;
    expect(url).toContain('maxResults=50');
  });
});

describe('getWatchLater', () => {
  test('GET monta path /playlistItems?playlistId=WL', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as unknown as Response);
    await getWatchLater('tok');
    const [url] = spy.mock.calls[0]!;
    expect(url).toContain('/playlistItems?playlistId=WL');
  });

  test('403 lanca YouTubeWatchLaterIndisponivelError', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'forbidden',
    } as unknown as Response);
    await expect(getWatchLater('tok')).rejects.toBeInstanceOf(
      YouTubeWatchLaterIndisponivelError
    );
  });

  test('401 lanca YouTubeTokenExpiradoError', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as unknown as Response);
    await expect(getWatchLater('tok')).rejects.toBeInstanceOf(
      YouTubeTokenExpiradoError
    );
  });
});

describe('thumbnail fallback', () => {
  test('escolhe medium quando high ausente', async () => {
    const item = fakePlaylistItem('v', 'T');
    delete (item.snippet.thumbnails as Record<string, unknown>).high;
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [item] }),
    } as unknown as Response);
    const r = await getLiked('tok');
    expect(r[0]?.thumbnailUrl).toBe('https://i.ytimg.com/vi/x/medium.jpg');
  });

  test('escolhe default quando high e medium ausentes', async () => {
    const item = fakePlaylistItem('v', 'T');
    const t = item.snippet.thumbnails as Record<string, unknown>;
    delete t.high;
    delete t.medium;
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [item] }),
    } as unknown as Response);
    const r = await getLiked('tok');
    expect(r[0]?.thumbnailUrl).toBe('https://i.ytimg.com/vi/x/default.jpg');
  });

  test('thumbnailUrl null quando todas thumbnails ausentes', async () => {
    const item = fakePlaylistItem('v', 'T');
    delete (item.snippet as Record<string, unknown>).thumbnails;
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [item] }),
    } as unknown as Response);
    const r = await getLiked('tok');
    expect(r[0]?.thumbnailUrl).toBeNull();
  });
});
