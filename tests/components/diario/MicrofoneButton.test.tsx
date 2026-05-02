// Testes do MicrofoneButton (M06.5). Mocka expo-av e
// @react-native-voice/voice via jest.mock para isolar o componente
// do hardware. Verifica:
//   - render no estado idle expoe label 'Gravar audio'
//   - pressIn dispara startRecording quando permissao concedida
//   - pressOut dispara stopRecording + saveRecordingToVault +
//     transcribeStream e callbacks chegam ao caller
import { render, fireEvent, act } from '@testing-library/react-native';
import { ToastProvider } from '@/components/ui';

// Mock do expo-av: Audio.Recording e setAudioModeAsync /
// requestPermissionsAsync stubados. Recording mantem URI fake +
// status com durationMillis suficiente para nao cair no descarte
// (>500ms).
const mockStartAsync = jest.fn(() => Promise.resolve());
const mockPrepareToRecordAsync = jest.fn(() => Promise.resolve());
const mockStopAndUnloadAsync = jest.fn(() => Promise.resolve());
const mockGetURI = jest.fn(() => 'file:///cache/audio-fake.m4a');
const mockGetStatusAsync = jest.fn(() =>
  Promise.resolve({ canRecord: false, durationMillis: 1500 })
);
const mockSetOnRecordingStatusUpdate = jest.fn();
const mockRequestPermissionsAsync = jest.fn(() =>
  Promise.resolve({ granted: true })
);
const mockSetAudioModeAsync = jest.fn((_mode?: unknown) => Promise.resolve());

jest.mock('expo-av', () => ({
  __esModule: true,
  Audio: {
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: mockPrepareToRecordAsync,
      startAsync: mockStartAsync,
      stopAndUnloadAsync: mockStopAndUnloadAsync,
      getURI: mockGetURI,
      getStatusAsync: mockGetStatusAsync,
      setOnRecordingStatusUpdate: mockSetOnRecordingStatusUpdate,
    })),
    requestPermissionsAsync: () => mockRequestPermissionsAsync(),
    setAudioModeAsync: (mode: unknown) => mockSetAudioModeAsync(mode),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));

// Mock do Voice: dispara onSpeechResults com texto fixo logo apos
// start. Caller recebe via transcribeStream resolve.
const voiceListeners: Record<string, ((e: unknown) => void) | null> = {
  onSpeechResults: null,
  onSpeechPartialResults: null,
  onSpeechError: null,
  onSpeechEnd: null,
};

jest.mock('@react-native-voice/voice', () => ({
  __esModule: true,
  default: {
    start: jest.fn(() => {
      // Simula entrega assincrona do resultado em microtask.
      setTimeout(() => {
        voiceListeners.onSpeechResults?.({
          value: ['oi diario hoje foi bom'],
        });
      }, 0);
      return Promise.resolve();
    }),
    stop: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn(() => {
      voiceListeners.onSpeechResults = null;
      voiceListeners.onSpeechPartialResults = null;
      voiceListeners.onSpeechError = null;
      voiceListeners.onSpeechEnd = null;
    }),
    set onSpeechResults(fn: (e: unknown) => void) {
      voiceListeners.onSpeechResults = fn;
    },
    set onSpeechPartialResults(fn: (e: unknown) => void) {
      voiceListeners.onSpeechPartialResults = fn;
    },
    set onSpeechError(fn: (e: unknown) => void) {
      voiceListeners.onSpeechError = fn;
    },
    set onSpeechEnd(fn: () => void) {
      voiceListeners.onSpeechEnd = fn;
    },
  },
}));

// Mock do FileSystem para isolar o saveRecordingToVault. O teste
// nao verifica I/O real; so confirma que copyAsync foi chamado.
const mockCopyAsync = jest.fn((_args?: { from: string; to: string }) =>
  Promise.resolve()
);
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (args: { from: string; to: string }) => mockCopyAsync(args),
}));

// Mock do useVault: retorna vaultRoot fixo para o componente nao
// pular a logica de salvar.
jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: <T,>(sel: (s: { vaultRoot: string | null }) => T): T =>
    sel({ vaultRoot: 'content://vault/test' }),
}));

import { MicrofoneButton } from '@/components/diario/MicrofoneButton';

beforeEach(() => {
  jest.clearAllMocks();
  voiceListeners.onSpeechResults = null;
  voiceListeners.onSpeechPartialResults = null;
  voiceListeners.onSpeechError = null;
  voiceListeners.onSpeechEnd = null;
});

function renderComProviders(
  onTextoTranscrito = jest.fn(),
  onAudioGravado = jest.fn()
) {
  const utils = render(
    <ToastProvider>
      <MicrofoneButton
        onTextoTranscrito={onTextoTranscrito}
        onAudioGravado={onAudioGravado}
      />
    </ToastProvider>
  );
  return { ...utils, onTextoTranscrito, onAudioGravado };
}

describe('MicrofoneButton render', () => {
  it('renderiza no estado idle com label Gravar audio', () => {
    const { getByLabelText, getByText } = renderComProviders();
    expect(getByLabelText('botao gravar audio')).toBeTruthy();
    expect(getByText('Gravar áudio')).toBeTruthy();
  });
});

describe('MicrofoneButton ciclo press/release', () => {
  it('pressIn dispara startRecording quando permissao concedida', async () => {
    const { getByLabelText } = renderComProviders();
    const botao = getByLabelText('botao gravar audio');
    await act(async () => {
      fireEvent(botao, 'pressIn');
      // Dois ticks para resolver as promises encadeadas:
      // requestMicPermission -> startRecording.
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    expect(mockPrepareToRecordAsync).toHaveBeenCalled();
    expect(mockStartAsync).toHaveBeenCalled();
  });

  it('pressOut encerra gravacao e dispara callbacks com texto + path', async () => {
    const { getByLabelText, onTextoTranscrito, onAudioGravado } =
      renderComProviders();
    const botao = getByLabelText('botao gravar audio');

    await act(async () => {
      fireEvent(botao, 'pressIn');
      // Aguarda iniciar.
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });

    await act(async () => {
      fireEvent(botao, 'pressOut');
      // Drena Promise.all (saveRecordingToVault + transcribeStream).
      // O Voice dispara onSpeechResults via setTimeout(0).
      for (let i = 0; i < 10; i++) await Promise.resolve();
      jest.advanceTimersByTime?.(0);
      await new Promise((r) => setTimeout(r, 0));
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(mockStopAndUnloadAsync).toHaveBeenCalled();
    expect(mockCopyAsync).toHaveBeenCalled();
    expect(onAudioGravado).toHaveBeenCalledWith(
      expect.stringMatching(/^assets\/\d{4}-\d{2}-\d{2}-\d{4}-[0-9a-f]{4}\.m4a$/)
    );
    expect(onTextoTranscrito).toHaveBeenCalledWith('oi diario hoje foi bom');
  });
});
