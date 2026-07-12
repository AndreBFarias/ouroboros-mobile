// Testes do writer reativo de stats agregadas
// (R-VAULT-CANONICAL-COMPLETE-B). Cobre:
//   - escreverStatsAgregadas le todas as listas e escreve via
//     escreverEstadoCanonicoImediato com a key correta.
//   - escreverStatsAgregadas no-op quando vault nao autorizado.
//   - agendarRecalculoStats agrupa rajadas em 1 write trailing-edge.
//   - agendarRecalculoStats keys distintas (7d, 30d) nao se interferem.
//   - agendarRecalculoStatsTodos agenda os 4 periodos.
//
// Mocks: useVault + leitores de Vault + escreverEstadoCanonicoImediato.
// Schemas reais para garantir que validacao passa contra o shape
// canonico.
//
// Comentarios sem acento.

const mockEscreverImediato = jest.fn(
  (_key: string, _payload: Record<string, unknown>): Promise<void> =>
    Promise.resolve()
);

jest.mock('@/lib/vault/escreverEstado', () => ({
  __esModule: true,
  escreverEstadoCanonicoImediato: (
    key: string,
    payload: Record<string, unknown>
  ) => mockEscreverImediato(key, payload),
  ESTADO_FOLDER: '_estado',
}));

const mockListas = {
  humor: [] as unknown[],
  diarios: [] as unknown[],
  eventos: [] as unknown[],
  marcos: [] as unknown[],
  contadores: [] as unknown[],
  tarefas: [] as unknown[],
};

jest.mock('@/lib/vault/humor', () => ({
  __esModule: true,
  listarHumor: jest.fn(() => Promise.resolve(mockListas.humor)),
}));

jest.mock('@/lib/vault/diario', () => ({
  __esModule: true,
  listarDiarios: jest.fn(() => Promise.resolve(mockListas.diarios)),
}));

jest.mock('@/lib/vault/eventos', () => ({
  __esModule: true,
  listarEventos: jest.fn(() => Promise.resolve(mockListas.eventos)),
}));

jest.mock('@/lib/vault/marcos', () => ({
  __esModule: true,
  listarMarcos: jest.fn(() => Promise.resolve(mockListas.marcos)),
}));

jest.mock('@/lib/vault/contadores', () => ({
  __esModule: true,
  listarContadores: jest.fn(() => Promise.resolve(mockListas.contadores)),
}));

jest.mock('@/lib/vault/tarefas', () => ({
  __esModule: true,
  listarTarefas: jest.fn(() => Promise.resolve(mockListas.tarefas)),
}));

const mockVaultState = {
  vaultRoot: 'content://test/vault' as string | null,
};

jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: {
    getState: () => ({ vaultRoot: mockVaultState.vaultRoot }),
  },
}));

import {
  escreverStatsAgregadas,
  agendarRecalculoStats,
  agendarRecalculoStatsTodos,
  STATS_DEBOUNCE_MS,
  _flushDebounceStats,
  _resetEscreverStats,
} from '@/lib/stats/escreverStats';
import { STATS_KEY_POR_PERIODO } from '@/lib/schemas/vault_estado';

describe('stats/escreverStats: escreverStatsAgregadas', () => {
  beforeEach(() => {
    mockVaultState.vaultRoot = 'content://test/vault';
    mockEscreverImediato.mockClear();
    mockListas.humor = [];
    mockListas.diarios = [];
    mockListas.eventos = [];
    mockListas.marcos = [];
    mockListas.contadores = [];
    mockListas.tarefas = [];
    _resetEscreverStats();
  });

  it('escreve stats-7d com vault vazio (count zerado)', async () => {
    await escreverStatsAgregadas('7d');
    expect(mockEscreverImediato).toHaveBeenCalledTimes(1);
    const [key, payload] = mockEscreverImediato.mock.calls[0];
    expect(key).toBe(STATS_KEY_POR_PERIODO['7d']);
    expect(payload).toMatchObject({
      version: 1,
      periodo: '7d',
      humorMedio7d: null,
      humorMedio30d: null,
      humorMedio90d: null,
      humorMedioAll: null,
      countPorTipo: {
        humor: 0,
        diario_gatilho: 0,
        diario_conquista: 0,
        diario_reflexao: 0,
        marco: 0,
        evento_positivo: 0,
        evento_negativo: 0,
        contador: 0,
        tarefa_concluida: 0,
      },
      streaksAtuais: {},
      topGatilhosUltimos90d: [],
      topConquistas: [],
    });
  });

  it('escreve stats-all com chave canonica', async () => {
    await escreverStatsAgregadas('all');
    const [key, payload] = mockEscreverImediato.mock.calls[0];
    expect(key).toBe('stats-all');
    expect(payload).toMatchObject({ periodo: 'all' });
  });

  it('no-op quando vault nao autorizado (root null)', async () => {
    mockVaultState.vaultRoot = null;
    await escreverStatsAgregadas('7d');
    expect(mockEscreverImediato).not.toHaveBeenCalled();
  });

  it('silencia erro de leitura (best-effort)', async () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const { listarHumor } = jest.requireMock('@/lib/vault/humor') as {
      listarHumor: jest.Mock;
    };
    listarHumor.mockRejectedValueOnce(new Error('SAF down'));
    await expect(escreverStatsAgregadas('30d')).resolves.toBeUndefined();
    // Write nao acontece (Promise.all rejeitou); ainda assim resolve.
    expect(mockEscreverImediato).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('stats/escreverStats: debounce', () => {
  beforeEach(() => {
    mockVaultState.vaultRoot = 'content://test/vault';
    mockEscreverImediato.mockClear();
    _resetEscreverStats();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exporta STATS_DEBOUNCE_MS = 30_000', () => {
    expect(STATS_DEBOUNCE_MS).toBe(30_000);
  });

  it('agrupa 3 agendamentos do mesmo periodo em 1 write', async () => {
    agendarRecalculoStats('7d');
    agendarRecalculoStats('7d');
    agendarRecalculoStats('7d');

    expect(mockEscreverImediato).not.toHaveBeenCalled();

    jest.useRealTimers();
    await _flushDebounceStats();

    expect(mockEscreverImediato).toHaveBeenCalledTimes(1);
    expect(mockEscreverImediato.mock.calls[0][0]).toBe('stats-7d');
  });

  it('periodos distintos rodam em paralelo (4 writes)', async () => {
    agendarRecalculoStats('7d');
    agendarRecalculoStats('30d');
    agendarRecalculoStats('90d');
    agendarRecalculoStats('all');

    expect(mockEscreverImediato).not.toHaveBeenCalled();

    jest.useRealTimers();
    await _flushDebounceStats();

    expect(mockEscreverImediato).toHaveBeenCalledTimes(4);
    const keys = mockEscreverImediato.mock.calls.map((c) => c[0]).sort();
    expect(keys).toEqual([
      'stats-30d',
      'stats-7d',
      'stats-90d',
      'stats-all',
    ]);
  });

  it('agendarRecalculoStatsTodos agenda os 4 periodos', async () => {
    agendarRecalculoStatsTodos();
    expect(mockEscreverImediato).not.toHaveBeenCalled();

    jest.useRealTimers();
    await _flushDebounceStats();

    expect(mockEscreverImediato).toHaveBeenCalledTimes(4);
  });

  it('no-op quando vault nao autorizado (sem agendar timer)', async () => {
    mockVaultState.vaultRoot = null;
    agendarRecalculoStats('7d');
    jest.useRealTimers();
    await _flushDebounceStats();
    expect(mockEscreverImediato).not.toHaveBeenCalled();
  });
});
