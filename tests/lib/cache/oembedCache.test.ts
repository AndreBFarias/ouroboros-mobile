// Tests do cache persistente de oEmbed (R-MEDIA-1).
//
// Cobre:
//   - Round-trip set/get com entrada valida.
//   - getOembedCached devolve null quando arquivo nao existe.
//   - TTL 7d: entradas mais velhas viram null.
//   - JSON malformado retorna null sem lancar.
//   - Filtro sync-conflict ignorado pelo nome do arquivo (FNV hash
//     nao gera nome com `.sync-conflict-`, mas o getOembedCached
//     filtra qualquer match defensivamente).
//   - cacheDirectory null (web/SSR): get devolve null, set no-op.
//   - Hash FNV-1a deterministico.

const mockGetInfoAsync = jest.fn();
const mockReadAsStringAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();
let mockCacheDirectory: string | null = 'file:///tmp/cache/';

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  get cacheDirectory() {
    return mockCacheDirectory;
  },
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
}));

import {
  getOembedCached,
  setOembedCached,
  __test,
} from '@/lib/cache/oembedCache';
import type { OembedData } from '@/lib/midia/oembedSchema';

const URL_YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const DADO_VALIDO: OembedData = {
  title: 'Never Gonna Give You Up',
  thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  author_name: 'Rick Astley',
  provider_name: 'YouTube',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheDirectory = 'file:///tmp/cache/';
});

describe('hash FNV-1a', () => {
  it('e deterministico para a mesma URL', () => {
    expect(__test.hashUrl(URL_YT)).toBe(__test.hashUrl(URL_YT));
  });

  it('produz hashes diferentes para URLs diferentes', () => {
    const a = __test.hashUrl(URL_YT);
    const b = __test.hashUrl('https://open.spotify.com/track/abc');
    expect(a).not.toBe(b);
  });

  it('produz 8 caracteres hex', () => {
    const h = __test.hashUrl(URL_YT);
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('getOembedCached', () => {
  it('retorna entrada valida dentro do TTL', async () => {
    const agora = new Date().toISOString();
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce(
      JSON.stringify({ cachedAt: agora, data: DADO_VALIDO })
    );
    const r = await getOembedCached(URL_YT);
    expect(r).not.toBeNull();
    expect(r?.title).toBe('Never Gonna Give You Up');
  });

  it('retorna null quando arquivo nao existe', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });
    const r = await getOembedCached(URL_YT);
    expect(r).toBeNull();
    expect(mockReadAsStringAsync).not.toHaveBeenCalled();
  });

  it('retorna null para entrada expirada (TTL 7d)', async () => {
    // 8 dias atras.
    const velho = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce(
      JSON.stringify({ cachedAt: velho, data: DADO_VALIDO })
    );
    const r = await getOembedCached(URL_YT);
    expect(r).toBeNull();
  });

  it('aceita entrada com 6 dias (dentro do TTL)', async () => {
    const seis = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce(
      JSON.stringify({ cachedAt: seis, data: DADO_VALIDO })
    );
    const r = await getOembedCached(URL_YT);
    expect(r).not.toBeNull();
  });

  it('retorna null para JSON malformado', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce('{ invalido');
    const r = await getOembedCached(URL_YT);
    expect(r).toBeNull();
  });

  it('retorna null para envelope sem campos obrigatorios', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce(
      JSON.stringify({ foo: 'bar' })
    );
    const r = await getOembedCached(URL_YT);
    expect(r).toBeNull();
  });

  it('retorna null para data que falha no schema Zod', async () => {
    const agora = new Date().toISOString();
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce(
      JSON.stringify({ cachedAt: agora, data: { title: '' } })
    );
    const r = await getOembedCached(URL_YT);
    expect(r).toBeNull();
  });

  it('retorna null quando cacheDirectory e null (web/SSR)', async () => {
    mockCacheDirectory = null;
    const r = await getOembedCached(URL_YT);
    expect(r).toBeNull();
    expect(mockGetInfoAsync).not.toHaveBeenCalled();
  });

  it('retorna null para URL vazia ou nao string', async () => {
    expect(await getOembedCached('')).toBeNull();
    // @ts-expect-error -- runtime check
    expect(await getOembedCached(null)).toBeNull();
  });
});

describe('setOembedCached', () => {
  it('escreve entrada com cachedAt ISO + data', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockWriteAsStringAsync.mockResolvedValueOnce(undefined);
    await setOembedCached(URL_YT, DADO_VALIDO);
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [path, payload] = mockWriteAsStringAsync.mock.calls[0];
    expect(path).toMatch(/oembed\/[0-9a-f]{8}\.json$/);
    const parsed = JSON.parse(payload as string);
    expect(parsed.data).toEqual(DADO_VALIDO);
    expect(parsed.cachedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('cria subdiretorio se nao existir', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });
    mockMakeDirectoryAsync.mockResolvedValueOnce(undefined);
    mockWriteAsStringAsync.mockResolvedValueOnce(undefined);
    await setOembedCached(URL_YT, DADO_VALIDO);
    expect(mockMakeDirectoryAsync).toHaveBeenCalledWith(
      expect.stringMatching(/oembed\/$/),
      { intermediates: true }
    );
  });

  it('e no-op quando cacheDirectory e null', async () => {
    mockCacheDirectory = null;
    await setOembedCached(URL_YT, DADO_VALIDO);
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });

  it('engole erro de I/O sem lancar', async () => {
    mockGetInfoAsync.mockRejectedValueOnce(new Error('disk full'));
    // Nao lanca; cobertura via promise resolve.
    await expect(setOembedCached(URL_YT, DADO_VALIDO)).resolves.toBeUndefined();
  });

  it('e no-op para URL vazia', async () => {
    await setOembedCached('', DADO_VALIDO);
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });
});

describe('round-trip set/get', () => {
  it('grava e le a mesma entrada', async () => {
    // Set
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockWriteAsStringAsync.mockResolvedValueOnce(undefined);
    await setOembedCached(URL_YT, DADO_VALIDO);

    const payload = mockWriteAsStringAsync.mock.calls[0][1] as string;

    // Get devolve o mesmo payload.
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce(payload);
    const r = await getOembedCached(URL_YT);
    expect(r).toEqual(DADO_VALIDO);
  });
});
