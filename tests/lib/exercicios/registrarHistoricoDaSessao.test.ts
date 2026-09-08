// EXE-3B: a sessao de treino grava carga, series e reps no historico do
// exercicio cadastrado.
//
// O teste roda contra um Vault em memoria: reader e writer sao mocados,
// mas o conteudo trafega SERIALIZADO pelos helpers reais de frontmatter,
// e a leitura de volta e' feita pelo `lerExercicio` de producao. Ou seja
// o circuito fecha no consumidor -- se o append produzir algo que o
// ExercicioSchema recusa, a leitura levanta em vez de passar por
// coincidencia de substring.
//
// A maior parte dos casos e' dirigida pelo `saveTreino`, que e' o caminho
// real da UI (executor de rotina, sheet e "Duplicar pra hoje"). Chamar a
// funcao isolada provaria a funcao, nao a ponte.
//
// Comentarios sem acento (convencao shell/CI).
import type { Exercicio } from '@/lib/schemas/exercicio';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

// Vault em memoria: uri -> conteudo .md serializado.
const mockArquivos = new Map<string, string>();
// URIs cuja escrita deve falhar (simula EACCES / SAF recusando).
const mockEscritaProibida = new Set<string>();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: jest.fn(async () => []),
  readVaultFile: jest.fn(async (uri: string, schema: unknown) => {
    const raw = mockArquivos.get(uri);
    if (raw === undefined) return null;
    const { parseFrontmatter } = jest.requireActual(
      '@/lib/vault/frontmatter'
    ) as typeof import('@/lib/vault/frontmatter');
    return parseFrontmatter(raw, schema as never);
  }),
}));

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: jest.fn(async (uri: string, meta: unknown, body: string) => {
    if (mockEscritaProibida.has(uri)) {
      throw new Error(`escrita recusada: ${uri}`);
    }
    const { stringifyFrontmatter } = jest.requireActual(
      '@/lib/vault/frontmatter'
    ) as typeof import('@/lib/vault/frontmatter');
    mockArquivos.set(uri, stringifyFrontmatter(meta, body));
  }),
}));

import { registrarHistoricoDaSessao } from '@/lib/exercicios/registrarHistoricoDaSessao';
import { saveTreino } from '@/lib/treinos/saveTreino';
import { lerExercicio } from '@/lib/vault/exercicios';
import { ExercicioSchema } from '@/lib/schemas/exercicio';
import { exercicioPath, vaultUriJoin } from '@/lib/vault/paths';

const VAULT_ROOT = 'file:///vault';

function exercicioBase(slug: string, nome: string): Exercicio {
  return {
    tipo: 'exercicio',
    slug,
    nome,
    grupo_muscular: ['pernas'],
    nivel: 'intermediario',
    equipamento: 'barra',
    instrucao: 'desca ate a paralela e suba.',
    dicas: [],
    gif: '',
    historico: [],
  };
}

// Semeia um exercicio no Vault em memoria, com corpo opcional.
function semearExercicio(meta: Exercicio, body: string = ''): string {
  const uri = vaultUriJoin(VAULT_ROOT, exercicioPath(meta.slug));
  const { stringifyFrontmatter } = jest.requireActual(
    '@/lib/vault/frontmatter'
  ) as typeof import('@/lib/vault/frontmatter');
  mockArquivos.set(uri, stringifyFrontmatter(meta, body));
  return uri;
}

function sessao(over: Partial<TreinoSessao> = {}): TreinoSessao {
  return {
    tipo: 'treino_sessao',
    data: '2026-09-08T18:30:00-03:00',
    autor: 'pessoa_a',
    rotina: 'Rotina A',
    duracao_min: 55,
    exercicios: [
      { nome: 'Agachamento livre', series: 4, reps: 8, carga_kg: 80 },
    ],
    ...over,
  };
}

beforeEach(() => {
  mockArquivos.clear();
  mockEscritaProibida.clear();
  jest.clearAllMocks();
});

