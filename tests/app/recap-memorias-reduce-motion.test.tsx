// R-AUDIT-A11Y-MOVIMENTO (2026-07-13): prova o gate de reduce-motion nos
// DOIS effects de /recap-memorias (spec §3.4.2):
//   - auto-avanco: com reduce-motion NAO arma o setTimeout;
//   - barra de progresso (GAP CRITICO do 9c): com reduce-motion a barra
//     NAO corre (progressoBarra.value fica 0), em vez de correr 0->1
//     enquanto o slide fica congelado.
//
// Harness espelha recap-memorias-loop-regression.test.tsx (mesmos mocks
// de router/useRecap/useRecapMemorias/expo-av/view-shot). Aqui mockamos
// tambem useReduceMotion (controle do booleano) e BarraProgresso (para
// capturar o shared value progressoBarra e ler seu .value apos os
// effects). O mock de reanimated deixa withTiming(toValue) retornar
// toValue, entao value==1 quando a barra corre e value==0 quando o gate
// bloqueia.
//
// Comentarios sem acento (convencao shell/CI).
import { act, render } from '@testing-library/react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ back: mockBack, replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

// Controle do reduce-motion no teste.
const mockUseReduceMotion = jest.fn();
jest.mock('@/lib/hooks/useReduceMotion', () => ({
  __esModule: true,
  useReduceMotion: () => mockUseReduceMotion(),
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

jest.mock('@/lib/stores/settings', () => ({
  __esModule: true,
  useSettings: (selector: (s: unknown) => unknown) =>
    selector({
      recap: { slideshowIntervaloS: 4 },
      featureToggles: {
        recapAmbientAudio: false,
        recapAudioAnexadoAutoplay: true,
        recapMusicaFundo: false,
      },
      setFeatureToggle: () => undefined,
    }),
}));

// Captura o shared value progressoBarra (passado a TODAS as barras; e' o
// mesmo objeto). Ler .value apos os effects revela se a barra correu.
const progressosCapturados: Array<{ value: number }> = [];
jest.mock('@/components/recap/BarraProgresso', () => ({
  __esModule: true,
  BarraProgresso: (props: { progresso: { value: number } }) => {
    progressosCapturados.push(props.progresso);
    return null;
  },
  escalaDe: jest.fn(),
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

describe('recap-memorias reduce-motion (R-AUDIT-A11Y-MOVIMENTO)', () => {
  beforeEach(() => {
    progressosCapturados.length = 0;
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  it('sem reduce-motion a barra CORRE (progressoBarra.value chega a 1)', () => {
    mockUseReduceMotion.mockReturnValue(false);
    renderTela();
    expect(progressosCapturados.length).toBeGreaterThanOrEqual(1);
    // withTiming(1) no mock retorna 1: a barra do slide ativo correu.
    expect(progressosCapturados[0].value).toBe(1);
  });

  it('com reduce-motion a barra NAO corre (progressoBarra.value fica 0)', () => {
    // GAP CRITICO: sem o gate, a barra correria 0->1 com o slide
    // congelado. Com o gate, o effect so reseta a 0 e nao chama withTiming.
    mockUseReduceMotion.mockReturnValue(true);
    renderTela();
    expect(progressosCapturados.length).toBeGreaterThanOrEqual(1);
    expect(progressosCapturados[0].value).toBe(0);
  });

  it('com reduce-motion o auto-avanco NAO arma timer (nenhum pendente)', () => {
    mockUseReduceMotion.mockReturnValue(true);
    renderTela();
    // O unico setTimeout de auto-avanco nao e' armado sob reduce-motion.
    // (audio/fade usam Promise, nao timers; getTimerCount reflete o
    // auto-avanco). Sem reduce-motion haveria 1 timer pendente.
    expect(jest.getTimerCount()).toBe(0);
  });

  it('sem reduce-motion o auto-avanco arma timer (controle)', () => {
    mockUseReduceMotion.mockReturnValue(false);
    renderTela();
    expect(jest.getTimerCount()).toBeGreaterThanOrEqual(1);
  });
});
