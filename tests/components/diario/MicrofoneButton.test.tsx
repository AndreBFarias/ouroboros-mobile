// Testes do MicrofoneButton (M06.5). Mocka expo-av e
// expo-speech-recognition via jest.mock para isolar o componente
// do hardware. Verifica:
//   - render no estado idle expoe label 'Gravar audio'
//   - pressIn dispara startRecording quando permissao concedida
//   - pressOut dispara stopRecording + saveRecordingToVault +
//     transcribeStream e callbacks chegam ao caller
// Migracao INTEGRACAO-M15: trocou @react-native-voice/voice
// (deprecated, conflito de manifest no Gradle 8) por
// expo-speech-recognition. Mock simula addListener('result',cb) para
// disparar o evento isFinal=true logo apos start().
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

// Mock do expo-speech-recognition: addListener('result', cb)
// captura callback e o teste o invoca após start() com texto fixo.
// Mantém compatibilidade com mocks anteriores via voiceListeners
// (renomeado para speechListeners).
const speechListeners: Record<string, ((e: unknown) => void) | null> = {
  result: null,
  error: null,
  end: null,
};

jest.mock('expo-speech-recognition', () => ({
  __esModule: true,
  ExpoSpeechRecognitionModule: {
    start: jest.fn(() => {
      // Simula entrega assíncrona do resultado em microtask, no
      // formato do expo-speech-recognition (results[].transcript +
      // isFinal=true). Logo após dispara 'end' para fechar a Promise.
      setTimeout(() => {
        speechListeners.result?.({
          isFinal: true,
          results: [{ transcript: 'oi diario hoje foi bom' }],
        });
        speechListeners.end?.(undefined);
      }, 0);
    }),
    stop: jest.fn(),
    abort: jest.fn(),
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true })
    ),
    isRecognitionAvailable: jest.fn(() => true),
    addListener: jest.fn(
      (eventName: string, cb: (e: unknown) => void) => {
        speechListeners[eventName] = cb;
        return {
          remove: () => {
            speechListeners[eventName] = null;
          },
        };
      }
    ),
    removeAllListeners: jest.fn(() => {
      speechListeners.result = null;
      speechListeners.error = null;
      speechListeners.end = null;
    }),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

// Mock do FileSystem para isolar o saveRecordingToVault. O teste
// nao verifica I/O real; so confirma que copyAsync foi chamado.
// M-VAULT-MD-FIX-diario-audio (2026-05-04): tambem precisa
// writeAsStringAsync porque saveRecordingToVault agora escreve
// o companion .md ao lado do binario.
const mockCopyAsync = jest.fn((_args?: { from: string; to: string }) =>
  Promise.resolve()
);
const mockWriteAsStringAsync = jest.fn((_a?: string, _b?: string) =>
  Promise.resolve()
);
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (args: { from: string; to: string }) => mockCopyAsync(args),
  writeAsStringAsync: (a: string, b: string) =>
    mockWriteAsStringAsync(a, b),
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
  speechListeners.result = null;
  speechListeners.error = null;
  speechListeners.end = null;
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
      await new Promise((r) => setTimeout(r, 0));
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(mockStopAndUnloadAsync).toHaveBeenCalled();
    expect(mockCopyAsync).toHaveBeenCalled();
    expect(onAudioGravado).toHaveBeenCalledWith(
      expect.stringMatching(/^m4a\/audio-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.m4a$/)
    );
    expect(onTextoTranscrito).toHaveBeenCalledWith('oi diario hoje foi bom');
  });
});
