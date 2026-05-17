// R-RECAP-FIX-LOOP (2026-05-17): regressao para Maximum update depth
// em /recap-memorias.
//
// Causa raiz pre-fix: `hoje = new Date()` e `seteDiasAtras = new
// Date(...)` no top do componente eram recalculados a cada render
// com timestamps ligeiramente diferentes (Date.now() avanca entre
// renders). Quando o caller chegava sem params.de/params.ate, o
// `range.de` e `range.ate` ficavam instaveis -> `useRecap.useEffect`
// re-disparava em deps -> setState -> re-render -> loop.
//
// Fix: memoizar `range` via useMemo([deString, ateString]), garantindo
// que sem params o objeto seja calculado uma so vez por montagem.
//
// O teste verifica que o useRecap recebe exatamente o MESMO objeto
// `range` em rerenders consecutivos quando os params nao mudam.
//
// Comentarios sem acento (convencao shell/CI).
import { act, fireEvent, render } from '@testing-library/react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => {
  return {
    __esModule: true,
    useRouter: () => ({ back: mockBack, replace: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({}),
  };
});

// Captura cada chamada de useRecap para inspecionar a estabilidade do
// objeto range entre renders. O React vai re-renderizar diversas
// vezes ao montar (state inicial + side effects assincronos); cada
// chamada do hook real receberia novo range pre-fix.
const rangesRecebidos: unknown[] = [];

jest.mock('@/lib/hooks/useRecap', () => ({
  __esModule: true,
  useRecap: (range: unknown) => {
    rangesRecebidos.push(range);
    return {
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
    };
  },
}));

jest.mock('@/lib/hooks/useRecapMemorias', () => ({
  __esModule: true,
  useRecapMemorias: () => [
    { id: 'abertura' },
    { id: 'numeros', registros: 3, treinos: 0, tarefas: 0 },
  ],
}));

jest.mock('@/lib/stores/settings', () => ({
  __esModule: true,
  useSettings: (selector: (s: unknown) => unknown) =>
    selector({
      recap: { slideshowIntervaloS: 4 },
      featureToggles: {
        recapAmbientAudio: false,
        recapAudioAnexadoAutoplay: true,
      },
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

jest.mock(
  'react-native-view-shot',
  () => ({
    __esModule: true,
    captureRef: jest.fn(() => Promise.resolve('file:///tmp/cap.png')),
  }),
  { virtual: true }
);

import RecapMemoriasTela from '../../app/recap-memorias';
import { ToastProvider } from '@/components/ui';

function renderTela() {
  return render(
    <ToastProvider>
      <RecapMemoriasTela />
    </ToastProvider>
  );
}

describe('recap-memorias R-RECAP-FIX-LOOP (estabilidade do range)', () => {
  beforeEach(() => {
    rangesRecebidos.length = 0;
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('range entregue ao useRecap mantem identidade entre rerenders sem params', () => {
    const { getByLabelText, rerender } = renderTela();
    // Forca um rerender (tap em pausar muda state interno mas params
    // ficam iguais).
    fireEvent.press(getByLabelText('pausar memorias'));
    rerender(
      <ToastProvider>
        <RecapMemoriasTela />
      </ToastProvider>
    );
    // Espera pelo menos 2 chamadas de useRecap (montagem + rerender).
    expect(rangesRecebidos.length).toBeGreaterThanOrEqual(2);
    // Pre-fix: cada chamada recebia objeto novo com timestamps
    // ligeiramente diferentes. Pos-fix: identidade preservada via
    // useMemo([deString, ateString]).
    const primeiro = rangesRecebidos[0];
    rangesRecebidos.slice(1).forEach((r) => {
      expect(r).toBe(primeiro);
    });
  });

  it('timestamps de range.de e range.ate sao estaveis em tempo real avancando', () => {
    // Avanca Date.now() entre rerenders simulando producao: sem o
    // fix, cada render computaria novo `hoje = new Date()` com ms
    // diferente, gerando timestamps distintos no range.
    jest.setSystemTime(new Date('2026-05-17T03:49:48.254Z').getTime());
    const { rerender } = renderTela();
    jest.setSystemTime(new Date('2026-05-17T03:49:48.350Z').getTime());
    rerender(
      <ToastProvider>
        <RecapMemoriasTela />
      </ToastProvider>
    );
    jest.setSystemTime(new Date('2026-05-17T03:49:48.500Z').getTime());
    rerender(
      <ToastProvider>
        <RecapMemoriasTela />
      </ToastProvider>
    );
    expect(rangesRecebidos.length).toBeGreaterThanOrEqual(2);
    type RangeShape = { de: Date; ate: Date };
    const primeiro = rangesRecebidos[0] as RangeShape;
    const tsDeInicial = primeiro.de.getTime();
    const tsAteInicial = primeiro.ate.getTime();
    rangesRecebidos.slice(1).forEach((r) => {
      const cur = r as RangeShape;
      expect(cur.de.getTime()).toBe(tsDeInicial);
      expect(cur.ate.getTime()).toBe(tsAteInicial);
    });
  });
});
