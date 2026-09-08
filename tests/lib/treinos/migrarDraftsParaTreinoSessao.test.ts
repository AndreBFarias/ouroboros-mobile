// Testes da migracao de drafts da M13 para sessoes formais. Mocka
// listVaultFolder/readVaultFile/writeVaultFile e verifica:
//  - drafts validos viram treino_sessao
//  - draft invalido (schema errado) e ignorado
//  - sem vault root, retorna 0/0
//  - data e exercicios sao preservados
//
// EXE-2 (2026-09-08): o bloco final monta um vault em memoria e cobre o
// colapso por dia -- cinco drafts de um dia viram UMA sessao -- e as duas
// travas de convergencia da remigracao (destino derivado de (dia, autor)
// e reuso da sessao ja existente do dia, inclusive em nome legado).
const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

import { migrarDraftsParaTreinoSessao } from '@/lib/treinos/migrarDraftsParaTreinoSessao';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockListVaultFolder.mockResolvedValue([]);
  mockWriteVaultFile.mockResolvedValue(undefined);
  mockDeleteAsync.mockResolvedValue(undefined);
  useVault.setState({ vaultRoot: VAULT_ROOT });
});

describe('migrarDraftsParaTreinoSessao', () => {
  it('retorna 0/0 quando vault nao concedido', async () => {
    useVault.setState({ vaultRoot: null });
    const out = await migrarDraftsParaTreinoSessao();
    expect(out).toEqual({ migrados: 0, ignorados: 0 });
    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });

  it('migra draft valido para treino_sessao formal', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/2026-04-23-rotina-a.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: {
        tipo: 'treino_draft',
        data: '2026-04-23',
        autor: 'pessoa_a',
        exercicios: ['supino', 'remada'],
      },
      body: 'rascunho.',
    });

    const out = await migrarDraftsParaTreinoSessao();
    expect(out.migrados).toBe(1);
    expect(out.ignorados).toBe(0);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    // EXE-1: o destino carrega a hora, e no draft ela e' sempre 0000
    // (o dataIso montado pela migracao e' T00:00:00-03:00).
    // EXE-2: o slug do destino deixou de vir do NOME do draft (que era o
    // slug do exercicio) e passa a ser (treino livre + autor), a chave do
    // agrupamento. E' o que faz cinco drafts do mesmo dia convergirem num
    // arquivo so'.
    expect(uri).toContain('/treinos/2026-04-23-0000-treino-livre-pessoa-a.md');
    expect(typeof meta).toBe('object');
    const m = meta as { tipo: string; rotina: string; exercicios: unknown[] };
    expect(m.tipo).toBe('treino_sessao');
    expect(m.rotina).toBe('Treino livre');
    expect(m.exercicios).toHaveLength(2);
    expect(typeof body).toBe('string');
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
  });

  it('ignora draft com nome de arquivo fora do padrao YYYY-MM-DD', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/qualquer-coisa.md',
    ]);
    const out = await migrarDraftsParaTreinoSessao();
    expect(out.migrados).toBe(0);
    expect(out.ignorados).toBe(1);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('ignora draft com schema invalido', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/treinos/draft/2026-04-23-x.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce(null);
    const out = await migrarDraftsParaTreinoSessao();
    expect(out.ignorados).toBe(1);
  });

  it('aceita root explicito como argumento', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    await migrarDraftsParaTreinoSessao('outro://vault');
    expect(mockListVaultFolder).toHaveBeenCalledWith(
      expect.stringContaining('outro://vault'),
      expect.any(String)
    );
  });

  // EXE-1, risco R1: com a hora no nome do arquivo, um draft remigrado
  // passaria a DUPLICAR a sessao se o nome variasse a cada rodada. Nao
  // varia: o dataIso do draft e' sempre T00:00:00-03:00, entao o
  // destino e' sempre o mesmo '-0000-'. Este caso trava isso. O delete
  // do draft e' best-effort (o modulo engole o erro), entao o cenario de
  // reaparecimento e' real, nao hipotetico.
  it('remigracao do mesmo draft reescreve o MESMO path, nao cria outro', async () => {
    const draftUri =
      'content://test/vault/treinos/draft/2026-04-23-rotina-a.md';
    const draftMeta = {
      meta: {
        tipo: 'treino_draft',
        data: '2026-04-23',
        autor: 'pessoa_a',
        exercicios: ['supino'],
      },
      body: '',
    };

    mockListVaultFolder.mockResolvedValueOnce([draftUri]);
    mockReadVaultFile.mockResolvedValueOnce(draftMeta);
    // Delete falha: o draft sobrevive e volta na rodada seguinte.
    mockDeleteAsync.mockRejectedValueOnce(new Error('EACCES'));
    const primeira = await migrarDraftsParaTreinoSessao();

    mockListVaultFolder.mockResolvedValueOnce([draftUri]);
    mockReadVaultFile.mockResolvedValueOnce(draftMeta);
    const segunda = await migrarDraftsParaTreinoSessao();

    expect(primeira.migrados).toBe(1);
    expect(segunda.migrados).toBe(1);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(2);
    const destinos = mockWriteVaultFile.mock.calls.map((c) => c[0]);
    expect(destinos[0]).toBe(destinos[1]);
    expect(new Set(destinos).size).toBe(1);
  });
});

