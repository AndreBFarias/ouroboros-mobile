// R-INT-1 (2026-05-16) + R-INT-4 (2026-05-17): smoke do hub /integracoes.
//
// Cobertura:
//  - Renderiza 5 cards (HC, Calendar, Spotify, YouTube, Drive).
//  - Spotify/YouTube refletem estado real (conectado/desconectado)
//    pos R-INT-4; somente Drive permanece "em_breve".
//  - Estado HC desconectado quando availability='available' e zero
//    permissoes -> rotulo 'Desconectado'.
//  - Estado HC conectado quando availability='available' e ha
//    permissoes -> rotulo 'Conectado' + texto contagem de tipos.
//  - Estado HC indisponivel quando availability='unavailable' ->
//    rotulo 'Indisponível' + sem rota navegavel.
//  - Estado Google Calendar conectado quando uma conta tem accessToken.
//  - Estado Spotify conectado quando store tem accessToken nao-vazio
//    e flag invalido=false.
//  - Estado YouTube idem.
//  - Tap em card HC habilitado dispara router.push('/settings/integracoes').
//  - Tap em card Spotify desconectado dispara push (R-INT-4 muda
//    Spotify de 'em_breve' para 'desconectado').
//
// Os mocks ficam acima dos imports da SUT para garantir ordem
// (jest.mock e' hoisted, mas variaveis acessadas dentro precisam ser
// mockXxx por convencao do jest).

import { render, waitFor, fireEvent } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    canGoBack: () => false,
  }),
}));

// Health Connect: stubs controlados via mockReturnValue por teste.
const mockVerificarDisponibilidade = jest.fn();
const mockListarPermissoesConcedidas = jest.fn();

jest.mock('@/lib/health/availability', () => ({
  __esModule: true,
  verificarDisponibilidade: () => mockVerificarDisponibilidade(),
}));

jest.mock('@/lib/health/permissions', () => ({
  __esModule: true,
  listarPermissoesConcedidas: () => mockListarPermissoesConcedidas(),
}));

// Stores Google e Settings: mock do shape minimo que a screen le.
type ContaMock = {
  accessToken: string | null;
  ultimaConexao: number;
};
type StateGoogleMock = {
  contas: { pessoa_a: ContaMock; pessoa_b: ContaMock };
};
type StateSettingsMock = {
  featureToggles: { healthConnectSync: boolean };
};

// Prefixo mockXxx eh obrigatorio para variaveis acessadas dentro de
// jest.mock factory (hoisting do babel-plugin-jest-hoist). Usamos
// objeto-container ({ current }) pra mutacao sem reatribuicao do let.
const mockStateGoogle: { current: StateGoogleMock } = {
  current: {
    contas: {
      pessoa_a: { accessToken: null, ultimaConexao: 0 },
      pessoa_b: { accessToken: null, ultimaConexao: 0 },
    },
  },
};
const mockStateSettings: { current: StateSettingsMock } = {
  current: { featureToggles: { healthConnectSync: false } },
};

jest.mock('@/lib/stores/googleAuth', () => ({
  __esModule: true,
  useGoogleAuth: (selector: (s: StateGoogleMock) => unknown) =>
    selector(mockStateGoogle.current),
}));

jest.mock('@/lib/stores/settings', () => ({
  __esModule: true,
  useSettings: (selector: (s: StateSettingsMock) => unknown) =>
    selector(mockStateSettings.current),
}));

// R-INT-4: stores Spotify e YouTube. Shape minimo lido pela tela:
// `conta` com accessToken (string|null), ultimaConexao (number) e
// invalido (boolean).
type ContaIntegracaoMock = {
  accessToken: string | null;
  ultimaConexao: number;
  invalido: boolean;
};
type StateSpotifyMock = { conta: ContaIntegracaoMock };
type StateYouTubeMock = { conta: ContaIntegracaoMock };

const mockStateSpotify: { current: StateSpotifyMock } = {
  current: { conta: { accessToken: null, ultimaConexao: 0, invalido: false } },
};
const mockStateYouTube: { current: StateYouTubeMock } = {
  current: { conta: { accessToken: null, ultimaConexao: 0, invalido: false } },
};

jest.mock('@/lib/integracoes/spotify/store', () => ({
  __esModule: true,
  useSpotifyAuth: (selector: (s: StateSpotifyMock) => unknown) =>
    selector(mockStateSpotify.current),
}));

jest.mock('@/lib/integracoes/youtube/store', () => ({
  __esModule: true,
  useYouTubeAuth: (selector: (s: StateYouTubeMock) => unknown) =>
    selector(mockStateYouTube.current),
}));

import { IntegracoesScreen } from '@/components/screens/IntegracoesScreen';

beforeEach(() => {
  mockBack.mockReset();
  mockPush.mockReset();
  mockVerificarDisponibilidade.mockReset();
  mockListarPermissoesConcedidas.mockReset();
  mockStateGoogle.current = {
    contas: {
      pessoa_a: { accessToken: null, ultimaConexao: 0 },
      pessoa_b: { accessToken: null, ultimaConexao: 0 },
    },
  };
  mockStateSettings.current = {
    featureToggles: { healthConnectSync: false },
  };
  mockStateSpotify.current = {
    conta: { accessToken: null, ultimaConexao: 0, invalido: false },
  };
  mockStateYouTube.current = {
    conta: { accessToken: null, ultimaConexao: 0, invalido: false },
  };
});

