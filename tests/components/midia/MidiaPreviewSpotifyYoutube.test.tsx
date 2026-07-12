// Tests do componente MidiaPreviewSpotifyYoutube (R-MEDIA-1).
//
// Cobre:
//   - Render inicial em estado loading com icone do servico.
//   - Render em sucesso com thumbnail, titulo e author_name.
//   - Render em fallback offline (data === null) com logo do servico.
//   - Tap em "Abrir externamente" chama Linking.openURL com a URL.
//   - URL desconhecida devolve null (sem render).
//   - URL Spotify roteia para visual verde + label "Abrir musica
//     no Spotify".
//   - URL YouTube roteia para visual vermelho + label "Abrir video
//     no YouTube".

const mockObterOembed = jest.fn();

jest.mock('@/lib/midia/oembedFetch', () => ({
  __esModule: true,
  obterOembed: (...args: unknown[]) => mockObterOembed(...args),
}));

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { MidiaPreviewSpotifyYoutube } from '@/components/midia/MidiaPreviewSpotifyYoutube';

const URL_YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const URL_SP = 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh';

const DADO_YT = {
  title: 'Never Gonna Give You Up',
  thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  author_name: 'Rick Astley',
  provider_name: 'YouTube',
};

const DADO_SP = {
  title: 'Bohemian Rhapsody',
  thumbnail_url: 'https://i.scdn.co/image/abc.jpg',
  author_name: 'Queen',
  provider_name: 'Spotify',
};

const openURLSpy = jest
  .spyOn(Linking, 'openURL')
  .mockImplementation(() => Promise.resolve());

beforeEach(() => {
  jest.clearAllMocks();
  openURLSpy.mockClear();
});

describe('MidiaPreviewSpotifyYoutube render', () => {
  it('renderiza skeleton enquanto obterOembed esta pendente', () => {
    // Promise que nunca resolve neste tick.
    mockObterOembed.mockReturnValueOnce(new Promise(() => undefined));
    const { getByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_YT} />
    );
    expect(getByLabelText('preview carregando')).toBeTruthy();
  });

  it('renderiza sucesso para URL YouTube com title + author', async () => {
    mockObterOembed.mockResolvedValueOnce(DADO_YT);
    const { getByText, getByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_YT} />
    );
    await waitFor(() => {
      expect(getByLabelText('preview youtube sucesso')).toBeTruthy();
    });
    expect(getByText('Never Gonna Give You Up')).toBeTruthy();
    expect(getByText('Rick Astley')).toBeTruthy();
    expect(getByText('Abrir no YouTube')).toBeTruthy();
  });

  it('renderiza sucesso para URL Spotify com title + author', async () => {
    mockObterOembed.mockResolvedValueOnce(DADO_SP);
    const { getByText, findByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_SP} />
    );
    await findByLabelText('preview spotify sucesso');
    expect(getByText('Bohemian Rhapsody')).toBeTruthy();
    expect(getByText('Queen')).toBeTruthy();
    expect(getByText('Abrir no Spotify')).toBeTruthy();
  });

  it('renderiza fallback offline quando obterOembed devolve null', async () => {
    mockObterOembed.mockResolvedValueOnce(null);
    const { findByLabelText, getByText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_YT} />
    );
    await findByLabelText('preview youtube indisponivel');
    expect(getByText('YouTube')).toBeTruthy();
    expect(getByText('Abrir no YouTube')).toBeTruthy();
  });

  it('renderiza fallback Spotify quando offline', async () => {
    mockObterOembed.mockResolvedValueOnce(null);
    const { findByLabelText, getByText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_SP} />
    );
    await findByLabelText('preview spotify indisponivel');
    expect(getByText('Spotify')).toBeTruthy();
    expect(getByText('Abrir no Spotify')).toBeTruthy();
  });

  it('renderiza null (nada) para URL desconhecida', () => {
    const { toJSON, queryByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url="https://vimeo.com/123" />
    );
    expect(toJSON()).toBeNull();
    expect(queryByLabelText('preview youtube')).toBeNull();
    expect(queryByLabelText('preview spotify')).toBeNull();
  });

  it('omite linha do autor quando author_name esta ausente', async () => {
    const sem = { ...DADO_YT, author_name: undefined };
    mockObterOembed.mockResolvedValueOnce(sem);
    const { findByLabelText, queryByText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_YT} />
    );
    await findByLabelText('preview youtube sucesso');
    expect(queryByText('Rick Astley')).toBeNull();
  });
});

describe('MidiaPreviewSpotifyYoutube interacao', () => {
  it('tap em "Abrir externamente" chama Linking.openURL com URL YouTube', async () => {
    mockObterOembed.mockResolvedValueOnce(DADO_YT);
    const { findByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_YT} />
    );
    const cta = await findByLabelText('Abrir video no YouTube');
    fireEvent.press(cta);
    expect(openURLSpy).toHaveBeenCalledWith(URL_YT);
  });

  it('tap em "Abrir externamente" chama Linking.openURL com URL Spotify', async () => {
    mockObterOembed.mockResolvedValueOnce(DADO_SP);
    const { findByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_SP} />
    );
    const cta = await findByLabelText('Abrir musica no Spotify');
    fireEvent.press(cta);
    expect(openURLSpy).toHaveBeenCalledWith(URL_SP);
  });

  it('CTA funciona mesmo em fallback offline', async () => {
    mockObterOembed.mockResolvedValueOnce(null);
    const { findByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_YT} />
    );
    const cta = await findByLabelText('Abrir video no YouTube');
    fireEvent.press(cta);
    expect(openURLSpy).toHaveBeenCalledWith(URL_YT);
  });
});

describe('MidiaPreviewSpotifyYoutube acessibilidade', () => {
  it('CTA tem accessibilityRole button', async () => {
    mockObterOembed.mockResolvedValueOnce(DADO_YT);
    const { findByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_YT} />
    );
    const cta = await findByLabelText('Abrir video no YouTube');
    expect(cta.props.accessibilityRole).toBe('button');
  });

  it('accessibilityLabel sem acento em ambos servicos', async () => {
    mockObterOembed.mockResolvedValueOnce(DADO_SP);
    const { findByLabelText } = render(
      <MidiaPreviewSpotifyYoutube url={URL_SP} />
    );
    // 'musica' sem acento (screen reader).
    const cta = await findByLabelText('Abrir musica no Spotify');
    expect(cta).toBeTruthy();
  });
});

describe('MidiaPreviewSpotifyYoutube cleanup', () => {
  it('nao atualiza estado apos unmount (cancelado)', async () => {
    let resolve!: (v: unknown) => void;
    mockObterOembed.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    );
    const { unmount } = render(<MidiaPreviewSpotifyYoutube url={URL_YT} />);
    unmount();
    await act(async () => {
      resolve(DADO_YT);
      await Promise.resolve();
    });
    // Sem assert explicito; o teste passa se nao houver warning de
    // "state update on unmounted component".
  });
});
