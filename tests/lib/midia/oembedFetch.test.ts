// Tests do wrapper oembedFetch (R-MEDIA-1). Cobre:
//   - Cache hit: nao chama rede.
//   - Cache miss: chama fetch, popula cache, devolve dados.
//   - Fetch retorna null (timeout / status nao-200 / rede): devolve null
//     e nao popula cache.
//   - URL invalida: retorna null sem efeitos colaterais.

const mockGetCached = jest.fn();
const mockSetCached = jest.fn();
const mockFetchOembed = jest.fn();

jest.mock('@/lib/cache/oembedCache', () => ({
  __esModule: true,
  getOembedCached: (...args: unknown[]) => mockGetCached(...args),
  setOembedCached: (...args: unknown[]) => mockSetCached(...args),
}));

jest.mock('@/lib/midia/oembedClient', () => ({
  __esModule: true,
  fetchOembed: (...args: unknown[]) => mockFetchOembed(...args),
  detectarServico: jest.fn(),
}));

import { obterOembed } from '@/lib/midia/oembedFetch';
import type { OembedData } from '@/lib/midia/oembedSchema';

const URL_YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const DADO: OembedData = {
  title: 'Never Gonna Give You Up',
  thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  author_name: 'Rick Astley',
  provider_name: 'YouTube',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('obterOembed', () => {
  it('cache hit: devolve cache e nao chama rede', async () => {
    mockGetCached.mockResolvedValueOnce(DADO);
    const r = await obterOembed(URL_YT);
    expect(r).toEqual(DADO);
    expect(mockFetchOembed).not.toHaveBeenCalled();
    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it('cache miss: chama fetch, popula cache, devolve dados', async () => {
    mockGetCached.mockResolvedValueOnce(null);
    mockFetchOembed.mockResolvedValueOnce(DADO);
    const r = await obterOembed(URL_YT);
    expect(r).toEqual(DADO);
    expect(mockFetchOembed).toHaveBeenCalledWith(URL_YT);
    expect(mockSetCached).toHaveBeenCalledWith(URL_YT, DADO);
  });

  it('cache miss + fetch null: devolve null e nao popula cache', async () => {
    mockGetCached.mockResolvedValueOnce(null);
    mockFetchOembed.mockResolvedValueOnce(null);
    const r = await obterOembed(URL_YT);
    expect(r).toBeNull();
    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it('URL vazia: devolve null sem tocar cache/rede', async () => {
    const r = await obterOembed('');
    expect(r).toBeNull();
    expect(mockGetCached).not.toHaveBeenCalled();
    expect(mockFetchOembed).not.toHaveBeenCalled();
  });

  it('URL nao-string: devolve null defensivamente', async () => {
    // @ts-expect-error -- runtime check
    const r = await obterOembed(null);
    expect(r).toBeNull();
  });
});
