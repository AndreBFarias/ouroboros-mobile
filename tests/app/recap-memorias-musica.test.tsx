// R-RECAP-9 (2026-07-11): testes do botao de som do slideshow Memorias.
// Cobre COMPORTAMENTO (nao audio real):
//  - botao de som renderiza no header;
//  - reflete o estado do toggle recapMusicaFundo (Volume2/rotulo
//    "silenciar" quando ligado; VolumeX/rotulo "ativar" quando mudo);
//  - tap alterna o toggle via setFeatureToggle('recapMusicaFundo', !v).
//
// O audio real (faixa toca, fade-in/out, duck do anexado) e' proof-of-
// work Nivel C no device (spec §8) -- coberto pelo orquestrador ao vivo.
//
// Comentarios sem acento (convencao shell/CI).
import { act, fireEvent, render } from '@testing-library/react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ back: mockBack, replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/hooks/useRecap', () => ({
  __esModule: true,
  useRecap: () => ({
    data: {
      humorMedia: 5,
      totalRegistros: 3,
      treinos: 0,
      tarefas: 0,
      vitorias: { contagem: 0, frasePrincipal: null, audioPath: null },
      crises: { contagem: 0, audioPath: null },
      midias: { fotos: 0, audios: 0, videos: 0 },
    },
    loading: false,
  }),
}));

jest.mock('@/lib/hooks/useRecapMemorias', () => ({
  __esModule: true,
  useRecapMemorias: () => [
    { id: 'abertura' },
    { id: 'numeros', registros: 3, treinos: 0, tarefas: 0 },
  ],
}));

// Estado de settings controlavel por teste. Nomes com prefixo `mock`
// para o factory do jest.mock poder referencia-los.
const mockSetFeatureToggle = jest.fn();
let mockMusicaLigada = false;

jest.mock('@/lib/stores/settings', () => ({
  __esModule: true,
  useSettings: (selector: (s: unknown) => unknown) =>
    selector({
      recap: { slideshowIntervaloS: 4 },
      featureToggles: {
        recapAmbientAudio: false,
        recapAudioAnexadoAutoplay: true,
        recapMusicaFundo: mockMusicaLigada,
      },
      setFeatureToggle: mockSetFeatureToggle,
    }),
}));

// Export do share mockado (a tela importa no topo). Nao exercitado aqui.
jest.mock('@/lib/midia/exportarSlideMemorias', () => ({
  __esModule: true,
  exportarSlideMemorias: jest.fn(() =>
    Promise.resolve({ uri: null, motivo: 'web' })
  ),
  compartilharSlidePng: jest.fn(() => Promise.resolve(false)),
  removerSlidePngTemp: jest.fn(() => Promise.resolve(undefined)),
}));

jest.mock(
  'react-native-view-shot',
  () => ({
    __esModule: true,
    captureRef: jest.fn(() => Promise.resolve('file:///tmp/cap.png')),
  }),
  { virtual: true }
);

// expo-av stub: a tela cria instancia de Audio.Sound quando a musica
// esta ligada. Retorna stub com os metodos usados pelos fades.
jest.mock('expo-av', () => ({
  __esModule: true,
  Audio: {
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            playAsync: jest.fn(() => Promise.resolve()),
            stopAsync: jest.fn(() => Promise.resolve()),
            unloadAsync: jest.fn(() => Promise.resolve()),
            setVolumeAsync: jest.fn(() => Promise.resolve()),
          },
        })
      ),
    },
  },
}));

// Haptics: no-op para nao depender de expo-haptics nativo.
jest.mock('@/lib/haptics', () => ({
  __esModule: true,
  haptics: { light: jest.fn(() => Promise.resolve()) },
}));

import RecapMemoriasTela from '../../app/recap-memorias';
import { ToastProvider } from '@/components/ui';

function renderTela() {
  return render(
    <ToastProvider>
      <RecapMemoriasTela />
    </ToastProvider>
  );
}

describe('recap-memorias R-RECAP-9 (botao de som)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMusicaLigada = false;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renderiza o botao de som no header (estado mudo por default do mock)', () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText('ativar musica')).toBeTruthy();
  });

  it('com musica ligada, o rotulo e "silenciar musica"', () => {
    mockMusicaLigada = true;
    const { getByLabelText } = renderTela();
    expect(getByLabelText('silenciar musica')).toBeTruthy();
  });

  it('com musica desligada, o rotulo e "ativar musica"', () => {
    mockMusicaLigada = false;
    const { getByLabelText, queryByLabelText } = renderTela();
    expect(getByLabelText('ativar musica')).toBeTruthy();
    expect(queryByLabelText('silenciar musica')).toBeNull();
  });

  it('tap no botao alterna o toggle recapMusicaFundo (mudo -> ligado)', () => {
    mockMusicaLigada = false;
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('ativar musica'));
    expect(mockSetFeatureToggle).toHaveBeenCalledWith(
      'recapMusicaFundo',
      true
    );
  });

  it('tap no botao alterna o toggle recapMusicaFundo (ligado -> mudo)', () => {
    mockMusicaLigada = true;
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('silenciar musica'));
    expect(mockSetFeatureToggle).toHaveBeenCalledWith(
      'recapMusicaFundo',
      false
    );
  });
});
