// Cobre o feedback de toast no AvatarPicker quando permissao de galeria
// e' negada (B3 da sprint AUDIT-T1-BUGS). Antes, o return silencioso fazia
// o usuario suspeitar de bug no botao. Agora aparece toast 'error'.
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// Mock do expo-image-picker antes do import do componente.
const mockRequestMediaLibraryPermissions = jest.fn();
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: () =>
    mockRequestMediaLibraryPermissions(),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: true,
    assets: [],
  }),
}));

// usePessoa: stub mantendo a API necessaria.
jest.mock('@/lib/stores/pessoa', () => ({
  __esModule: true,
  usePessoa: (selector: (s: unknown) => unknown) =>
    selector({
      fotos: { pessoa_a: null, pessoa_b: null },
      setFoto: jest.fn(),
    }),
}));

import { ToastProvider } from '@/components/ui/Toast';
import { AvatarPicker } from '@/components/ui/AvatarPicker';

describe('AvatarPicker B3 toast em permissao negada', () => {
  beforeEach(() => {
    mockRequestMediaLibraryPermissions.mockReset();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('mostra toast quando permissao e negada', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: false });
    const { getByLabelText, findByText } = render(
      <ToastProvider>
        <AvatarPicker pessoa="pessoa_a" />
      </ToastProvider>
    );
    fireEvent.press(getByLabelText('escolher foto de pessoa_a'));
    expect(await findByText('Sem permissão de galeria.')).toBeTruthy();
  });

  it('nao mostra toast quando permissao concedida (caminho feliz)', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
    const { getByLabelText, queryByText } = render(
      <ToastProvider>
        <AvatarPicker pessoa="pessoa_a" />
      </ToastProvider>
    );
    fireEvent.press(getByLabelText('escolher foto de pessoa_a'));
    // Espera a callback resolver (canceled=true cai antes de qualquer
    // toast). Como o caminho feliz aqui nao emite toast, o texto de erro
    // nao deve aparecer.
    await waitFor(() => {
      expect(mockRequestMediaLibraryPermissions).toHaveBeenCalled();
    });
    expect(queryByText('Sem permissão de galeria.')).toBeNull();
  });
});
