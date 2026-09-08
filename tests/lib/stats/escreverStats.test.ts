// Testes do writer reativo de stats agregadas
// (R-VAULT-CANONICAL-COMPLETE-B). Cobre:
//   - escreverStatsAgregadas le todas as listas e escreve via
//     escreverEstadoCanonicoImediato com a key correta.
//   - escreverStatsAgregadas no-op quando vault nao autorizado.
//   - agendarRecalculoStats agrupa rajadas em 1 write trailing-edge.
//   - agendarRecalculoStats keys distintas (7d, 30d) nao se interferem.
//   - agendarRecalculoStatsTodos agenda os 4 periodos.
//   - EXE-3: listarTreinos e' chamado uma vez por execucao e as duas
//     chaves de treino chegam ao payload escrito. Este e' o teste do
//     unico caller de producao de calcularStatsAgregadas: `treinos` e'
//     opcional no input, entao um caller que esquecer de passar recebe
//     zero em silencio -- que foi exatamente o defeito. Caller novo em
//     sprint futura precisa de um caso equivalente.
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
  treinos: [] as unknown[],
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

jest.mock('@/lib/vault/treinos', () => ({
  __esModule: true,
  listarTreinos: jest.fn(() => Promise.resolve(mockListas.treinos)),
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
import {
  STATS_KEY_POR_PERIODO,
  EstadoStatsAgregadasSchema,
} from '@/lib/schemas/vault_estado';
import {
  stringifyFrontmatter,
  parseFrontmatter,
} from '@/lib/vault/frontmatter';
import { TreinoSessaoSchema } from '@/lib/schemas/treino_sessao';

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
    mockListas.treinos = [];
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
        treino_sessao: 0,
        treino_minutos: 0,
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

// EXE-3 -- o caller de producao passa treinos, e o artefato carrega as
// duas chaves.
//
// As sessoes sao datadas em relacao ao AGORA real porque
// escreverStatsAgregadas nao injeta `agora` -- calcularStatsAgregadas
// cai em new Date(). Offsets de -1 e -3 dias ficam dentro de '7d' a
// qualquer hora do dia; -20 fica fora de '7d' e dentro de '30d'.
function sessaoOffset(dias: number, duracaoMin: number, rotina: string) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return TreinoSessaoSchema.parse({
    tipo: 'treino_sessao',
    // toISOString devolve milissegundos ('...T13:04:05.123Z'), e o
    // Iso8601 de treino_sessao.ts nao os aceita -- cortamos aqui em vez
    // de afrouxar o schema.
    data: d.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    autor: 'pessoa_a',
    rotina,
    duracao_min: duracaoMin,
    exercicios: [{ nome: 'Agachamento', series: 3, reps: 12 }],
  });
}

describe('stats/escreverStats: as sessoes de treino entram no agregado', () => {
  beforeEach(() => {
    mockVaultState.vaultRoot = 'content://test/vault';
    mockEscreverImediato.mockClear();
    mockListas.humor = [];
    mockListas.diarios = [];
    mockListas.eventos = [];
    mockListas.marcos = [];
    mockListas.contadores = [];
    mockListas.tarefas = [];
    mockListas.treinos = [
      sessaoOffset(1, 45, 'Rotina A'),
      sessaoOffset(3, 60, 'Rotina B'),
      sessaoOffset(20, 30, 'Rotina C'),
    ];
    _resetEscreverStats();
  });

  it('chama listarTreinos exatamente uma vez por execucao', async () => {
    // AC-2. Sem este caso, `treinos?` opcional deixa o writer voltar a
    // esquecer a leitura sem que nada fique vermelho: o campo ausente
    // vira zero, e zero e' um numero plausivel.
    const { listarTreinos } = jest.requireMock('@/lib/vault/treinos') as {
      listarTreinos: jest.Mock;
    };
    listarTreinos.mockClear();

    await escreverStatsAgregadas('7d');
    expect(listarTreinos).toHaveBeenCalledTimes(1);
    expect(listarTreinos).toHaveBeenCalledWith('content://test/vault');
  });

  it('o payload de 7d traz treino_sessao 2 e treino_minutos 105', async () => {
    await escreverStatsAgregadas('7d');
    const [, payload] = mockEscreverImediato.mock.calls[0];
    const count = (payload as { countPorTipo: Record<string, number> })
      .countPorTipo;
    expect(count.treino_sessao).toBe(2);
    expect(count.treino_minutos).toBe(105);
  });

  it("o payload de 'all' alcanca a sessao antiga: 3 e 135", async () => {
    await escreverStatsAgregadas('all');
    const [, payload] = mockEscreverImediato.mock.calls[0];
    const count = (payload as { countPorTipo: Record<string, number> })
      .countPorTipo;
    expect(count.treino_sessao).toBe(3);
    expect(count.treino_minutos).toBe(135);
  });

  it('o .md gerado volta pelo parser real com os dois numeros de pe', async () => {
    // AC-3. Nao vale grep de substring no texto: '2' aparece em meia
    // duzia de campos de um stats-*.md. Aqui o payload atravessa a mesma
    // serializacao que writeVaultFile usa (stringifyFrontmatter), e
    // volta por parseFrontmatter + EstadoStatsAgregadasSchema, que e' o
    // caminho do leitor. So fecha o circuito quem sobrevive ao YAML.
    await escreverStatsAgregadas('7d');
    const [, payload] = mockEscreverImediato.mock.calls[0];

    const md = stringifyFrontmatter(payload, '');
    expect(md.startsWith('---\n')).toBe(true);

    const { meta } = parseFrontmatter(md, EstadoStatsAgregadasSchema);
    expect(meta.periodo).toBe('7d');
    expect(meta.countPorTipo.treino_sessao).toBe(2);
    expect(meta.countPorTipo.treino_minutos).toBe(105);
  });

  it('vault com treinos, mas sem nenhum no periodo, escreve zero e nao chave ausente', async () => {
    mockListas.treinos = [sessaoOffset(20, 30, 'Rotina C')];
    await escreverStatsAgregadas('7d');
    const [, payload] = mockEscreverImediato.mock.calls[0];
    const count = (payload as { countPorTipo: Record<string, number> })
      .countPorTipo;
    expect(count.treino_sessao).toBe(0);
    expect(count.treino_minutos).toBe(0);
    expect(Object.keys(count)).toContain('treino_sessao');
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
