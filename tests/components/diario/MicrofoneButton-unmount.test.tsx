// R-MICROFONE-USE-AFTER-UNMOUNT (2026-05-21): verifica que o
// MicrofoneButton nao tenta setState/toast/callback apos o componente
// desmontar entre o pressIn e a resolucao das promises async.
//
// Padrao canonico de teste: spy em console.error com filtro pra
// warning "Can't perform a React state update on an unmounted
// component" + "An update to ... inside a test was not wrapped in
// act(...)". Se o componente vazar, jest captura o warning via
// console.error e o teste falha.
//
// Cenarios:
//   1. iniciar() em curso (await requestMicPermission) -> unmount
//      durante -> startRecording resolve depois -> nao deve setEstado.
//   2. ciclo press/release completo em componente montado funciona
//      normal (controle, nao deve quebrar com mountedRef).
//   3. finalizar() em curso (await stopRecording) -> unmount durante
//      -> saveRecordingToVault resolve depois -> nao deve onAudioGravado
//      nem toast em componente morto.
import { render, fireEvent, act } from '@testing-library/react-native';
import { ToastProvider } from '@/components/ui';

// Mock de expo-av: igual ao MicrofoneButton.test.tsx, mas com hooks
// para resolver promises sob controle do teste (latch manual).
let resolveStopAndUnload: (() => void) | null = null;
let resolveCopyAsync: (() => void) | null = null;

const mockStartAsync = jest.fn(() => Promise.resolve());
const mockPrepareToRecordAsync = jest.fn(() => Promise.resolve());
const mockStopAndUnloadAsync = jest.fn(
  () =>
    new Promise<void>((resolve) => {
      // Promise resolve por fora: o teste controla quando libera.
      resolveStopAndUnload = resolve;
    })
);
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

// expo-file-system/legacy: copyAsync com latch manual (cenario 3).
const mockCopyAsync = jest.fn(
  (_args?: { from: string; to: string }) =>
    new Promise<void>((resolve) => {
      resolveCopyAsync = resolve;
    })
);
const mockWriteAsStringAsync = jest.fn((_a?: string, _b?: string) =>
  Promise.resolve()
);
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (args: { from: string; to: string }) => mockCopyAsync(args),
  writeAsStringAsync: (a: string, b: string) => mockWriteAsStringAsync(a, b),
}));

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: <T,>(sel: (s: { vaultRoot: string | null }) => T): T =>
    sel({ vaultRoot: 'content://vault/test' }),
}));

import { MicrofoneButton } from '@/components/diario/MicrofoneButton';

// Captura warnings de unmount. React 18+ emite via console.error com
// strings caracteristicas. Se o componente vazar setState pos-unmount,
// um dos dois patterns aparece.
function instalarSpyConsole() {
  const original = console.error;
  const erros: string[] = [];
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    erros.push(msg);
    // Suprime no stdout do jest: o teste analisa via array.
    if (!msg.includes('unmounted') && !msg.includes('not wrapped in act')) {
      original(...(args as Parameters<typeof console.error>));
    }
  });
  return {
    erros,
    naoVazouUnmountWarning(): boolean {
      return !erros.some(
        (m) =>
          m.includes('state update on an unmounted component') ||
          m.includes('not wrapped in act')
      );
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resolveStopAndUnload = null;
  resolveCopyAsync = null;
});

afterEach(() => {
  jest.restoreAllMocks();
});

function renderComProviders(onAudioGravado = jest.fn()) {
  const utils = render(
    <ToastProvider>
      <MicrofoneButton onAudioGravado={onAudioGravado} />
    </ToastProvider>
  );
  return { ...utils, onAudioGravado };
}

