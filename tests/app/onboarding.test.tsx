// Smoke do onboarding 4 frames (H3 / M-VAULT-PASTA-NAO-HARDCODED).
// Cobre:
//  - Render inicial no Frame 0 (Como voce se chama?)
//  - Validacao de nome vazio dispara toast.error
//  - Avanco Frame 0 -> Frame 1 -> Frame 2 (Onde salvar?) -> Frame 3
//    (Tudo pronto)
//  - Frame 2 caminho A "Usar essa": chama pedirPermissaoStorage +
//    inicializarVaultEscolhido(sugestao), avanca para Frame 3
//  - Frame 2 caminho B "Escolher": chama requestVaultPermission +
//    inicializarVaultEscolhido(uri), avanca para Frame 3
//  - Frame 3 Comecar marca onboarding concluido e router.replace
//  - Erro de inicializarVaultEscolhido mantem usuario no Frame 2 e
//    onboarding nao concluido
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    push: mockPush,
  }),
}));

const mockInicializarEscolhido = jest.fn<
  Promise<{ vaultRoot: string; criado: boolean; modo: 'auto' | 'saf-fallback' | 'web' }>,
  [string]
>();
const mockPedirPermissaoStorage = jest.fn<Promise<void>, []>();
const mockRequestVaultPermission = jest.fn<Promise<string | null>, []>();

jest.mock('@/lib/vault', () => {
  const actual = jest.requireActual('@/lib/vault');
  return {
    ...actual,
    inicializarVaultEscolhido: (uri: string) => mockInicializarEscolhido(uri),
    pedirPermissaoStorage: () => mockPedirPermissaoStorage(),
    requestVaultPermission: () => mockRequestVaultPermission(),
    sugestaoVaultPathDefault: () => '/sdcard/Documents/Ouroboros/',
    sugestaoVaultUriDefault: () => 'file:///sdcard/Documents/Ouroboros/',
  };
});

import Onboarding from '../../app/onboarding';
import { ToastProvider } from '@/components/ui';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';

function renderTela() {
  return render(
    <ToastProvider>
      <Onboarding />
    </ToastProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useOnboarding.getState().resetar();
  usePessoa.getState().setNome('pessoa_a', '');
  usePessoa.getState().setNome('pessoa_b', '');
  mockInicializarEscolhido.mockResolvedValue({
    vaultRoot: 'file:///sdcard/Documents/Ouroboros/',
    criado: true,
    modo: 'auto',
  });
  mockPedirPermissaoStorage.mockResolvedValue(undefined);
  mockRequestVaultPermission.mockResolvedValue(
    'content://com.android.externalstorage.documents/tree/primary%3ADownload'
  );
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('Onboarding H3 - 4 frames', () => {
  it('renderiza Frame 0 com heading e botao Continuar', () => {
    const { getByText, getByLabelText } = renderTela();
    expect(getByText('Como você se chama?')).toBeTruthy();
    expect(getByLabelText('campo nome')).toBeTruthy();
    expect(getByText('Continuar')).toBeTruthy();
  });

  it('Frame 0: nome vazio mostra toast e nao avanca', () => {
    const { getByText, queryByText } = renderTela();
    fireEvent.press(getByText('Continuar'));
    expect(queryByText('Mais alguém usa este Vault com você?')).toBeNull();
    expect(usePessoa.getState().nomes.pessoa_a).toBe('');
  });

  it('Frame 0 -> Frame 1: nome valido salva pessoa_a e avanca', () => {
    const { getByText, getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByText('Continuar'));
    expect(usePessoa.getState().nomes.pessoa_a).toBe('Teste');
    expect(getByText('Mais alguém usa este Vault com você?')).toBeTruthy();
  });

  it('Frame 1 -> Frame 2: sozinho avanca para Onde salvar', () => {
    const { getByText, getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('escolher sozinho'));
    fireEvent.press(getByText('Continuar'));
    expect(getByText('Onde salvar seus dados?')).toBeTruthy();
    expect(getByLabelText('usar sugestao documents ouroboros')).toBeTruthy();
    expect(getByLabelText('escolher outra pasta')).toBeTruthy();
  });

  it('Frame 2 caminho A: "Usar essa" chama pedirPermissao + inicializarVaultEscolhido(sugestao) e avanca', async () => {
    const { getByText, getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('escolher sozinho'));
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(mockPedirPermissaoStorage).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockInicializarEscolhido).toHaveBeenCalledWith(
        'file:///sdcard/Documents/Ouroboros/'
      );
    });
    await waitFor(() => {
      expect(getByText('Tudo pronto, Teste.')).toBeTruthy();
    });
  });

  it('Frame 2 caminho B: "Escolher" chama requestVaultPermission + inicializarVaultEscolhido(uri) e avanca', async () => {
    const { getByText, getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('escolher sozinho'));
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('escolher outra pasta'));
    await waitFor(() => {
      expect(mockRequestVaultPermission).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockInicializarEscolhido).toHaveBeenCalledWith(
        'content://com.android.externalstorage.documents/tree/primary%3ADownload'
      );
    });
    await waitFor(() => {
      expect(getByText('Tudo pronto, Teste.')).toBeTruthy();
    });
  });

  it('Frame 2 caminho B cancelado: usuario fica no Frame 2', async () => {
    mockRequestVaultPermission.mockResolvedValueOnce(null);
    const { getByText, getByLabelText, queryByText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('escolher sozinho'));
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('escolher outra pasta'));
    await waitFor(() => {
      expect(mockRequestVaultPermission).toHaveBeenCalledTimes(1);
    });
    expect(mockInicializarEscolhido).not.toHaveBeenCalled();
    expect(getByText('Onde salvar seus dados?')).toBeTruthy();
    expect(queryByText('Tudo pronto, Teste.')).toBeNull();
  });

  it('Frame 2 erro de probe na sugestao: mantem usuario no Frame 2', async () => {
    mockInicializarEscolhido.mockRejectedValueOnce(
      new Error('storage permission denied (probe write failed)')
    );
    const { getByText, getByLabelText, queryByText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('escolher sozinho'));
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(mockInicializarEscolhido).toHaveBeenCalledTimes(1);
    });
    expect(getByText('Onde salvar seus dados?')).toBeTruthy();
    expect(queryByText('Tudo pronto, Teste.')).toBeNull();
  });

  it('Frame 3: Comecar marca concluido e redireciona', async () => {
    const { getByText, getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('escolher sozinho'));
    fireEvent.press(getByText('Continuar'));
    fireEvent.press(getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(getByText('Tudo pronto, Teste.')).toBeTruthy();
    });
    fireEvent.press(getByText('Começar'));
    await waitFor(() => {
      expect(useOnboarding.getState().done).toBe(true);
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('nao renderiza textos de Sync ou Vault de versoes anteriores', () => {
    const { queryByText } = renderTela();
    expect(queryByText('Sincronização')).toBeNull();
    expect(queryByText('Onde fica seu Vault?')).toBeNull();
    expect(queryByText('Como você sincroniza entre dispositivos?')).toBeNull();
  });
});
