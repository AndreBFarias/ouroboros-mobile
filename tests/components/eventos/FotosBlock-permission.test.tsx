// T1B3: cobre o feedback de toast no FotosBlock quando permissao
// de galeria e' negada. Antes, o return silencioso fazia o usuario
// suspeitar de bug no botao "Adicionar foto". Agora aparece toast
// 'error' com a mensagem "Sem permissão de galeria.".
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// Mock do expo-image-picker antes do import do componente.
const mockRequestMediaLibraryPermissions = jest.fn();
const mockLaunchImageLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: () =>
    mockRequestMediaLibraryPermissions(),
  launchImageLibraryAsync: () => mockLaunchImageLibrary(),
}));

import { ToastProvider } from '@/components/ui/Toast';
import { FotosBlock } from '@/components/eventos/FotosBlock';

describe('FotosBlock T1B3 toast em permissao negada', () => {
  beforeEach(() => {
    mockRequestMediaLibraryPermissions.mockReset();
    mockLaunchImageLibrary.mockReset();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('mostra toast quando permissao de galeria e negada', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: false });
    const onChangeFotos = jest.fn();
    const { getByText, findByText } = render(
      <ToastProvider>
        <FotosBlock fotos={[]} onChangeFotos={onChangeFotos} />
      </ToastProvider>
    );
    fireEvent.press(getByText('Adicionar foto'));
    expect(await findByText('Sem permissão de galeria.')).toBeTruthy();
    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
    expect(onChangeFotos).not.toHaveBeenCalled();
  });

  it('nao mostra toast quando permissao concedida e usuario cancela', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
    mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });
    const onChangeFotos = jest.fn();
    const { getByText, queryByText } = render(
      <ToastProvider>
        <FotosBlock fotos={[]} onChangeFotos={onChangeFotos} />
      </ToastProvider>
    );
    fireEvent.press(getByText('Adicionar foto'));
    await waitFor(() => {
      expect(mockRequestMediaLibraryPermissions).toHaveBeenCalled();
    });
    expect(queryByText('Sem permissão de galeria.')).toBeNull();
    expect(onChangeFotos).not.toHaveBeenCalled();
  });
});
