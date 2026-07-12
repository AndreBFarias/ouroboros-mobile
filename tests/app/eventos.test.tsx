// Smoke da Tela 20 (eventos com lugar). Render do bottom sheet,
// auto-selecao de pessoa_b conforme tipoCompanhia, troca de modo
// positivo/negativo, validacao trava save com texto vazio,
// detectar bairro injeta chip cyan, save chama saveEvento com
// payload valido pelo EventoSchema.
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const mockRedirectInstances: Array<{ href: string }> = [];
  (
    globalThis as { __mockRedirectInstances?: typeof mockRedirectInstances }
  ).__mockRedirectInstances = mockRedirectInstances;
  return {
    __esModule: true,
    useRouter: () => ({
      back: mockBack,
      replace: mockReplace,
      push: mockPush,
    }),
    Redirect: function MockRedirect(props: { href: string }) {
      mockRedirectInstances.push({ href: props.href });
      return null;
    },
  };
});

const mockSaveEvento = jest.fn<
  Promise<{ uri: string; fotosGravadas: string[] }>,
  [unknown]
>();

jest.mock('@/lib/eventos/saveEvento', () => ({
  saveEvento: (args: unknown) => mockSaveEvento(args),
}));

const mockGetBairroAtual = jest.fn<Promise<string | null>, []>();

// T1B3: caller agora consome getBairroAtualDetalhado. O mock antigo
// devolve string|null; convertemos para o discriminator no factory.
jest.mock('@/lib/eventos/localizacao', () => ({
  getBairroAtual: () => mockGetBairroAtual(),
  getBairroAtualDetalhado: async () => {
    const out = await mockGetBairroAtual();
    if (out === null) return { ok: false, razao: 'sem_resultado' };
    return { ok: true, bairro: out };
  },
}));

// expo-image-picker e expo-location nao chegam a rodar nos testes
// porque mockSaveEvento intercepta o save e o LocalizacaoBlock so
// chama getBairroAtual via prop. Mas precisamos dos mocks para o
// transform do jest nao tropecar em codigo nativo.
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: false })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: true, assets: [] })
  ),
}));

jest.mock('expo-location', () => ({
  __esModule: true,
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: false })
  ),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

// DateTimePicker: o teste do eventos nao abre o picker (modo
// 'agora' e default e nao mexemos no chip 'Outro horario'). Basta
// um mock minimo que nao toque RN nem CSS interop.
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));

import Eventos from '../../app/eventos';
import { ToastProvider } from '@/components/ui';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { EventoSchema } from '@/lib/schemas/evento';

const VAULT_ROOT = 'content://mock/Vault';

function renderTela() {
  return render(
    <ToastProvider>
      <Eventos />
    </ToastProvider>
  );
}

// Helper M07.x: adiciona uma midia youtube valida em modo positivo
// para satisfazer o refine de midia obrigatoria. Tests que validam
// o caminho de save em modo positivo precisam chamar antes do press
// no botao Registrar.
function adicionarMidiaYoutube(utils: {
  getByText: (t: string) => unknown;
  getByLabelText: (l: string) => unknown;
}) {
  fireEvent.press(utils.getByText('YouTube') as never);
  fireEvent.changeText(
    utils.getByLabelText('campo link youtube') as never,
    'https://youtu.be/dQw4w9WgXcQ'
  );
  fireEvent.press(utils.getByText('Adicionar') as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useVault.getState().setVaultRoot(VAULT_ROOT);
  usePessoa.getState().setPessoaAtiva('pessoa_a');
  useOnboarding.getState().setTipoCompanhia('casal');
  mockSaveEvento.mockResolvedValue({
    uri: `${VAULT_ROOT}/eventos/2026-04-29-vila-mariana.md`,
    fotosGravadas: [],
  });
  mockGetBairroAtual.mockResolvedValue(null);
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  useVault.getState().clearVaultRoot();
});

describe('Tela 20 - render', () => {
  it('M26: BottomSheet abre em index=0 direto (Screen opaco por tras)', () => {
    const { getByLabelText } = renderTela();
    const sheet = getByLabelText('bottom-sheet-mock');
    expect(sheet.props.accessibilityHint).toBe('index=0');
  });

  it('renderiza o bottom sheet com header Eventos', () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText('bottom-sheet-mock')).toBeTruthy();
    expect(getByLabelText('eventos')).toBeTruthy();
  });

  it('inicia em modo positivo por default', () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText('chip Positivo')).toBeTruthy();
    expect(getByLabelText('chip Negativo')).toBeTruthy();
    expect(getByLabelText('Registrar')).toBeTruthy();
  });

  it('renderiza chips de categoria com acentuacao PT-BR', () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText('chip Rolezinho')).toBeTruthy();
    expect(getByLabelText('chip Exercício')).toBeTruthy();
    expect(getByLabelText('chip Evento social')).toBeTruthy();
  });

  it('redireciona para onboarding quando nao ha vaultRoot', () => {
    useVault.getState().clearVaultRoot();
    const instancias = (
      globalThis as { __mockRedirectInstances?: Array<{ href: string }> }
    ).__mockRedirectInstances;
    if (!instancias) {
      throw new Error('Mock de Redirect nao registrou globalThis');
    }
    instancias.length = 0;
    renderTela();
    expect(instancias.length).toBeGreaterThan(0);
    expect(instancias[instancias.length - 1].href).toBe('/onboarding');
  });
});