// ---------------------------------------------------------------------
// EXE-2: colapso por dia e convergencia da remigracao, medidos contra um
// vault em memoria. Os casos acima afirmam CHAMADAS; estes afirmam o que
// sobra no disco, que e' onde a supercontagem aparecia.
// ---------------------------------------------------------------------
describe('migrarDraftsParaTreinoSessao (vault em memoria)', () => {
  // uri -> conteudo gravado (meta de draft ou de sessao).
  let disco: Map<string, { meta: Record<string, unknown>; body: string }>;

  function escreverDraft(
    data: string,
    slugExercicio: string,
    autor: 'pessoa_a' | 'pessoa_b' = 'pessoa_a'
  ): string {
    const uri = `${VAULT_ROOT}/treinos/draft/${data}-${slugExercicio}.md`;
    disco.set(uri, {
      meta: {
        tipo: 'treino_draft',
        data,
        autor,
        exercicios: [slugExercicio],
      },
      body: '',
    });
    return uri;
  }

  function sessoes(): string[] {
    return [...disco.keys()].filter(
      (u) => u.includes('/treinos/') && !u.includes('/treinos/draft/')
    );
  }

  function drafts(): string[] {
    return [...disco.keys()].filter((u) => u.includes('/treinos/draft/'));
  }

  beforeEach(() => {
    disco = new Map();
    mockListVaultFolder.mockImplementation(async (folderUri: string) =>
      [...disco.keys()].filter((u) => u.startsWith(`${folderUri}/`))
    );
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      const arq = disco.get(uri);
      return arq ? { meta: arq.meta, body: arq.body } : null;
    });
    mockWriteVaultFile.mockImplementation(
      async (uri: string, meta: Record<string, unknown>, body: string) => {
        disco.set(uri, { meta, body: body ?? '' });
      }
    );
    mockDeleteAsync.mockImplementation(async (uri: string) => {
      disco.delete(uri);
    });
  });

  // AC-5.
  it('cinco drafts do mesmo dia e autor viram UMA sessao', async () => {
    const slugs = ['supino', 'agachamento', 'remada', 'rosca', 'terra'];
    for (const s of slugs) escreverDraft('2026-09-01', s);

    const out = await migrarDraftsParaTreinoSessao();

    // migrados conta DRAFTS consumidos, nao sessoes escritas.
    expect(out).toEqual({ migrados: 5, ignorados: 0 });
    expect(sessoes()).toHaveLength(1);
    expect(drafts()).toHaveLength(0);

    const meta = disco.get(sessoes()[0])?.meta as {
      exercicios: Array<{ nome: string }>;
      duracao_min: number;
      rotina: string;
    };
    expect(meta.exercicios.map((e) => e.nome)).toEqual(slugs);
    // 30 minutos e' estimativa DA SESSAO. Antes eram 5 x 30 = 150.
    expect(meta.duracao_min).toBe(30);
    expect(meta.rotina).toBe('Treino livre');
    expect(sessoes()[0]).toContain(
      '/treinos/2026-09-01-0000-treino-livre-pessoa-a.md'
    );
  });

  // AC-5: dias distintos continuam sendo sessoes distintas.
  it('drafts de dois dias produzem duas sessoes', async () => {
    escreverDraft('2026-09-01', 'supino');
    escreverDraft('2026-09-01', 'remada');
    escreverDraft('2026-09-02', 'agachamento');

    const out = await migrarDraftsParaTreinoSessao();

    expect(out.migrados).toBe(3);
    expect(sessoes()).toHaveLength(2);
  });

  // A mesma classe de colisao da secao 5.5 do briefing: sem o autor no
  // nome, os dois treinos livres do dia resolveriam para um arquivo so'.
  it('separa por autor dentro do mesmo dia', async () => {
    escreverDraft('2026-09-01', 'supino', 'pessoa_a');
    escreverDraft('2026-09-01', 'agachamento', 'pessoa_b');

    const out = await migrarDraftsParaTreinoSessao();

    expect(out.migrados).toBe(2);
    expect(sessoes().sort()).toEqual([
      `${VAULT_ROOT}/treinos/2026-09-01-0000-treino-livre-pessoa-a.md`,
      `${VAULT_ROOT}/treinos/2026-09-01-0000-treino-livre-pessoa-b.md`,
    ]);
  });

  // AC-5: nenhum draft sai do disco sem a sessao ter sido escrita.
  it('falha de escrita nao apaga draft nenhum do grupo', async () => {
    escreverDraft('2026-09-01', 'supino');
    escreverDraft('2026-09-01', 'remada');
    mockWriteVaultFile.mockRejectedValueOnce(new Error('EACCES'));

    const out = await migrarDraftsParaTreinoSessao();

    expect(out).toEqual({ migrados: 0, ignorados: 2 });
    expect(drafts()).toHaveLength(2);
    expect(sessoes()).toHaveLength(0);
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  // O risco que a EXE-1 criou e esta sprint tinha de fechar: com a hora
  // no nome, um draft que sobreviva ao delete best-effort passaria a
  // DUPLICAR a sessao em vez de sobrescrever. Aqui o delete falha de
  // verdade e a segunda rodada tem de convergir no mesmo arquivo.
  it('remigracao de draft sobrevivente nao cria segunda sessao', async () => {
    escreverDraft('2026-09-01', 'supino');
    escreverDraft('2026-09-01', 'remada');
    mockDeleteAsync.mockRejectedValueOnce(new Error('EACCES'));

    const primeira = await migrarDraftsParaTreinoSessao();
    expect(primeira.migrados).toBe(2);
    expect(sessoes()).toHaveLength(1);
    expect(drafts()).toHaveLength(1);

    const segunda = await migrarDraftsParaTreinoSessao();

    expect(segunda.migrados).toBe(1);
    expect(sessoes()).toHaveLength(1);
    expect(drafts()).toHaveLength(0);
    const meta = disco.get(sessoes()[0])?.meta as {
      exercicios: Array<{ nome: string }>;
    };
    // Uniao por nome: o exercicio ja migrado nao entra de novo.
    expect(meta.exercicios.map((e) => e.nome)).toEqual(['supino', 'remada']);
  });

  // O outro cenario de duplicata, o que o nome do arquivo sozinho nao
  // resolve: a sessao do dia ja existe com OUTRO nome (migrada antes da
  // EXE-1, sem hora). A migracao tem de reescrever NELA.
  it('converge na sessao do dia mesmo quando ela esta em nome legado', async () => {
    const uriLegado = `${VAULT_ROOT}/treinos/2026-09-01-supino.md`;
    disco.set(uriLegado, {
      meta: {
        tipo: 'treino_sessao',
        data: '2026-09-01T00:00:00-03:00',
        autor: 'pessoa_a',
        rotina: 'Treino livre',
        duracao_min: 30,
        exercicios: [{ nome: 'supino', series: 3, reps: 10 }],
      },
      body: '',
    });
    escreverDraft('2026-09-01', 'supino');
    escreverDraft('2026-09-01', 'remada');

    const out = await migrarDraftsParaTreinoSessao();

    expect(out.migrados).toBe(2);
    expect(sessoes()).toEqual([uriLegado]);
    const meta = disco.get(uriLegado)?.meta as {
      exercicios: Array<{ nome: string }>;
    };
    expect(meta.exercicios.map((e) => e.nome)).toEqual(['supino', 'remada']);
  });

  // Sessao criada pelo caminho novo (toque em "Adicionar a treino
  // livre") tem horario real e duracao derivada. O draft legado do mesmo
  // dia entra nela sem reescrever nem um nem outro para a estimativa.
  it('nao sobrescreve horario e duracao da sessao ja existente', async () => {
    const uriSessao = `${VAULT_ROOT}/treinos/2026-09-01-1803-treino-livre-pessoa-a.md`;
    disco.set(uriSessao, {
      meta: {
        tipo: 'treino_sessao',
        data: '2026-09-01T18:03:00-03:00',
        autor: 'pessoa_a',
        rotina: 'Treino livre',
        duracao_min: 44,
        exercicios: [{ nome: 'supino', series: 1, reps: 1 }],
      },
      body: '',
    });
    escreverDraft('2026-09-01', 'remada');

    await migrarDraftsParaTreinoSessao();

    const meta = disco.get(uriSessao)?.meta as {
      data: string;
      duracao_min: number;
      exercicios: Array<{ nome: string; series: number }>;
    };
    expect(sessoes()).toEqual([uriSessao]);
    expect(meta.data).toBe('2026-09-01T18:03:00-03:00');
    expect(meta.duracao_min).toBe(44);
    // O item que ja estava fica como estava (1x1 do toque), e o novo
    // entra com o default da migracao.
    expect(meta.exercicios[0].series).toBe(1);
    expect(meta.exercicios[1].series).toBe(3);
  });

  // Sessao de outra rotina no mesmo dia nao e' alvo do colapso.
  it('nao invade sessao de outra rotina no mesmo dia', async () => {
    const uriOutra = `${VAULT_ROOT}/treinos/2026-09-01-0700-rotina-a.md`;
    disco.set(uriOutra, {
      meta: {
        tipo: 'treino_sessao',
        data: '2026-09-01T07:00:00-03:00',
        autor: 'pessoa_a',
        rotina: 'Rotina A',
        duracao_min: 50,
        exercicios: [{ nome: 'terra', series: 5, reps: 5 }],
      },
      body: '',
    });
    escreverDraft('2026-09-01', 'supino');

    await migrarDraftsParaTreinoSessao();

    expect(sessoes()).toHaveLength(2);
    const meta = disco.get(uriOutra)?.meta as {
      exercicios: unknown[];
    };
    expect(meta.exercicios).toHaveLength(1);
  });
  // Regressao da segunda rodada de verificacao da onda 1. A EXE-2 fez a
  // migracao reaproveitar o arquivo da sessao ja existente do dia
  // (`existente?.rel`) e continuou gravando CORPO_SESSAO fixo por cima --
  // apagando a prosa que a pessoa escreveu. E' hook de boot: roda sem ela
  // pedir, e o dado nao volta.
  it('preserva o corpo escrito a mao na sessao que ja existe', async () => {
    const uriSessao = `${VAULT_ROOT}/treinos/2026-09-01-1803-treino-livre-pessoa-a.md`;
    const corpoDaPessoa =
      'Ombro doeu na terceira serie. Baixar a carga na proxima.';
    disco.set(uriSessao, {
      meta: {
        tipo: 'treino_sessao',
        data: '2026-09-01T18:03:00-03:00',
        autor: 'pessoa_a',
        rotina: 'Treino livre',
        duracao_min: 44,
        exercicios: [{ nome: 'supino', series: 1, reps: 1 }],
      },
      body: corpoDaPessoa,
    });
    escreverDraft('2026-09-01', 'remada');

    await migrarDraftsParaTreinoSessao();

    expect(sessoes()).toEqual([uriSessao]);
    expect(disco.get(uriSessao)?.body).toBe(corpoDaPessoa);
  });

  // A contrapartida: no caminho de arquivo novo nao ha corpo a preservar,
  // entao a frase enlatada entra normalmente. Sem este caso, a correcao
  // acima poderia ter zerado o corpo de toda sessao nova sem ninguem ver.
  it('usa o corpo padrao quando cria sessao nova', async () => {
    escreverDraft('2026-09-02', 'agachamento');

    await migrarDraftsParaTreinoSessao();

    const [uri] = sessoes();
    expect(uri).toBeDefined();
    expect(disco.get(uri)?.body).not.toBe('');
  });
});
