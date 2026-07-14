// Paridade R-AUDIT-VAULT-PERF (invariante critico): cada listar* produz
// EXATAMENTE a mesma saida (mesma lista, mesma ordem) com e sem
// `opts.listagem`. A listagem unica de markdown/ nao muda o conteudo
// observavel -- so o custo de I/O. Prova tambem que, com `opts.listagem`,
// o listar* NAO re-lista a pasta (o ganho do achado 12).
//
// Mocka '@/lib/vault/reader'; listarHumor/listarTarefas + lerListagemMarkdown
// reusam listVaultFolder/readVaultFile por dentro.
const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

import { listarHumor } from '@/lib/vault/humor';
import { listarTarefas } from '@/lib/vault/tarefas';
import { lerListagemMarkdown } from '@/lib/vault/leituraLote';

const ROOT = 'content://test/vault';
const MD = `${ROOT}/markdown`;

// Listagem crua de markdown/ com varios tipos + ruido + um conflito
// Syncthing (deve ser excluido pelo filtro de cada listar*).
const LISTAGEM = [
  `${MD}/humor-2026-05-01.md`,
  `${MD}/humor-2026-04-29.md`,
  `${MD}/humor-2026-04-30.md`,
  `${MD}/humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md`,
  `${MD}/tarefa-a.md`,
  `${MD}/tarefa-b.md`,
  `${MD}/diario-2026-05-01-1200-x.md`,
];

// Conteudo por URI (o mock de readVaultFile devolve { meta, body }).
const CONTEUDO: Record<string, { meta: Record<string, unknown> } | null> = {
  [`${MD}/humor-2026-05-01.md`]: {
    meta: {
      tipo: 'humor',
      data: '2026-05-01',
      autor: 'pessoa_a',
      humor: 4,
      energia: 3,
      ansiedade: 2,
      foco: 4,
      tags: [],
    },
  },
  [`${MD}/humor-2026-04-29.md`]: {
    meta: {
      tipo: 'humor',
      data: '2026-04-29',
      autor: 'pessoa_b',
      humor: 3,
      energia: 3,
      ansiedade: 2,
      foco: 3,
      tags: [],
    },
  },
  [`${MD}/humor-2026-04-30.md`]: {
    meta: {
      tipo: 'humor',
      data: '2026-04-30',
      autor: 'pessoa_a',
      humor: 5,
      energia: 4,
      ansiedade: 1,
      foco: 5,
      tags: [],
    },
  },
  [`${MD}/tarefa-a.md`]: {
    meta: {
      tipo: 'tarefa',
      titulo: 'Comprar pao',
      data: '2026-05-02',
      feito: false,
      feito_em: null,
    },
  },
  [`${MD}/tarefa-b.md`]: {
    meta: {
      tipo: 'tarefa',
      titulo: 'Ligar medico',
      data: '2026-05-04',
      feito: false,
      feito_em: null,
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  // mockResolvedValue (nao Once): listVaultFolder devolve a mesma
  // listagem em qualquer chamada -- deixa os dois caminhos comparaveis.
  mockListVaultFolder.mockResolvedValue(LISTAGEM);
  // mockImplementation (map puro): independente de ordem/contagem de
  // chamadas, para os dois caminhos lerem o mesmo conteudo.
  mockReadVaultFile.mockImplementation((uri: string) =>
    Promise.resolve(CONTEUDO[uri] ?? null)
  );
});

describe('paridade listarHumor com/sem opts.listagem', () => {
  it('mesma saida e mesma ordem', async () => {
    const semOpts = await listarHumor(ROOT);
    const listagem = await lerListagemMarkdown(ROOT);
    const comOpts = await listarHumor(ROOT, { listagem });
    expect(comOpts).toEqual(semOpts);
    // Sanidade: conflito excluido, ordenacao desc por data.
    expect(semOpts.map((h) => h.data)).toEqual([
      '2026-05-01',
      '2026-04-30',
      '2026-04-29',
    ]);
  });

  it('com opts.listagem NAO re-lista markdown/ (achado 12)', async () => {
    const listagem = await lerListagemMarkdown(ROOT);
    mockListVaultFolder.mockClear();
    await listarHumor(ROOT, { listagem });
    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });
});

describe('paridade listarTarefas com/sem opts.listagem', () => {
  it('mesma saida, mesma ordem e mesmo rel', async () => {
    const semOpts = await listarTarefas(ROOT);
    const listagem = await lerListagemMarkdown(ROOT);
    const comOpts = await listarTarefas(ROOT, { listagem });
    expect(comOpts).toEqual(semOpts);
    // rel derivado da URI; pendentes por data desc.
    expect(semOpts.map((t) => t.rel)).toEqual([
      'markdown/tarefa-b.md',
      'markdown/tarefa-a.md',
    ]);
  });

  it('com opts.listagem NAO re-lista markdown/', async () => {
    const listagem = await lerListagemMarkdown(ROOT);
    mockListVaultFolder.mockClear();
    await listarTarefas(ROOT, { listagem });
    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });
});