describe('registrarHistoricoDaSessao via saveTreino', () => {
  // AC-1
  it('grava uma entrada em cada exercicio cadastrado da sessao', async () => {
    semearExercicio(exercicioBase('agachamento-livre', 'Agachamento livre'));
    semearExercicio(exercicioBase('supino-reto', 'Supino reto'));

    const out = await saveTreino({
      meta: sessao({
        exercicios: [
          { nome: 'Agachamento livre', series: 4, reps: 8, carga_kg: 80 },
          { nome: 'Supino reto', series: 3, reps: 10, carga_kg: 42.5 },
        ],
      }),
      vaultRoot: VAULT_ROOT,
    });

    expect(out.historicoAtualizados).toBe(2);

    const agachamento = await lerExercicio(VAULT_ROOT, 'agachamento-livre');
    expect(agachamento?.historico).toEqual([
      { data: '2026-09-08T18:30:00-03:00', carga: 80, series: 4, reps: 8 },
    ]);

    const supino = await lerExercicio(VAULT_ROOT, 'supino-reto');
    expect(supino?.historico).toEqual([
      { data: '2026-09-08T18:30:00-03:00', carga: 42.5, series: 3, reps: 10 },
    ]);
  });

  // AC-2
  it('ignora exercicio nao cadastrado sem escrever nem lancar', async () => {
    semearExercicio(exercicioBase('agachamento-livre', 'Agachamento livre'));

    const out = await saveTreino({
      meta: sessao({
        exercicios: [
          { nome: 'Agachamento livre', series: 4, reps: 8, carga_kg: 80 },
          { nome: 'Alongamento', series: 1, reps: 1 },
        ],
      }),
      vaultRoot: VAULT_ROOT,
    });

    expect(out.historicoAtualizados).toBe(1);
    expect(out.rel).toBe('treinos/2026-09-08-1830-rotina-a.md');
    // Nenhum arquivo novo de exercicio nasceu do nome digitado a mao.
    const exercicios = [...mockArquivos.keys()].filter((u) =>
      u.includes('/markdown/exercicio-')
    );
    expect(exercicios).toEqual([
      vaultUriJoin(VAULT_ROOT, exercicioPath('agachamento-livre')),
    ]);
  });

  // AC-3
  it('casa por slug tolerando acento e caixa', async () => {
    semearExercicio(
      exercicioBase('agachamento-bulgaro', 'Agachamento búlgaro')
    );

    const out = await saveTreino({
      meta: sessao({
        exercicios: [
          { nome: 'Agachamento Búlgaro', series: 3, reps: 12, carga_kg: 20 },
        ],
      }),
      vaultRoot: VAULT_ROOT,
    });

    expect(out.historicoAtualizados).toBe(1);
    const lido = await lerExercicio(VAULT_ROOT, 'agachamento-bulgaro');
    expect(lido?.historico).toHaveLength(1);
    expect(lido?.historico[0].carga).toBe(20);
  });

  // AC-4
  it('e idempotente pela data da sessao: salvar duas vezes nao duplica', async () => {
    semearExercicio(exercicioBase('agachamento-livre', 'Agachamento livre'));

    await saveTreino({ meta: sessao(), vaultRoot: VAULT_ROOT });
    // Segunda gravacao da MESMA sessao, com a carga corrigida pelo
    // usuario. Substitui a entrada, nao acrescenta outra.
    await saveTreino({
      meta: sessao({
        exercicios: [
          { nome: 'Agachamento livre', series: 4, reps: 8, carga_kg: 85 },
        ],
      }),
      vaultRoot: VAULT_ROOT,
    });

    const lido = await lerExercicio(VAULT_ROOT, 'agachamento-livre');
    expect(lido?.historico).toHaveLength(1);
    expect(lido?.historico[0].carga).toBe(85);
  });

  // AC-5
  it('mantem o historico ascendente por data mesmo fora de ordem', async () => {
    semearExercicio(exercicioBase('agachamento-livre', 'Agachamento livre'));

    const datas = [
      '2026-09-06T07:00:00-03:00',
      '2026-09-02T19:00:00-03:00',
      '2026-09-04T12:00:00-03:00',
    ];
    for (const data of datas) {
      await saveTreino({ meta: sessao({ data }), vaultRoot: VAULT_ROOT });
    }

    const lido = await lerExercicio(VAULT_ROOT, 'agachamento-livre');
    expect(lido?.historico.map((h) => h.data)).toEqual([
      '2026-09-02T19:00:00-03:00',
      '2026-09-04T12:00:00-03:00',
      '2026-09-06T07:00:00-03:00',
    ]);
    // A Tela 08 le a ultima posicao como "Ultima vez".
    expect(lido?.historico[lido.historico.length - 1].data).toBe(
      '2026-09-06T07:00:00-03:00'
    );
  });

  // AC-6
  it('grava carga 0 quando carga_kg esta ausente, e o schema aceita', async () => {
    semearExercicio(exercicioBase('barra-fixa', 'Barra fixa'));

    await saveTreino({
      meta: sessao({
        exercicios: [{ nome: 'Barra fixa', series: 3, reps: 6 }],
      }),
      vaultRoot: VAULT_ROOT,
    });

    const uri = vaultUriJoin(VAULT_ROOT, exercicioPath('barra-fixa'));
    const raw = mockArquivos.get(uri) ?? '';
    expect(raw).toContain('carga: 0');

    const lido = await lerExercicio(VAULT_ROOT, 'barra-fixa');
    expect(lido?.historico[0].carga).toBe(0);
    expect(ExercicioSchema.safeParse(lido).success).toBe(true);
  });

  // AC-7
  it('escrita do exercicio rejeitando nao derruba o save da sessao', async () => {
    const uri = semearExercicio(
      exercicioBase('agachamento-livre', 'Agachamento livre')
    );
    mockEscritaProibida.add(uri);

    const out = await saveTreino({ meta: sessao(), vaultRoot: VAULT_ROOT });

    expect(out.rel).toBe('treinos/2026-09-08-1830-rotina-a.md');
    expect(out.historicoAtualizados).toBe(0);
    // O exercicio ficou como estava; a sessao esta no disco.
    const lido = await lerExercicio(VAULT_ROOT, 'agachamento-livre');
    expect(lido?.historico).toEqual([]);
    expect(mockArquivos.has(`${VAULT_ROOT}/${out.rel}`)).toBe(true);
  });

  it('falha em um exercicio nao impede o append no outro', async () => {
    const uriRuim = semearExercicio(
      exercicioBase('supino-reto', 'Supino reto')
    );
    semearExercicio(exercicioBase('agachamento-livre', 'Agachamento livre'));
    mockEscritaProibida.add(uriRuim);

    const out = await saveTreino({
      meta: sessao({
        exercicios: [
          { nome: 'Supino reto', series: 3, reps: 10, carga_kg: 40 },
          { nome: 'Agachamento livre', series: 4, reps: 8, carga_kg: 80 },
        ],
      }),
      vaultRoot: VAULT_ROOT,
    });

    expect(out.historicoAtualizados).toBe(1);
    expect((await lerExercicio(VAULT_ROOT, 'supino-reto'))?.historico).toEqual(
      []
    );
    expect(
      (await lerExercicio(VAULT_ROOT, 'agachamento-livre'))?.historico
    ).toHaveLength(1);
  });
});

