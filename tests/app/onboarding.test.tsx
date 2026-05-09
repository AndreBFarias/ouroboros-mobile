// Smoke do onboarding 5 frames (J1 / M-ONBOARDING-PERMISSOES).
// Cobre:
//  - Render inicial no Frame 0 (Como voce se chama?) com seletor de sexo
//  - Frame 0: nome vazio dispara toast e nao avanca
//  - Frame 0: sem sexo selecionado dispara toast e nao avanca
//  - Frame 0 -> 1 -> 2 -> 3 (Permissoes) -> 4 (Tudo pronto)
//  - Frame 2 caminho A "Usar essa": chama pedirPermissaoStorage +
//    inicializarVaultEscolhido(sugestao), avanca
//  - Frame 2 caminho B "Escolher": chama requestVaultPermission +
//    inicializarVaultEscolhido(uri), avanca
//  - Frame 3 Permissoes: 4 cards renderizam com toggles default
//    canonicos (camera/microfone/notif ON, localizacao OFF)
//  - Frame 3 "Continuar": chama mocks request* na ordem para toggles
//    ON, persiste em useOnboarding.permissoes
//  - Frame 4: Comecar marca onboarding concluido e router.replace
//  - Frame 4: resumo "N permissoes concedidas" reflete contagem real
//  - Erro de inicializarVaultEscolhido mantem usuario no Frame 2
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
const mockPedirPermissaoStorage = jest.fn<Promise<boolean>, []>();
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

const mockReqCamera = jest.fn<Promise<boolean>, []>();
const mockReqMicrofone = jest.fn<Promise<boolean>, []>();
const mockReqNotificacoes = jest.fn<Promise<boolean>, []>();
const mockReqLocalizacao = jest.fn<Promise<boolean>, []>();

jest.mock('@/lib/permissoes/requestOnboarding', () => ({
  __esModule: true,
  requestCameraPermission: () => mockReqCamera(),
  requestMicrofonePermission: () => mockReqMicrofone(),
  requestNotificacoesPermission: () => mockReqNotificacoes(),
  requestLocalizacaoPermission: () => mockReqLocalizacao(),
  getCameraStatus: jest.fn(),
  getMicrofoneStatus: jest.fn(),
  getNotificacoesStatus: jest.fn(),
  getLocalizacaoStatus: jest.fn(),
}));

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
  mockPedirPermissaoStorage.mockResolvedValue(true);
  // V4.0.2: requestVaultPermission converte SAF tree URI para file://
  // antes de retornar ao caller.
  mockRequestVaultPermission.mockResolvedValue(
    'file:///sdcard/Download'
  );
  mockReqCamera.mockResolvedValue(true);
  mockReqMicrofone.mockResolvedValue(true);
  mockReqNotificacoes.mockResolvedValue(true);
  mockReqLocalizacao.mockResolvedValue(true);
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

// Helper: avanca do Frame 0 ate o Frame 2 (pasta), preenchendo
// nome+sexo da pessoa_a e escolhendo sozinho.
function avancarAtePasta(api: {
  getByText: (t: string) => unknown;
  getByLabelText: (l: string) => unknown;
}) {
  const { getByText, getByLabelText } = api;
  fireEvent.changeText(getByLabelText('campo nome') as never, 'Teste');
  fireEvent.press(getByLabelText('chip Masculino') as never);
  fireEvent.press(getByText('Continuar') as never);
  fireEvent.press(getByLabelText('escolher sozinho') as never);
  fireEvent.press(getByText('Continuar') as never);
}

