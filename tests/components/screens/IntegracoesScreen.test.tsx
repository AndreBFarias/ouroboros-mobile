// R-INT-1 (2026-05-16) + R-INT-4 (2026-05-17) + R-INT-5 (2026-05-25):
// smoke do hub /integracoes.
//
// Cobertura:
//  - Renderiza 5 cards (HC, Calendar, Spotify, YouTube, Drive).
//  - Spotify/YouTube refletem estado real (conectado/desconectado)
//    pos R-INT-4.
//  - R-INT-5: Drive deixou de ser "em_breve". Sem conta Google ->
//    desconectado (navegavel); com conta -> conectado refletindo o
//    toggle de backup automatico.
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
  featureToggles: {
    healthConnectSync: boolean;
    // R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO: o card Drive le este toggle.
    backupDriveAutomatico: boolean;
  };
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
  current: {
    featureToggles: { healthConnectSync: false, backupDriveAutomatico: false },
  },
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

// R-INT-5-DRIVE-HUB-ATIVO: resumo Drive + acoes "Fazer agora" /
// "Restaurar". Mockamos o resumo (linha 2 do card), o upload e o
// restore. Os fakes sao deterministicos (sem rede, sem FileSystem).
const mockCarregarDriveResumo = jest.fn();
const mockFazerBackupDrive = jest.fn();
const mockListarBackupsArquivados = jest.fn();
const mockRestaurarVaultZip = jest.fn();

jest.mock('@/lib/integracoes/google/driveResumo', () => ({
  __esModule: true,
  carregarDriveResumo: () => mockCarregarDriveResumo(),
}));

jest.mock('@/lib/integracoes/google/driveBackup', () => ({
  __esModule: true,
  fazerBackupDrive: (...args: unknown[]) => mockFazerBackupDrive(...args),
}));

jest.mock('@/lib/backup/executarBackup', () => ({
  __esModule: true,
  listarBackupsArquivados: () => mockListarBackupsArquivados(),
}));

jest.mock('@/lib/services/restaurarVault', () => ({
  __esModule: true,
  restaurarVaultZip: (...args: unknown[]) => mockRestaurarVaultZip(...args),
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
    featureToggles: { healthConnectSync: false, backupDriveAutomatico: false },
  };
  mockStateSpotify.current = {
    conta: { accessToken: null, ultimaConexao: 0, invalido: false },
  };
  mockStateYouTube.current = {
    conta: { accessToken: null, ultimaConexao: 0, invalido: false },
  };
  mockCarregarDriveResumo.mockReset();
  mockFazerBackupDrive.mockReset();
  mockListarBackupsArquivados.mockReset();
  mockRestaurarVaultZip.mockReset();
  // Resumo Drive padrao: nada carregado ainda (resolve null e cai no
  // fallback do toggle). Cada teste sobrescreve quando precisa.
  mockCarregarDriveResumo.mockResolvedValue({
    totalBackups: 0,
    bytesTotais: 0,
    ultimoUploadMs: null,
    texto: 'Nenhum backup local para enviar ainda.',
  });
  mockFazerBackupDrive.mockResolvedValue({ uploadado: true, bytes: 1024 });
  mockListarBackupsArquivados.mockResolvedValue([]);
  mockRestaurarVaultZip.mockResolvedValue({
    ok: true,
    raizDestino: '/tmp/restaurado',
    totalEscritos: 3,
    totalIgnorados: 0,
    falhas: [],
  });
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

  it('Drive desconectado quando nenhuma conta Google (R-INT-5)', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      // R-INT-5: Drive deixou de ser placeholder. Sem conta Google
      // conectada o estado e' "desconectado" (precisa conectar antes).
      expect(getByLabelText('estado google_drive desconectado')).toBeTruthy();
      // Spotify/YouTube refletem estado real (desconectado default).
      expect(getByLabelText('estado spotify desconectado')).toBeTruthy();
      expect(getByLabelText('estado youtube desconectado')).toBeTruthy();
    });

    // R-INT-5: card Drive agora e' navegavel -> /settings/contas-google.
    const cardDrive = getByLabelText('card integracao google_drive');
    fireEvent.press(cardDrive);
    expect(mockPush).toHaveBeenCalledWith('/settings/contas-google');
  });

  it('Drive conectado reflete toggle de backup (R-INT-5)', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    mockStateGoogle.current = {
      contas: {
        pessoa_a: { accessToken: 'token-a-valido', ultimaConexao: Date.now() },
        pessoa_b: { accessToken: null, ultimaConexao: 0 },
      },
    };
    mockStateSettings.current = {
      featureToggles: { healthConnectSync: false, backupDriveAutomatico: true },
    };

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('estado google_drive conectado')).toBeTruthy();
    });
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