describe('registrarHistoricoDaSessao', () => {
  it('deduplica o mesmo exercicio na sessao e fica com a maior carga', async () => {
    semearExercicio(exercicioBase('supino-reto', 'Supino reto'));

    const { atualizados } = await registrarHistoricoDaSessao({
      vaultRoot: VAULT_ROOT,
      sessao: sessao({
        exercicios: [
          { nome: 'Supino reto', series: 3, reps: 10, carga_kg: 40 },
          { nome: 'supino reto', series: 2, reps: 6, carga_kg: 55 },
        ],
      }),
    });

    expect(atualizados).toBe(1);
    const lido = await lerExercicio(VAULT_ROOT, 'supino-reto');
    expect(lido?.historico).toEqual([
      { data: '2026-09-08T18:30:00-03:00', carga: 55, series: 2, reps: 6 },
    ]);
  });

  it('preserva o corpo do .md do exercicio ao reescrever', async () => {
    const uri = semearExercicio(
      exercicioBase('agachamento-livre', 'Agachamento livre'),
      'Anotação minha: joelho direito reclama acima de 90 kg.'
    );

    await registrarHistoricoDaSessao({
      vaultRoot: VAULT_ROOT,
      sessao: sessao(),
    });

    expect(mockArquivos.get(uri)).toContain(
      'Anotação minha: joelho direito reclama acima de 90 kg.'
    );
  });

  it('sem vaultRoot nao le nem escreve nada', async () => {
    const { atualizados } = await registrarHistoricoDaSessao({
      vaultRoot: '',
      sessao: sessao(),
    });
    expect(atualizados).toBe(0);
    expect(mockArquivos.size).toBe(0);
  });
});