describe('Onboarding J1 - 5 frames com permissoes', () => {
  it('renderiza Frame 0 com heading, campo nome e seletor de sexo', () => {
    const { getByText, getByLabelText } = renderTela();
    expect(getByText('Como você se chama?')).toBeTruthy();
    expect(getByLabelText('campo nome')).toBeTruthy();
    expect(getByLabelText('chip Masculino')).toBeTruthy();
    expect(getByLabelText('chip Feminino')).toBeTruthy();
    expect(getByLabelText('chip Não-binário')).toBeTruthy();
    expect(getByLabelText('chip Prefiro não dizer')).toBeTruthy();
    expect(getByText('Continuar')).toBeTruthy();
  });

  it('Frame 0: nome vazio mostra toast e nao avanca', () => {
    const { getByText, queryByText } = renderTela();
    fireEvent.press(getByText('Continuar'));
    expect(queryByText('Mais alguém usa este Vault com você?')).toBeNull();
    expect(usePessoa.getState().nomes.pessoa_a).toBe('');
  });

  it('Frame 0: sexo nao escolhido bloqueia avanco', () => {
    const { getByText, getByLabelText, queryByText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByText('Continuar'));
    expect(queryByText('Mais alguém usa este Vault com você?')).toBeNull();
    expect(usePessoa.getState().nomes.pessoa_a).toBe('');
  });

  it('Frame 0 -> Frame 1: nome+sexo validos persistem e avancam', () => {
    const { getByText, getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo nome'), 'Teste');
    fireEvent.press(getByLabelText('chip Feminino'));
    fireEvent.press(getByText('Continuar'));
    expect(usePessoa.getState().nomes.pessoa_a).toBe('Teste');
    expect(useOnboarding.getState().sexoDeclarado.pessoa_a).toBe('feminino');
    expect(getByText('Mais alguém usa este Vault com você?')).toBeTruthy();
  });

  it('Frame 1 sozinho -> Frame 2 (pasta)', () => {
    const api = renderTela();
    avancarAtePasta(api);
    expect(api.getByText('Onde salvar seus dados?')).toBeTruthy();
  });

  it('Frame 2 caminho A (permissao ja concedida) -> Frame 3 Permissoes', async () => {
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(mockInicializarEscolhido).toHaveBeenCalledWith(
        'file:///sdcard/Documents/Ouroboros/'
      );
    });
    // V4.0.2: handleUsarSugestao tenta init direto; so chama
    // pedirPermissaoStorage no fallback. Como o mock default ja
    // retorna sucesso na 1a tentativa, pedirPermissao nao precisa
    // ser chamado.
    expect(mockPedirPermissaoStorage).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(api.getByText('Para a melhor experiência, libere o acesso a:')).toBeTruthy();
    });
    expect(useOnboarding.getState().permissoes.storage).toBe(true);
  });

  it('Frame 2 caminho A (1a tentativa falha, retry apos grant)', async () => {
    mockInicializarEscolhido.mockRejectedValueOnce(
      new Error('storage permission denied')
    );
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(mockPedirPermissaoStorage).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockInicializarEscolhido).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(api.getByText('Para a melhor experiência, libere o acesso a:')).toBeTruthy();
    });
  });

  it('Frame 2 caminho B -> Frame 3 Permissoes', async () => {
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('escolher outra pasta'));
    await waitFor(() => {
      expect(mockRequestVaultPermission).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      // V4.0.2: requestVaultPermission retorna file:// (convertido).
      expect(mockInicializarEscolhido).toHaveBeenCalledWith(
        'file:///sdcard/Download'
      );
    });
    await waitFor(() => {
      expect(api.getByText('Para a melhor experiência, libere o acesso a:')).toBeTruthy();
    });
  });

  it('Frame 2 caminho B cancelado: usuario fica no Frame 2', async () => {
    mockRequestVaultPermission.mockResolvedValueOnce(null);
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('escolher outra pasta'));
    await waitFor(() => {
      expect(mockRequestVaultPermission).toHaveBeenCalledTimes(1);
    });
    expect(mockInicializarEscolhido).not.toHaveBeenCalled();
    expect(api.getByText('Onde salvar seus dados?')).toBeTruthy();
  });

  it('Frame 2 init falha + permissao negada: mantem usuario no Frame 2', async () => {
    mockInicializarEscolhido.mockRejectedValue(
      new Error('storage permission denied (probe write failed)')
    );
    mockPedirPermissaoStorage.mockResolvedValueOnce(false);
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(mockPedirPermissaoStorage).toHaveBeenCalledTimes(1);
    });
    // 1a tentativa de init (falhou) + nao chama 2a porque permissao denied.
    expect(mockInicializarEscolhido).toHaveBeenCalledTimes(1);
    expect(api.getByText('Onde salvar seus dados?')).toBeTruthy();
  });

  it('Frame 3 Permissoes: 4 cards renderizam com toggles default', async () => {
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(api.getByText('Câmera')).toBeTruthy();
    });
    expect(api.getByText('Microfone')).toBeTruthy();
    expect(api.getByText('Notificações')).toBeTruthy();
    expect(api.getByText('Localização')).toBeTruthy();
    expect(api.getByLabelText('toggle permissao camera')).toBeTruthy();
    expect(api.getByLabelText('toggle permissao microfone')).toBeTruthy();
    expect(api.getByLabelText('toggle permissao notificacoes')).toBeTruthy();
    expect(api.getByLabelText('toggle permissao localizacao')).toBeTruthy();
  });

  it('Frame 3 Permissoes: H1 contextual (eyebrow Permissoes + frase distinta)', async () => {
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(api.getByText('Libere o que faz sentido pra você.')).toBeTruthy();
    });
    // Eyebrow continua "Permissoes" (consistencia com outros 4 frames).
    expect(api.getByText('Permissões')).toBeTruthy();
  });

  it('Frame 3 "Continuar": chama request* para toggles ON, persiste em store, avanca para Frame 4', async () => {
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(api.getByText('Câmera')).toBeTruthy();
    });
    fireEvent.press(api.getByText('Continuar'));
    await waitFor(() => {
      expect(mockReqCamera).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockReqMicrofone).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockReqNotificacoes).toHaveBeenCalledTimes(1);
    });
    // Localizacao default OFF nao chama request.
    expect(mockReqLocalizacao).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(api.getByText('Tudo pronto, Teste.')).toBeTruthy();
    });
    const p = useOnboarding.getState().permissoes;
    expect(p.camera).toBe(true);
    expect(p.microfone).toBe(true);
    expect(p.notificacoes).toBe(true);
    expect(p.localizacao).toBe(false);
  });

  it('Frame 3: toggle camera OFF nao chama requestCamera', async () => {
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(api.getByText('Câmera')).toBeTruthy();
    });
    // Desliga camera com tap no Pressable do Toggle (alterna ON->OFF).
    fireEvent.press(api.getByLabelText('toggle permissao camera'));
    fireEvent.press(api.getByText('Continuar'));
    await waitFor(() => {
      expect(mockReqMicrofone).toHaveBeenCalledTimes(1);
    });
    expect(mockReqCamera).not.toHaveBeenCalled();
    expect(useOnboarding.getState().permissoes.camera).toBe(false);
  });

  it('Frame 3: requestCamera retorna false persiste false', async () => {
    mockReqCamera.mockResolvedValueOnce(false);
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(api.getByText('Câmera')).toBeTruthy();
    });
    fireEvent.press(api.getByText('Continuar'));
    await waitFor(() => {
      expect(api.getByText('Tudo pronto, Teste.')).toBeTruthy();
    });
    const p = useOnboarding.getState().permissoes;
    expect(p.camera).toBe(false);
    expect(p.microfone).toBe(true);
  });

  it('Frame 4: resumo mostra contagem singular/plural correto', async () => {
    // Tudo concedido: storage + camera + microfone + notificacoes = 4.
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(api.getByText('Câmera')).toBeTruthy();
    });
    fireEvent.press(api.getByText('Continuar'));
    await waitFor(() => {
      expect(api.getByText('4 permissões concedidas.')).toBeTruthy();
    });
  });

  it('Frame 4: Comecar marca concluido e redireciona', async () => {
    const api = renderTela();
    avancarAtePasta(api);
    fireEvent.press(api.getByLabelText('usar sugestao documents ouroboros'));
    await waitFor(() => {
      expect(api.getByText('Câmera')).toBeTruthy();
    });
    fireEvent.press(api.getByText('Continuar'));
    await waitFor(() => {
      expect(api.getByText('Tudo pronto, Teste.')).toBeTruthy();
    });
    fireEvent.press(api.getByText('Começar'));
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
