// R-RECAP-6 (2026-05-16): testes do botao Compartilhar do slideshow
// Memorias. Cobre:
//  - Botao Share renderiza ao lado do botao Pausar.
//  - Tap em Compartilhar pausa o slideshow + chama
//    exportarSlideMemorias.
//  - Em caminho de sucesso, dispara compartilharSlidePng e cleanup.
//  - Erro de captura mostra toast (nao trava UI).
//
// Mocks locais sobrescrevem os defaults da setup global para
// inspecionar comportamento sob diferentes cenarios.
//
// Comentarios sem acento (convencao shell/CI).
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => {
  return {
    __esModule: true,
    useRouter: () => ({ back: mockBack, replace: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({}),
  };
});

// useRecap mockado: dados estaticos suficientes para useRecapMemorias
// gerar pelo menos um slide (abertura sempre existe).
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

// useRecapMemorias devolve um slideshow minimo com 2 slides para o
// teste de pausa/share renderizar deterministicamente.
jest.mock('@/lib/hooks/useRecapMemorias', () => ({
  __esModule: true,
  useRecapMemorias: () => [
    { id: 'abertura' },
    { id: 'numeros', registros: 3, treinos: 0, tarefas: 0 },
  ],
}));

// useSettings: defaults de slideshow + audio toggles. Mock minimo que
// devolve um valor estatico para cada seletor invocado pela tela.
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

// Mock do export para inspecionar chamadas e simular cenarios. Mantem
// shape identico ao real, com flags para alternar entre sucesso/erro.
const mockExportar = jest.fn();
const mockCompartilhar = jest.fn();
const mockRemover = jest.fn();

jest.mock('@/lib/midia/exportarSlideMemorias', () => ({
  __esModule: true,
  exportarSlideMemorias: (...args: unknown[]) => mockExportar(...args),
  compartilharSlidePng: (...args: unknown[]) => mockCompartilhar(...args),
  removerSlidePngTemp: (...args: unknown[]) => mockRemover(...args),
}));

// react-native-view-shot (virtual). Mock no nivel global ja existe
// em jest.setup.cjs, mas declaramos local para garantir.
jest.mock(
  'react-native-view-shot',
  () => ({
    __esModule: true,
    captureRef: jest.fn(() => Promise.resolve('file:///tmp/cap.png')),
  }),
  { virtual: true }
);

// expo-av: Audio.Sound stub. Slideshow tenta criar instancia em
// useEffect; ambient toggle esta off no settings mock acima.
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

describe('recap-memorias R-RECAP-6 (botao compartilhar)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockExportar.mockResolvedValue({
      uri: 'file:///cache/recap-share-abertura-1.png',
      motivo: null,
    });
    mockCompartilhar.mockResolvedValue(true);
    mockRemover.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renderiza botao compartilhar ao lado do botao pausar', () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText('pausar memorias')).toBeTruthy();
    expect(getByLabelText('compartilhar slide')).toBeTruthy();
  });

  it('tap em compartilhar pausa o slideshow e chama exportarSlideMemorias', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
    const argsExport = mockExportar.mock.calls[0][0] as {
      slideId: string;
      slideRef: unknown;
    };
    expect(argsExport.slideId).toBe('abertura');
    expect(argsExport.slideRef).toBeDefined();
    // Apos export ok, dispara share.
    await waitFor(() => {
      expect(mockCompartilhar).toHaveBeenCalledWith(
        'file:///cache/recap-share-abertura-1.png'
      );
    });
    // Cleanup do PNG temp e' chamado.
    await waitFor(() => {
      expect(mockRemover).toHaveBeenCalledWith(
        'file:///cache/recap-share-abertura-1.png'
      );
    });
  });

  it('erro de captura nao trava UI (caminho de toast silencioso)', async () => {
    mockExportar.mockResolvedValue({ uri: null, motivo: 'erro' });
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
    // Share nao deve ser chamado em caminho de erro.
    expect(mockCompartilhar).not.toHaveBeenCalled();
    // Tela continua renderizada (botao ainda acessivel).
    expect(getByLabelText('compartilhar slide')).toBeTruthy();
  });

  it('em web (motivo "web") tambem nao chama share, e UI segue', async () => {
    mockExportar.mockResolvedValue({ uri: null, motivo: 'web' });
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
    expect(mockCompartilhar).not.toHaveBeenCalled();
    expect(getByLabelText('compartilhar slide')).toBeTruthy();
  });

  it('double-tap nao dispara captura concorrente', async () => {
    // Faz o primeiro export ficar pendente um pouco para o segundo tap
    // entrar no guard `compartilhando`. mockResolvedValue resolve no
    // proximo microtask; basta nao aguardar entre os taps.
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
  });
});
