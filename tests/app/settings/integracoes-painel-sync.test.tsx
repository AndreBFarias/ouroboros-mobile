// R-INT-3-HC-SYNC-PAINEL (2026-05-26): teste do painel de sincronizacao
// HC na tela /settings/integracoes.
//
// Cobertura:
//  - Painel "Sincronizacao" oculto quando nao ha permissoes concedidas
//    (HC desconectado/indisponivel).
//  - Painel visivel quando ha permissoes; lista "Ultima sync: <tipo> ha N"
//    apenas para tipos com sync registrada (non-null no store), pulando os
//    null. Telemetria "Ultima rodada: N novos registros" da
//    hcAutopullUltimaRodada.
//  - Tap em "Sincronizar agora" chama o orquestrador e dispara toast de
//    sucesso (mock do orquestrador para nao tocar puxadores nativos).
//
// Usa o store REAL (useSettings) para seedar hcAutopullUltimaSync /
// hcAutopullUltimaRodada e observar a reacao do painel. Mocka apenas o
// stack nativo HC (availability/permissions), os 5 puxadores, o
// orquestrador, expo-router e haptics.
//
// Mocks acima dos imports da SUT (jest.mock e' hoisted). Comentarios sem
// acento (convencao shell/CI).

import { render, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => false,
  }),
}));

// Haptics: no-op para nao depender de modulo nativo.
jest.mock('@/lib/haptics', () => ({
  __esModule: true,
  haptics: {
    light: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
  },
}));

// Stack nativo HC controlado por teste.
const mockVerificarDisponibilidade = jest.fn();
const mockListarPermissoesConcedidas = jest.fn();
jest.mock('@/lib/health/availability', () => ({
  __esModule: true,
  verificarDisponibilidade: () => mockVerificarDisponibilidade(),
  inicializarHealthConnect: () => Promise.resolve(true),
  abrirSettingsHealthConnect: jest.fn(),
}));
jest.mock('@/lib/health/permissions', () => ({
  __esModule: true,
  solicitarPermissoesCanonicas: () => Promise.resolve([]),
  listarPermissoesConcedidas: () => mockListarPermissoesConcedidas(),
  revogarTodas: () => Promise.resolve(),
}));

// Puxadores: stubs leves (a tela so os agrega num array; o orquestrador
// e' mockado, entao o conteudo nao importa, mas o import precisa
// resolver sem arrastar bridge nativa).
jest.mock('@/lib/health/puxadores/passos', () => ({
  __esModule: true,
  puxadorPassos: { tipo: 'Steps', puxar: jest.fn() },
}));
jest.mock('@/lib/health/puxadores/exercicio', () => ({
  __esModule: true,
  puxadorExercicio: { tipo: 'ExerciseSession', puxar: jest.fn() },
}));
jest.mock('@/lib/health/puxadores/medidas', () => ({
  __esModule: true,
  puxadorMedidas: { tipo: 'Weight', puxar: jest.fn() },
}));
jest.mock('@/lib/health/puxadores/menstruacao', () => ({
  __esModule: true,
  puxadorMenstruacao: { tipo: 'MenstruationFlow', puxar: jest.fn() },
}));
jest.mock('@/lib/health/puxadores/sleep', () => ({
  __esModule: true,
  puxadorSono: { tipo: 'SleepSession', puxar: jest.fn() },
}));

// Orquestrador: mock para o teste do botao "Sincronizar agora" controlar
// o resultado sem tocar HC real.
const mockOrquestrar = jest.fn();
jest.mock('@/lib/health/autopullScheduler', () => ({
  __esModule: true,
  orquestrarHCAutopull: (...args: unknown[]) => mockOrquestrar(...args),
}));

import SettingsIntegracoesScreen from '@/../app/settings/integracoes';
import { useSettings } from '@/lib/stores/settings';
import { ToastProvider } from '@/components/ui/Toast';

const PERMS_DUAS = [
  { recordType: 'Steps', accessType: 'read' as const },
  { recordType: 'Weight', accessType: 'read' as const },
];

function renderTela() {
  return render(
    <ToastProvider>
      <SettingsIntegracoesScreen />
    </ToastProvider>
  );
}

