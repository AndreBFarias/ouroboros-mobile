// Testes do MicrofoneButton (M06.5). Mocka expo-av via jest.mock
// para isolar o componente do hardware. Verifica:
//   - render no estado idle expoe label 'Gravar audio'
//   - pressIn dispara startRecording quando permissao concedida
//   - pressOut dispara stopRecording + saveRecordingToVault e
//     callback onAudioGravado chega ao caller
//
// Q5.1 (Onda Q, 2026-05-12): transcricao live foi extraida pra
// TranscreverButton.tsx (botao separado). MicrofoneButton ficou
// audio-only — mocks de expo-speech-recognition removidos.
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
  writeAsStringAsync: (a: string, b: string) => mockWriteAsStringAsync(a, b),
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
});

function renderComProviders(onAudioGravado = jest.fn()) {
  const utils = render(
    <ToastProvider>
      <MicrofoneButton onAudioGravado={onAudioGravado} />
    </ToastProvider>
  );
  return { ...utils, onAudioGravado };
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

  it('pressOut encerra gravacao e dispara callback com path do audio', async () => {
    const { getByLabelText, onAudioGravado } = renderComProviders();
    const botao = getByLabelText('botao gravar audio');

    await act(async () => {
      fireEvent(botao, 'pressIn');
      // Aguarda iniciar.
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });

    await act(async () => {
      fireEvent(botao, 'pressOut');
      // Drena saveRecordingToVault.
      for (let i = 0; i < 10; i++) await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(mockStopAndUnloadAsync).toHaveBeenCalled();
    expect(mockCopyAsync).toHaveBeenCalled();
    expect(onAudioGravado).toHaveBeenCalledWith(
      expect.stringMatching(/^m4a\/audio-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.m4a$/)
    );
  });
});
