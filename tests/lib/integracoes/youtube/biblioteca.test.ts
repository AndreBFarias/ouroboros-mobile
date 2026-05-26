// Testes de youtube/biblioteca.ts (R-INT-4-YOUTUBE-PICKER). Mocka o
// client (getLiked/getWatchLater) e cobre:
//   - agrega Liked + Watch Later em VideoPicker[].
//   - dedup por video_id (Liked tem prioridade).
//   - sem token -> lista vazia (nao chama o client).
//   - Watch Later indisponivel (403) -> trata como vazio.
//   - erro de rede -> lista vazia.
//   - cache curto por token (segunda chamada nao refaz fetch).
//
// Comentarios sem acento.
import {
  listarVideosParaPicker,
  limparCacheBiblioteca,
} from '@/lib/integracoes/youtube/biblioteca';
import {
  getLiked,
  getWatchLater,
  YouTubeWatchLaterIndisponivelError,
  type YouTubeVideo,
} from '@/lib/integracoes/youtube/client';

jest.mock('@/lib/integracoes/youtube/client', () => {
  const real = jest.requireActual('@/lib/integracoes/youtube/client');
  return {
    __esModule: true,
    ...real,
    getLiked: jest.fn(),
    getWatchLater: jest.fn(),
  };
});

const mockGetLiked = getLiked as jest.MockedFunction<typeof getLiked>;
const mockGetWatchLater = getWatchLater as jest.MockedFunction<
  typeof getWatchLater
>;

function video(id: string, title: string, canal: string | null): YouTubeVideo {
  return {
    videoId: id,
    title,
    channelTitle: canal,
    publishedAt: '2026-01-01T00:00:00Z',
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  limparCacheBiblioteca();
});

describe('listarVideosParaPicker', () => {
  test('sem token devolve lista vazia e nao chama o client', async () => {
    const r = await listarVideosParaPicker(null);
    expect(r).toEqual([]);
    expect(mockGetLiked).not.toHaveBeenCalled();
    expect(mockGetWatchLater).not.toHaveBeenCalled();
  });

  test('token vazio devolve lista vazia', async () => {
    const r = await listarVideosParaPicker('');
    expect(r).toEqual([]);
    expect(mockGetLiked).not.toHaveBeenCalled();
  });

  test('agrega Liked + Watch Later mapeando para VideoPicker', async () => {
    mockGetLiked.mockResolvedValue([video('a', 'Liked A', 'Canal A')]);
    mockGetWatchLater.mockResolvedValue([video('b', 'WL B', 'Canal B')]);

    const r = await listarVideosParaPicker('tok');

    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      video_id: 'a',
      titulo: 'Liked A',
      canal: 'Canal A',
      url: 'https://www.youtube.com/watch?v=a',
      thumb: 'https://i.ytimg.com/vi/a/hqdefault.jpg',
    });
    expect(r[1]?.video_id).toBe('b');
  });

  test('dedup por video_id com Liked prioritario', async () => {
    mockGetLiked.mockResolvedValue([video('dup', 'Do Liked', 'Canal Liked')]);
    mockGetWatchLater.mockResolvedValue([
      video('dup', 'Do WL', 'Canal WL'),
      video('x', 'Outro', 'Canal X'),
    ]);

    const r = await listarVideosParaPicker('tok');

    expect(r).toHaveLength(2);
    const dup = r.find((v) => v.video_id === 'dup');
    expect(dup?.titulo).toBe('Do Liked');
    expect(r.some((v) => v.video_id === 'x')).toBe(true);
  });

  test('Watch Later indisponivel (403) vira vazio sem derrubar Liked', async () => {
    mockGetLiked.mockResolvedValue([video('a', 'Liked A', 'Canal A')]);
    mockGetWatchLater.mockRejectedValue(
      new YouTubeWatchLaterIndisponivelError()
    );

    const r = await listarVideosParaPicker('tok');

    expect(r).toHaveLength(1);
    expect(r[0]?.video_id).toBe('a');
  });

  test('erro de rede em qualquer fonte vira vazio', async () => {
    mockGetLiked.mockRejectedValue(new Error('timeout'));
    mockGetWatchLater.mockRejectedValue(new Error('timeout'));

    const r = await listarVideosParaPicker('tok');

    expect(r).toEqual([]);
  });

  test('thumb cai na CDN quando o client nao trouxe thumbnailUrl', async () => {
    mockGetLiked.mockResolvedValue([
      { ...video('z', 'Sem thumb', 'Canal Z'), thumbnailUrl: null },
    ]);
    mockGetWatchLater.mockResolvedValue([]);

    const r = await listarVideosParaPicker('tok');

    expect(r[0]?.thumb).toBe('https://img.youtube.com/vi/z/hqdefault.jpg');
  });

  test('cache curto: segunda chamada com mesmo token nao refaz fetch', async () => {
    mockGetLiked.mockResolvedValue([video('a', 'Liked A', 'Canal A')]);
    mockGetWatchLater.mockResolvedValue([]);

    await listarVideosParaPicker('tok');
    await listarVideosParaPicker('tok');

    expect(mockGetLiked).toHaveBeenCalledTimes(1);
    expect(mockGetWatchLater).toHaveBeenCalledTimes(1);
  });

  test('token diferente invalida o cache (refaz fetch)', async () => {
    mockGetLiked.mockResolvedValue([video('a', 'Liked A', 'Canal A')]);
    mockGetWatchLater.mockResolvedValue([]);

    await listarVideosParaPicker('tok1');
    await listarVideosParaPicker('tok2');

    expect(mockGetLiked).toHaveBeenCalledTimes(2);
  });
});