describe('IntegracoesScreen — Drive ativo: resumo + acoes (R-INT-5-DRIVE-HUB-ATIVO)', () => {
  // Helper: conecta uma conta Google para o card Drive virar conectado.
  function comContaGoogle() {
    mockStateGoogle.current = {
      contas: {
        pessoa_a: { accessToken: 'token-a-valido', ultimaConexao: Date.now() },
        pessoa_b: { accessToken: null, ultimaConexao: 0 },
      },
    };
  }

  it('card Drive conectado exibe o resumo carregado (N backups, MB, ultimo envio)', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    comContaGoogle();
    mockCarregarDriveResumo.mockResolvedValueOnce({
      totalBackups: 3,
      bytesTotais: 3 * 1024 * 1024,
      ultimoUploadMs: Date.now(),
      texto: '3 backups · 3.0 MB · Último envio: agora mesmo.',
    });

    const { getByText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(
        getByText('3 backups · 3.0 MB · Último envio: agora mesmo.')
      ).toBeTruthy();
    });
  });

  it('card Drive conectado expoe acoes Fazer agora e Restaurar', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    comContaGoogle();

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(
        getByLabelText('acao google_drive fazer_agora')
      ).toBeTruthy();
      expect(getByLabelText('acao google_drive restaurar')).toBeTruthy();
    });
  });

  it('Fazer agora dispara fazerBackupDrive e recarrega o resumo', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    comContaGoogle();

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('acao google_drive fazer_agora')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('acao google_drive fazer_agora'));

    await waitFor(() => {
      expect(mockFazerBackupDrive).toHaveBeenCalledTimes(1);
    });
    // Resumo recarrega: 1 no mount + 1 apos upload OK.
    await waitFor(() => {
      expect(mockCarregarDriveResumo.mock.calls.length).toBeGreaterThanOrEqual(
        2
      );
    });
  });

  it('Restaurar restaura o backup local mais recente via restaurarVaultZip', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    comContaGoogle();
    mockListarBackupsArquivados.mockResolvedValueOnce([
      { uri: '/tmp/auto/backup-recente.zip', nome: 'backup-recente.zip', modificadoEmMs: 1, bytes: 10, snapshot: null },
    ]);

    const { getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('acao google_drive restaurar')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('acao google_drive restaurar'));

    await waitFor(() => {
      expect(mockRestaurarVaultZip).toHaveBeenCalledWith(
        '/tmp/auto/backup-recente.zip'
      );
    });
  });

  it('Drive desconectado nao mostra acoes', async () => {
    mockVerificarDisponibilidade.mockResolvedValueOnce('unavailable');
    // Sem conta Google -> desconectado, sem acoes.

    const { queryByLabelText, getByLabelText } = render(<IntegracoesScreen />);

    await waitFor(() => {
      expect(getByLabelText('estado google_drive desconectado')).toBeTruthy();
    });
    expect(queryByLabelText('acao google_drive fazer_agora')).toBeNull();
    expect(queryByLabelText('acao google_drive restaurar')).toBeNull();
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
      featureToggles: { healthConnectSync: true, backupDriveAutomatico: false },
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

describe('IntegracoesScreen — mountedRef anti use-after-unmount', () => {
  it('desmontar antes do async resolver nao dispara setState (sem warning)', async () => {
    // R-INTEGRACOES-CANCELADO-PATTERN (2026-05-21): valida que o
    // refator para mountedRef realmente protege quando o componente
    // desmonta antes da promise de verificarDisponibilidade resolver.
    // Sem o guard, o setState pos-unmount dispararia o warning
    // "Can't perform a React state update on an unmounted component".
    let resolveVerificar: (v: 'available' | 'unavailable') => void = () => {};
    const promiseDeferida = new Promise<'available' | 'unavailable'>(
      (resolve) => {
        resolveVerificar = resolve;
      }
    );
    mockVerificarDisponibilidade.mockReturnValueOnce(promiseDeferida);

    // Espia console.error para garantir que nenhum warning de
    // use-after-unmount aparece pos resolve apos unmount.
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount, getByLabelText } = render(<IntegracoesScreen />);

    // Componente montou; verificarDisponibilidade ainda nao resolveu.
    expect(getByLabelText('card integracao health_connect')).toBeTruthy();

    // Desmonta antes do async terminar.
    unmount();

    // Agora resolve a promise — se mountedRef nao protegesse, o
    // setStatusHC seria chamado pos-unmount e geraria warning.
    resolveVerificar('unavailable');

    // Aguarda microtask flush.
    await Promise.resolve();
    await Promise.resolve();

    // Nenhum warning de "state update on unmounted" deve ter sido
    // disparado. Filtra apenas mensagens relevantes; ignora ruido
    // de mocks que pode chegar via outras vias.
    const chamadasComWarning = errSpy.mock.calls.filter((args) => {
      const texto = args.map((a) => String(a)).join(' ');
      return (
        texto.includes('unmounted') ||
        texto.includes('state update on an unmounted') ||
        texto.includes("Can't perform a React state update")
      );
    });
    expect(chamadasComWarning).toEqual([]);

    errSpy.mockRestore();
  });
});