describe('MicrofoneButton — use-after-unmount', () => {
  it('cenario 1: unmount durante iniciar() nao dispara setState pos-unmount', async () => {
    const spy = instalarSpyConsole();
    const { getByLabelText, unmount } = renderComProviders();
    const botao = getByLabelText('botao gravar audio');

    // pressIn: dispara iniciar() que aguarda requestMicPermission.
    // Como mockRequestPermissionsAsync resolve sincrono via Promise.resolve,
    // o componente vai aguardar 1 microtick antes de prosseguir.
    await act(async () => {
      fireEvent(botao, 'pressIn');
      // NAO drenamos as promises ainda: deixa o ciclo iniciar() em
      // estado pendente.
    });

    // Desmonta o componente DURANTE o ciclo iniciar() (antes de
    // startRecording resolver). mountedRef.current = false a partir
    // daqui.
    unmount();

    // Drena todas as promises pendentes: requestMicPermission ->
    // startRecording -> setEstado('recording') seriam disparados
    // sem mountedRef. Com guard, o iniciar() detecta unmount e sai.
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });

    expect(spy.naoVazouUnmountWarning()).toBe(true);
  });

  it('cenario 2: ciclo press/release em componente montado funciona normal', async () => {
    const spy = instalarSpyConsole();
    const { getByLabelText, onAudioGravado } = renderComProviders();
    const botao = getByLabelText('botao gravar audio');

    // Cenario controle: nao desmonta. Verifica que guards nao
    // quebram comportamento padrao. Libera as promises na hora.
    resolveStopAndUnload = null;
    resolveCopyAsync = null;
    // Substitui mocks por versoes que resolvem direto.
    mockStopAndUnloadAsync.mockImplementationOnce(() => Promise.resolve());
    mockCopyAsync.mockImplementationOnce(() => Promise.resolve());

    await act(async () => {
      fireEvent(botao, 'pressIn');
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });

    await act(async () => {
      fireEvent(botao, 'pressOut');
      for (let i = 0; i < 10; i++) await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    // Comportamento esperado: stopAndUnload chamado, copy chamado,
    // callback disparou com path do .m4a.
    expect(mockStopAndUnloadAsync).toHaveBeenCalled();
    expect(mockCopyAsync).toHaveBeenCalled();
    expect(onAudioGravado).toHaveBeenCalledWith(
      expect.stringMatching(/^m4a\/audio-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.m4a$/)
    );
    expect(spy.naoVazouUnmountWarning()).toBe(true);
  });

  it('cenario 3: unmount durante finalizar() (saveRecordingToVault pendente) nao dispara callback nem toast', async () => {
    const spy = instalarSpyConsole();
    const { getByLabelText, onAudioGravado, unmount } = renderComProviders();
    const botao = getByLabelText('botao gravar audio');

    // Comeca a gravacao normalmente: stopAndUnload aqui resolve
    // direto para permitir avancar ate o saveRecordingToVault.
    mockStopAndUnloadAsync.mockImplementationOnce(() => Promise.resolve());

    await act(async () => {
      fireEvent(botao, 'pressIn');
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });

    // pressOut dispara finalizar() que faz stopRecording (ok) e em
    // seguida saveRecordingToVault -> copyAsync com latch manual.
    // O componente entra em estado 'salvando' e fica aguardando.
    await act(async () => {
      fireEvent(botao, 'pressOut');
      // Drena ate ficar pendente no copyAsync.
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    // Desmonta durante o save pendente. mountedRef = false agora.
    unmount();

    // Libera o copyAsync: saveRecordingToVault resolve, finalizar()
    // entra no bloco pos-await. Sem guard, dispararia
    // onAudioGravado + toast.show + setEstado em componente morto.
    await act(async () => {
      if (resolveCopyAsync) resolveCopyAsync();
      for (let i = 0; i < 20; i++) await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });

    // onAudioGravado NAO pode ser chamado em componente morto.
    expect(onAudioGravado).not.toHaveBeenCalled();
    // E warning de unmount NAO pode ser emitido.
    expect(spy.naoVazouUnmountWarning()).toBe(true);
  });
});