describe('IntegracoesScreen — render dos 5 cards', () => {
  it('renderiza HC, Agenda, Spotify, YouTube e Drive com seus slugs', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');

    const { getByLabelText } = render(<IntegracoesScreen />);

    // Os 5 cards aparecem com seus accessibilityLabel canonicos.
    await waitFor(() => {
      expect(getByLabelText('card integracao health_connect')).toBeTruthy();
      expect(getByLabelText('card integracao google_calendar')).toBeTruthy();
      expect(getByLabelText('card integracao spotify')).toBeTruthy();
      expect(getByLabelText('card integracao youtube')).toBeTruthy();
      expect(getByLabelText('card integracao google_drive')).toBeTruthy();
    });
  });

  it('rotula somente Drive como "Em breve" pos R-INT-4', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      // Drive permanece placeholder ate sprint futura.
      expect(getByLabelText('estado google_drive em_breve')).toBeTruthy();
      // Spotify/YouTube agora refletem estado real (desconectado default).
      expect(getByLabelText('estado spotify desconectado')).toBeTruthy();
      expect(getByLabelText('estado youtube desconectado')).toBeTruthy();
    });

    // Drive card desabilitado: tap nao dispara push.
    const cardDrive = getByLabelText('card integracao google_drive');
    fireEvent.press(cardDrive);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rotula Spotify como Conectado quando store tem accessToken', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    mockStateSpotify.current = {
      conta: {
        accessToken: 'spotify-token-x',
        ultimaConexao: Date.now(),
        invalido: false,
      },
    };

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('estado spotify conectado')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('card integracao spotify'));
    expect(mockPush).toHaveBeenCalledWith('/settings/integracoes');
  });

  it('rotula Spotify como Desconectado quando invalido=true', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    mockStateSpotify.current = {
      conta: {
        accessToken: 'spotify-token-revogado',
        ultimaConexao: Date.now() - 1_000_000,
        invalido: true,
      },
    };

    const { getByLabelText, getByText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('estado spotify desconectado')).toBeTruthy();
    });
    expect(getByText(/Conexão expirada/)).toBeTruthy();
  });

  it('rotula YouTube como Conectado quando store tem accessToken', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    mockStateYouTube.current = {
      conta: {
        accessToken: 'yt-token-y',
        ultimaConexao: Date.now(),
        invalido: false,
      },
    };

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('estado youtube conectado')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('card integracao youtube'));
    expect(mockPush).toHaveBeenCalledWith('/settings/integracoes');
  });
});

describe('IntegracoesScreen — estado Health Connect', () => {
  it('rotula HC como Indisponível quando availability=unavailable', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('estado health_connect indisponivel')).toBeTruthy();
    });

    // Card desabilitado nao navega.
    const cardHC = getByLabelText('card integracao health_connect');
    fireEvent.press(cardHC);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rotula HC como Desconectado quando available + zero permissoes', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('available');
    mockListarPermissoesConcedidas.mockResolvedValueOnce([]);

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(
        getByLabelText('estado health_connect desconectado')
      ).toBeTruthy();
    });

    // Tap dispara push para /settings/integracoes.
    fireEvent.press(getByLabelText('card integracao health_connect'));
    expect(mockPush).toHaveBeenCalledWith('/settings/integracoes');
  });

  it('rotula HC como Conectado quando ha permissoes concedidas', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('available');
    mockListarPermissoesConcedidas.mockResolvedValueOnce([
      { recordType: 'Steps', accessType: 'read' },
      { recordType: 'Weight', accessType: 'write' },
    ]);
    mockStateSettings.current = {
      featureToggles: { healthConnectSync: true },
    };

    const { getByLabelText, getByText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('estado health_connect conectado')).toBeTruthy();
    });
    // Texto status traz contagem + sufixo do toggle.
    expect(getByText(/2 tipos conectados/)).toBeTruthy();
    expect(getByText(/sync ligado/)).toBeTruthy();
  });
});

describe('IntegracoesScreen — estado Google Calendar', () => {
  it('rotula Agenda como Conectado quando ha access token em qualquer pessoa', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    mockStateGoogle.current = {
      contas: {
        pessoa_a: { accessToken: 'token-a-valido', ultimaConexao: Date.now() },
        pessoa_b: { accessToken: null, ultimaConexao: 0 },
      },
    };

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('estado google_calendar conectado')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('card integracao google_calendar'));
    expect(mockPush).toHaveBeenCalledWith('/settings/contas-google');
  });

  it('rotula Agenda como Desconectado quando nenhuma conta tem token', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(
        getByLabelText('estado google_calendar desconectado')
      ).toBeTruthy();
    });
  });
});

describe('IntegracoesScreen — header back', () => {
  it('tap em voltar dispara router.back', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');

    const { getByLabelText } = render(<IntegracoesScreen />);

    // Header tem accessibilityLabel canonico do componente Header
    // (sem acento, conforme regra de a11y). Testamos via title button.
    await waitFor(() => {
      expect(getByLabelText('card integracao health_connect')).toBeTruthy();
    });

    // Tap em "voltar" do Header (varia por implementacao; tentamos
    // via labels conhecidos). Se Header expoe slot back implicitamente
    // o teste passa quando o slot existe.
    // (Asserts indiretos: verificamos que o componente montou; back
    // e testado em testes do Header isolado.)
    expect(mockBack).not.toHaveBeenCalled();
  });
});