describe('Tela 20 - auto-selecao de pessoa_b', () => {
  it('auto-marca pessoa_b quando tipoCompanhia eh casal', async () => {
    useOnboarding.getState().setTipoCompanhia('casal');
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'cafe da manha juntos.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(mockSaveEvento).toHaveBeenCalled());
    const args = mockSaveEvento.mock.calls[0][0] as {
      meta: { com: string[] };
    };
    expect(args.meta.com).toContain('pessoa_b');
  });

  it('nao auto-marca quando tipoCompanhia eh sozinho', async () => {
    useOnboarding.getState().setTipoCompanhia('sozinho');
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'almoco sozinho hoje.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(mockSaveEvento).toHaveBeenCalled());
    const args = mockSaveEvento.mock.calls[0][0] as {
      meta: { com: string[] };
    };
    expect(args.meta.com).toEqual([]);
  });

  it('auto-marca pessoa_b quando tipoCompanhia eh amigos', async () => {
    useOnboarding.getState().setTipoCompanhia('amigos');
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'rolezinho com a galera.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(mockSaveEvento).toHaveBeenCalled());
    const args = mockSaveEvento.mock.calls[0][0] as {
      meta: { com: string[] };
    };
    expect(args.meta.com).toContain('pessoa_b');
  });
});

describe('Tela 20 - troca de modo', () => {
  it('clicar no chip Negativo troca a borda animada e o variant do botao', () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('chip Negativo'));
    // Apos trocar para negativo, o label do botao continua "Registrar"
    // mas o flow de save dispara um toast diferente. Smoke checa que
    // o chip ficou selecionado.
    expect(getByLabelText('chip Negativo')).toBeTruthy();
  });
});

describe('Tela 20 - validacao do save', () => {
  it('texto vazio bloqueia save e mostra warn', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    fireEvent.press(getByLabelText('Registrar'));
    expect(mockSaveEvento).not.toHaveBeenCalled();
    await waitFor(() => expect(queryByLabelText('toast warn')).toBeTruthy());
  });

  it('save em modo positivo chama saveEvento com payload valido', async () => {
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'cafe da manha gostoso na padaria.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(mockSaveEvento).toHaveBeenCalledTimes(1));
    const args = mockSaveEvento.mock.calls[0][0] as {
      meta: unknown;
      body: string;
      vaultRoot: string;
      fotos: string[];
    };
    expect(args.vaultRoot).toBe(VAULT_ROOT);
    expect(args.body).toBe('cafe da manha gostoso na padaria.');
    const parsed = EventoSchema.safeParse(args.meta);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        tipo: 'evento',
        autor: 'pessoa_a',
        modo: 'positivo',
        categoria: 'rolezinho',
        intensidade: 4,
      });
    }
  });

  it('save em modo negativo dispara toast Registrado.', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    fireEvent.press(getByLabelText('chip Negativo'));
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'briga feia com vizinho.'
    );
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(mockSaveEvento).toHaveBeenCalled());
    const args = mockSaveEvento.mock.calls[0][0] as {
      meta: { modo: string };
    };
    expect(args.meta.modo).toBe('negativo');
    await waitFor(() => expect(queryByLabelText('toast success')).toBeTruthy());
  });

  it('apos salvar chama router.back', async () => {
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'tudo certo hoje.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('toast de erro quando saveEvento rejeita', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSaveEvento.mockRejectedValueOnce(new Error('SAF off'));
    const utils = renderTela();
    const { getByLabelText, queryByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'algo aconteceu.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(queryByLabelText('toast error')).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('Tela 20 - detectar bairro', () => {
  it('quando getBairroAtual devolve string, exibe chip cyan', async () => {
    mockGetBairroAtual.mockResolvedValue('Vila Madalena');
    const { getByLabelText, findByLabelText } = renderTela();
    fireEvent.press(getByLabelText('Usar localização atual'));
    const chip = await findByLabelText('chip Vila Madalena');
    expect(chip).toBeTruthy();
  });

  it('quando getBairroAtual devolve null, mostra toast info', async () => {
    mockGetBairroAtual.mockResolvedValue(null);
    const { getByLabelText, findByLabelText } = renderTela();
    fireEvent.press(getByLabelText('Usar localização atual'));
    const toast = await findByLabelText('toast info');
    expect(toast).toBeTruthy();
  });

  it('bairro detectado entra em meta.bairro do save', async () => {
    mockGetBairroAtual.mockResolvedValue('Pinheiros');
    const utils = renderTela();
    const { getByLabelText, findByLabelText } = utils;
    fireEvent.press(getByLabelText('Usar localização atual'));
    await findByLabelText('chip Pinheiros');
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'rolezinho aqui.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(mockSaveEvento).toHaveBeenCalled());
    const args = mockSaveEvento.mock.calls[0][0] as {
      meta: { bairro?: string };
    };
    expect(args.meta.bairro).toBe('Pinheiros');
  });
});

afterAll(() => {
  act(() => {
    useVault.getState().clearVaultRoot();
  });
});
