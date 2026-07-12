// Testes do MidiaYoutubeTab (R-INT-4-YOUTUBE-PICKER). Cobre os dois
// modos:
//   - Desconectado: input de URL + CTA "Conectar YouTube" que navega
//     para /integracoes; adicionar por link valido emite MidiaYoutube.
//   - Conectado: lista a biblioteca (mock de biblioteca.ts), toque em
//     um video emite MidiaYoutube; atalho "Colar link" alterna para o
//     input de URL.
//
// Comentarios sem acento.
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '@/components/ui';
import { MidiaYoutubeTab } from '@/components/midia/MidiaYoutubeTab';
import type { MidiaYoutube } from '@/lib/schemas/midia';
import type { VideoPicker } from '@/lib/integracoes/youtube/biblioteca';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

// Estado da conta YouTube controlavel por teste.
let mockConta = {
  accessToken: null as string | null,
  invalido: false,
};
const mockRefresh = jest.fn(async () => mockConta.accessToken);
jest.mock('@/lib/integracoes/youtube/store', () => ({
  __esModule: true,
  useYouTubeAuth: <T,>(
    sel: (s: {
      conta: { accessToken: string | null; invalido: boolean };
      refreshIfNeeded: () => Promise<string | null>;
    }) => T
  ): T =>
    sel({
      conta: mockConta,
      refreshIfNeeded: mockRefresh,
    }),
}));

let mockVideos: VideoPicker[] = [];
jest.mock('@/lib/integracoes/youtube/biblioteca', () => ({
  __esModule: true,
  listarVideosParaPicker: jest.fn(async () => mockVideos),
}));

function wrap(onAdd: (m: MidiaYoutube) => void) {
  return render(
    <ToastProvider>
      <MidiaYoutubeTab onAdd={onAdd} />
    </ToastProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConta = { accessToken: null, invalido: false };
  mockVideos = [];
});

describe('MidiaYoutubeTab desconectado', () => {
  test('mostra input de URL e CTA conectar', () => {
    const { getByLabelText, getByText } = wrap(() => undefined);
    expect(getByLabelText('campo link youtube')).toBeTruthy();
    expect(getByText('Conectar YouTube')).toBeTruthy();
  });

  test('CTA conectar navega para /integracoes', () => {
    const { getByText } = wrap(() => undefined);
    fireEvent.press(getByText('Conectar YouTube'));
    expect(mockPush).toHaveBeenCalledWith('/integracoes');
  });

  test('link valido emite MidiaYoutube', () => {
    const onAdd = jest.fn();
    const { getByLabelText, getByText } = wrap(onAdd);
    fireEvent.changeText(
      getByLabelText('campo link youtube'),
      'https://youtube.com/watch?v=abcdefghijk'
    );
    fireEvent.press(getByText('Adicionar'));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'youtube', video_id: 'abcdefghijk' })
    );
  });

  test('link invalido mostra erro e nao emite', () => {
    const onAdd = jest.fn();
    const { getByLabelText, getByText } = wrap(onAdd);
    fireEvent.changeText(getByLabelText('campo link youtube'), 'nao-e-link');
    fireEvent.press(getByText('Adicionar'));
    expect(getByLabelText('erro link youtube')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  test('token invalido tratado como desconectado', () => {
    mockConta = { accessToken: 'tok', invalido: true };
    const { getByText } = wrap(() => undefined);
    expect(getByText('Conectar YouTube')).toBeTruthy();
  });
});

describe('MidiaYoutubeTab conectado', () => {
  beforeEach(() => {
    mockConta = { accessToken: 'tok', invalido: false };
    mockVideos = [
      {
        video_id: 'vid1',
        titulo: 'Primeiro vídeo',
        canal: 'Canal Um',
        url: 'https://www.youtube.com/watch?v=vid1',
        thumb: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
      },
    ];
  });

  test('lista a biblioteca quando conectado', async () => {
    const { getByText } = wrap(() => undefined);
    await waitFor(() => expect(getByText('Primeiro vídeo')).toBeTruthy());
    expect(getByText('Canal Um')).toBeTruthy();
  });

  test('toque em video emite MidiaYoutube preenchida', async () => {
    const onAdd = jest.fn();
    const { getByLabelText } = wrap(onAdd);
    await waitFor(() =>
      expect(getByLabelText('selecionar video Primeiro vídeo')).toBeTruthy()
    );
    fireEvent.press(getByLabelText('selecionar video Primeiro vídeo'));
    expect(onAdd).toHaveBeenCalledWith({
      tipo: 'youtube',
      video_id: 'vid1',
      titulo: 'Primeiro vídeo',
      thumbnail_url: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
    });
  });

  test('biblioteca vazia mostra aviso e nao quebra', async () => {
    mockVideos = [];
    const { getByLabelText } = wrap(() => undefined);
    await waitFor(() =>
      expect(getByLabelText('biblioteca youtube vazia')).toBeTruthy()
    );
  });

  test('atalho "Colar link" alterna para input de URL', async () => {
    const { getByText, getByLabelText } = wrap(() => undefined);
    await waitFor(() => expect(getByText('Colar link')).toBeTruthy());
    fireEvent.press(getByText('Colar link'));
    await waitFor(() =>
      expect(getByLabelText('campo link youtube')).toBeTruthy()
    );
    expect(getByText('Ver minha biblioteca')).toBeTruthy();
  });
});
