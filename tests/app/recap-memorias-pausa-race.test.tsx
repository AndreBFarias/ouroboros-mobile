// R-RECAP-9c (2026-07-13): regressao do bug B3 -- pausa espuria por
// closure stale no onPressOut das zonas de tap do slideshow Memorias.
//
// Dois cenarios deterministicos:
//  1. Pausa pelo botao Pause NAO deve ser desfeita por um release
//     (onPressOut) de uma zona de navegacao. Antes do fix, o onPressOut
//     lia `pausado` do closure (true apos o botao) e chamava
//     setPausado(false), desfazendo a pausa deliberada.
//  2. Long-press + release na MESMA leva (sem re-render commitar entre
//     os dois) nao pode deixar o slideshow preso pausado. Antes do fix,
//     o onPressOut via `pausado=false` do render corrente e nao
//     retomava -> ficava travado.
//
// O fix rastreia a pausa por hold num useRef (mutacao sincrona), lido
// no onPressOut em vez do estado do closure.
//
// Comentarios sem acento (convencao shell/CI).
import { act, fireEvent, render } from '@testing-library/react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ back: mockBack, replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

// Slideshow minimo com 3 slides para haver navegacao e auto-advance.
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
    { id: 'encerramento' },
  ],
}));

jest.mock('@/lib/stores/settings', () => ({
  __esModule: true,
  useSettings: (selector: (s: unknown) => unknown) =>
    selector({
      recap: { slideshowIntervaloS: 4 },
      featureToggles: {
        recapAmbientAudio: false,
        recapAudioAnexadoAutoplay: false,
        // Musica de fundo desligada: foco na mecanica de pausa, sem audio.
        recapMusicaFundo: false,
      },
      setFeatureToggle: () => undefined,
    }),
}));

jest.mock('expo-av', () => ({
  __esModule: true,
  Audio: {
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            playAsync: jest.fn(),
            stopAsync: jest.fn(),
            unloadAsync: jest.fn(),
            setVolumeAsync: jest.fn(),
          },
        })
      ),
    },
  },
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

describe('recap-memorias R-RECAP-9c (pausa sem race no onPressOut)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('pausa pelo botao Pause nao e desfeita por um release na zona de tap', () => {
    const { getByLabelText, queryByLabelText } = renderTela();

    // Pausa deliberada pelo botao (label alterna para "retomar memorias").
    fireEvent.press(getByLabelText('pausar memorias'));
    expect(getByLabelText('retomar memorias')).toBeTruthy();

    // Um toque de navegacao (release) NAO deve desfazer a pausa do botao.
    fireEvent(getByLabelText('anterior'), 'pressOut');

    expect(getByLabelText('retomar memorias')).toBeTruthy();
    expect(queryByLabelText('pausar memorias')).toBeNull();
  });

  it('long-press seguido de release imediato nao deixa o slideshow preso pausado', () => {
    const { getByLabelText } = renderTela();

    // Long-press e release na MESMA leva de eventos: reproduz a corrida
    // onde o re-render de setPausado(true) ainda nao commitou quando o
    // onPressOut roda.
    const zona = getByLabelText('proximo');
    act(() => {
      fireEvent(zona, 'longPress');
      fireEvent(zona, 'pressOut');
    });

    // Nao pode ficar travado: o botao volta a exibir "pausar memorias".
    expect(getByLabelText('pausar memorias')).toBeTruthy();
  });

  it('long-press pausa enquanto segura e retoma ao soltar', () => {
    const { getByLabelText } = renderTela();
    const zona = getByLabelText('anterior');

    fireEvent(zona, 'longPress');
    expect(getByLabelText('retomar memorias')).toBeTruthy();

    fireEvent(zona, 'pressOut');
    expect(getByLabelText('pausar memorias')).toBeTruthy();
  });
});
