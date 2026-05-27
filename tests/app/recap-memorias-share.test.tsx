// R-RECAP-6 (2026-05-16): testes do botao Compartilhar do slideshow
// Memorias. Cobre:
//  - Botao Share renderiza ao lado do botao Pausar.
//  - Tap em Compartilhar pausa o slideshow + chama
//    exportarSlideMemorias.
//  - Em caminho de sucesso, dispara compartilharSlidePng e cleanup.
//  - Erro de captura mostra toast (nao trava UI).
//
// R-RECAP-7 (2026-05-26): tap em Compartilhar agora abre um overlay
// de escolha de formato (Stories / Post quadrado) ANTES do capture.
// Os testes refletem o passo intermediario: tap Compartilhar ->
// escolher formato -> exportarSlideMemorias recebe o formato.
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

  // R-RECAP-7: tap em Compartilhar NAO captura direto; abre overlay
  // de escolha. exportarSlideMemorias so e' chamado apos escolher.
  it('tap em compartilhar abre overlay de escolha sem capturar ainda', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    // Overlay aparece com as duas opcoes.
    await waitFor(() => {
      expect(getByLabelText('compartilhar como stories')).toBeTruthy();
      expect(getByLabelText('compartilhar como post quadrado')).toBeTruthy();
    });
    // Capture ainda nao disparou.
    expect(mockExportar).not.toHaveBeenCalled();
  });

  it('escolher Stories chama exportarSlideMemorias com formato stories', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(getByLabelText('compartilhar como stories')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('compartilhar como stories'));
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
    const argsExport = mockExportar.mock.calls[0][0] as {
      slideId: string;
      slideRef: unknown;
      formato: string;
    };
    expect(argsExport.slideId).toBe('abertura');
    expect(argsExport.slideRef).toBeDefined();
    expect(argsExport.formato).toBe('stories');
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

  it('escolher Post quadrado chama exportarSlideMemorias com formato quadrado', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(getByLabelText('compartilhar como post quadrado')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('compartilhar como post quadrado'));
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
    const argsExport = mockExportar.mock.calls[0][0] as { formato: string };
    expect(argsExport.formato).toBe('quadrado');
  });

  it('cancelar fecha o overlay sem capturar', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(getByLabelText('cancelar')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('cancelar'));
    // Overlay some; nenhuma captura disparada.
    await waitFor(() => {
      expect(queryByLabelText('compartilhar como stories')).toBeNull();
    });
    expect(mockExportar).not.toHaveBeenCalled();
  });

  it('erro de captura nao trava UI (caminho de toast silencioso)', async () => {
    mockExportar.mockResolvedValue({ uri: null, motivo: 'erro' });
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(getByLabelText('compartilhar como stories')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('compartilhar como stories'));
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
      expect(getByLabelText('compartilhar como stories')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('compartilhar como stories'));
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
    expect(mockCompartilhar).not.toHaveBeenCalled();
    expect(getByLabelText('compartilhar slide')).toBeTruthy();
  });

  it('double-tap no formato nao dispara captura concorrente', async () => {
    // Apos abrir o overlay, dois taps rapidos no MESMO no do botao de
    // formato (capturado uma vez) devem entrar no guard
    // `compartilhando` (so 1 export). Captura o no antes porque o
    // overlay fecha apos o primeiro tap.
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(getByLabelText('compartilhar como stories')).toBeTruthy();
    });
    const botaoStories = getByLabelText('compartilhar como stories');
    fireEvent.press(botaoStories);
    fireEvent.press(botaoStories);
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
  });

  it('reabrir o overlay funciona apos um share concluido', async () => {
    // Apos um ciclo completo de share, o botao de header volta a
    // abrir o overlay normalmente (estado limpo).
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(getByLabelText('compartilhar como stories')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('compartilhar como stories'));
    await waitFor(() => {
      expect(mockExportar).toHaveBeenCalledTimes(1);
    });
    // Segundo ciclo: reabre.
    fireEvent.press(getByLabelText('compartilhar slide'));
    await waitFor(() => {
      expect(getByLabelText('compartilhar como post quadrado')).toBeTruthy();
    });
  });
});