describe('R-INT-3-HC-SYNC-PAINEL — painel de sincronizacao', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
    mockVerificarDisponibilidade.mockReset();
    mockListarPermissoesConcedidas.mockReset();
    mockOrquestrar.mockReset();
  });

  it('oculta o painel quando nao ha permissoes (HC indisponivel)', async () => {
    mockVerificarDisponibilidade.mockResolvedValue('unavailable');
    mockListarPermissoesConcedidas.mockResolvedValue([]);

    const tree = renderTela();
    // Aguarda o carregar() assincrono assentar.
    await waitFor(() => expect(tree.getByText(/Status:/)).toBeTruthy());

    expect(
      tree.queryByLabelText('painel sincronizacao health connect')
    ).toBeNull();
  });

  it('mostra o painel com ultima sync por tipo (pula tipos null) + telemetria', async () => {
    mockVerificarDisponibilidade.mockResolvedValue('available');
    mockListarPermissoesConcedidas.mockResolvedValue(PERMS_DUAS);

    // Seed: Steps e Weight com sync; demais null (nao devem aparecer).
    const agora = Date.now();
    useSettings.setState({
      hcAutopullUltimaSync: {
        Steps: new Date(agora - 3 * 60 * 60 * 1000).toISOString(),
        Weight: new Date(agora - 2 * 24 * 60 * 60 * 1000).toISOString(),
        ExerciseSession: null,
        BodyFat: null,
        HeartRate: null,
        SleepSession: null,
        MenstruationFlow: null,
      },
      hcAutopullUltimaRodada: {
        rodadoEm: new Date(agora - 5 * 60 * 1000).toISOString(),
        novos: 12,
        erros: 0,
      },
    });

    const tree = renderTela();
    await waitFor(() =>
      expect(
        tree.getByLabelText('painel sincronizacao health connect')
      ).toBeTruthy()
    );

    // Tipos com sync aparecem com a frase relativa correta.
    expect(tree.getByText('Última sync: Passos há 3h')).toBeTruthy();
    expect(tree.getByText('Última sync: Peso há 2 dias')).toBeTruthy();
    // Tipos null NAO aparecem.
    expect(tree.queryByText(/Sono/)).toBeNull();
    expect(tree.queryByText(/Ciclo menstrual/)).toBeNull();
    // Telemetria (plural).
    expect(
      tree.getByText('Última rodada: 12 novos registros (há 5 min)')
    ).toBeTruthy();
  });

  it('telemetria no singular quando 1 novo registro', async () => {
    mockVerificarDisponibilidade.mockResolvedValue('available');
    mockListarPermissoesConcedidas.mockResolvedValue(PERMS_DUAS);
    useSettings.setState({
      hcAutopullUltimaRodada: {
        rodadoEm: new Date(Date.now() - 30 * 1000).toISOString(),
        novos: 1,
        erros: 0,
      },
    });

    const tree = renderTela();
    await waitFor(() =>
      expect(
        tree.getByLabelText('painel sincronizacao health connect')
      ).toBeTruthy()
    );
    // delta < 1 min -> "agora mesmo".
    expect(
      tree.getByText('Última rodada: 1 novo registro (agora mesmo)')
    ).toBeTruthy();
  });

  it('sem sync registrada mostra fallback factual (sem gamificacao)', async () => {
    mockVerificarDisponibilidade.mockResolvedValue('available');
    mockListarPermissoesConcedidas.mockResolvedValue(PERMS_DUAS);
    // resetar() ja deixou tudo null e telemetria undefined.

    const tree = renderTela();
    await waitFor(() =>
      expect(
        tree.getByLabelText('painel sincronizacao health connect')
      ).toBeTruthy()
    );
    expect(tree.getByText('Ainda sem sincronização registrada.')).toBeTruthy();
  });

  it('botao "Sincronizar agora" chama o orquestrador e mostra toast de sucesso', async () => {
    mockVerificarDisponibilidade.mockResolvedValue('available');
    mockListarPermissoesConcedidas.mockResolvedValue(PERMS_DUAS);
    mockOrquestrar.mockResolvedValue({
      rodadoEm: new Date().toISOString(),
      tipos: [
        { tipo: 'Steps', novos: 3, erro: null },
        { tipo: 'Weight', novos: 1, erro: null },
      ],
    });

    const tree = renderTela();
    await waitFor(() =>
      expect(tree.getByLabelText('sincronizar agora')).toBeTruthy()
    );

    fireEvent.press(tree.getByLabelText('sincronizar agora'));

    await waitFor(() => expect(mockOrquestrar).toHaveBeenCalledTimes(1));
    // O array passado tem os 5 puxadores canonicos.
    const arg = mockOrquestrar.mock.calls[0][0] as Array<{ tipo: string }>;
    expect(arg).toHaveLength(5);
    expect(arg.map((p) => p.tipo)).toContain('Steps');
    // Toast factual de sucesso (4 novos no total).
    await waitFor(() =>
      expect(tree.getByText('Sincronizado. 4 novos registros.')).toBeTruthy()
    );
  });
});
