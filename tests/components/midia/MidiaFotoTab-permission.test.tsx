// T1B3: cobre o feedback de toast no MidiaFotoTab quando permissao
// de galeria ou camera e' negada. Antes, o return silencioso fazia
// o usuario suspeitar de bug nos botoes "Escolher da galeria" e
// "Tirar foto". Agora aparece toast 'error' com mensagem especifica.
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// Mock do expo-image-picker antes do import do componente.
const mockRequestMediaLibraryPermissions = jest.fn();
const mockRequestCameraPermissions = jest.fn();
const mockLaunchImageLibrary = jest.fn();
const mockLaunchCamera = jest.fn();
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: () =>
    mockRequestMediaLibraryPermissions(),
  requestCameraPermissionsAsync: () => mockRequestCameraPermissions(),
  launchImageLibraryAsync: () => mockLaunchImageLibrary(),
  launchCameraAsync: () => mockLaunchCamera(),
}));

// Mock useVault: vaultRoot fixo (componente o consome no escopo top-level).
jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: <T,>(sel: (s: { vaultRoot: string | null }) => T): T =>
    sel({ vaultRoot: 'content://vault/test' }),
}));

import { ToastProvider } from '@/components/ui/Toast';
import { MidiaFotoTab } from '@/components/midia/MidiaFotoTab';

describe('MidiaFotoTab T1B3 toast em permissao negada', () => {
  beforeEach(() => {
    mockRequestMediaLibraryPermissions.mockReset();
    mockRequestCameraPermissions.mockReset();
    mockLaunchImageLibrary.mockReset();
    mockLaunchCamera.mockReset();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('mostra toast galeria quando permissao de galeria e negada', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: false });
    const onAdd = jest.fn();
    const { getByText, findByText } = render(
      <ToastProvider>
        <MidiaFotoTab onAdd={onAdd} />
      </ToastProvider>
    );
    fireEvent.press(getByText('Escolher da galeria'));
    expect(await findByText('Sem permissão de galeria.')).toBeTruthy();
    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('mostra toast camera quando permissao de camera e negada', async () => {
    mockRequestCameraPermissions.mockResolvedValue({ granted: false });
    const onAdd = jest.fn();
    const { getByText, findByText } = render(
      <ToastProvider>
        <MidiaFotoTab onAdd={onAdd} />
      </ToastProvider>
    );
    fireEvent.press(getByText('Tirar foto'));
    expect(await findByText('Sem permissão de câmera.')).toBeTruthy();
    expect(mockLaunchCamera).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('nao mostra toast quando galeria concedida e usuario cancela', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
    mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });
    const onAdd = jest.fn();
    const { getByText, queryByText } = render(
      <ToastProvider>
        <MidiaFotoTab onAdd={onAdd} />
      </ToastProvider>
    );
    fireEvent.press(getByText('Escolher da galeria'));
    await waitFor(() => {
      expect(mockRequestMediaLibraryPermissions).toHaveBeenCalled();
    });
    expect(queryByText('Sem permissão de galeria.')).toBeNull();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
