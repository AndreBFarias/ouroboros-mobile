// Testes da heuristica client de marcos auto. Cobre cada criterio
// e o dedupe via hash.
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';
import type { Marco } from '@/lib/schemas/marco';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';

const mockListarTreinos = jest.fn();
const mockListarMarcos = jest.fn();
const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockSaveMarco = jest.fn();

jest.mock('@/lib/vault/treinos', () => ({
  __esModule: true,
  listarTreinos: (...args: unknown[]) => mockListarTreinos(...args),
}));
jest.mock('@/lib/vault/marcos', () => ({
  __esModule: true,
  listarMarcos: (...args: unknown[]) => mockListarMarcos(...args),
}));
jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/marcos/saveMarco', () => ({
  __esModule: true,
  saveMarco: (...args: unknown[]) => mockSaveMarco(...args),
}));

import { verificarMarcosAuto } from '@/lib/marcos/marcosAuto';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';

const VAULT_ROOT = 'content://test/vault';

function fakeTreino(
  data: string,
  autor: 'pessoa_a' | 'pessoa_b' = 'pessoa_a'
): TreinoSessao {
  return {
    tipo: 'treino_sessao',
    data,
    autor,
    rotina: 'A',
    duracao_min: 30,
    exercicios: [{ nome: 'x', series: 1, reps: 1 }],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Defaults: nada de tudo.
  mockListarTreinos.mockResolvedValue([]);
  mockListarMarcos.mockResolvedValue([]);
  mockListVaultFolder.mockResolvedValue([]);
  mockReadVaultFile.mockResolvedValue(null);
  mockSaveMarco.mockResolvedValue({
    uri: 'x',
    rel: 'marcos/x.md',
    slug: 'x',
  });
  // Reset stores.
  useVault.setState({ vaultRoot: VAULT_ROOT });
  usePessoa.setState({ pessoaAtiva: 'pessoa_a' });
});

describe('verificarMarcosAuto', () => {
  it('retorna 0 quando vault nao concedido', async () => {
    useVault.setState({ vaultRoot: null });
    const out = await verificarMarcosAuto();
    expect(out).toEqual({ criados: 0, ignorados: 0 });
    expect(mockSaveMarco).not.toHaveBeenCalled();
  });

  it('cria marco "tres treinos nesta semana" quando >=3 nos ultimos 7 dias', async () => {
    const agora = new Date();
    const dias = (n: number) =>
      new Date(agora.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
    mockListarTreinos.mockResolvedValueOnce([
      fakeTreino(dias(0)),
      fakeTreino(dias(2)),
      fakeTreino(dias(4)),
    ]);

    const out = await verificarMarcosAuto();
    expect(out.criados).toBeGreaterThanOrEqual(1);
    const chamadas = mockSaveMarco.mock.calls;
    const houveTresTreinos = chamadas.some((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Três treinos');
    });
    expect(houveTresTreinos).toBe(true);
  });

  it('nao duplica marco quando hash ja existe', async () => {
    const agora = new Date();
    const dias = (n: number) =>
      new Date(agora.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
    mockListarTreinos.mockResolvedValueOnce([
      fakeTreino(dias(0)),
      fakeTreino(dias(2)),
      fakeTreino(dias(4)),
    ]);
    // Marco existente com hash igual ao que seria gerado.
    const hashEsperado = require('@/lib/marcos/hash').hashMarcoConteudo(
      'pessoa_a',
      'Três treinos nesta semana.'
    );
    mockListarMarcos.mockResolvedValueOnce([
      {
        tipo: 'marco',
        data: '2026-01-01T00:00:00-03:00',
        autor: 'pessoa_a',
        descricao: 'Três treinos nesta semana.',
        tags: [],
        auto: true,
        origem: 'backend',
        hash: hashEsperado,
        para: { tipo: 'mim' },
      } as Marco,
    ]);

    const out = await verificarMarcosAuto();
    expect(out.ignorados).toBeGreaterThanOrEqual(1);
    const chamadas = mockSaveMarco.mock.calls;
    const houveTresTreinos = chamadas.some((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Três treinos');
    });
    expect(houveTresTreinos).toBe(false);
  });

  it('cria marco de retorno apos hiato de 5+ dias', async () => {
    const agora = new Date();
    const dias = (n: number) =>
      new Date(agora.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
    mockListarTreinos.mockResolvedValueOnce([
      fakeTreino(dias(0)),
      fakeTreino(dias(7)), // 7 dias atras = hiato
    ]);

    const out = await verificarMarcosAuto();
    expect(out.criados).toBeGreaterThanOrEqual(1);
    const chamadas = mockSaveMarco.mock.calls;
    const houveRetorno = chamadas.some((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Voltou apos');
    });
    expect(houveRetorno).toBe(true);
  });

  it('nao cria marco para autor diferente', async () => {
    const agora = new Date();
    const dias = (n: number) =>
      new Date(agora.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
    // Treinos sao todos de pessoa_b mas o autor ativo e pessoa_a.
    mockListarTreinos.mockResolvedValueOnce([
      fakeTreino(dias(0), 'pessoa_b'),
      fakeTreino(dias(2), 'pessoa_b'),
      fakeTreino(dias(4), 'pessoa_b'),
    ]);

    const out = await verificarMarcosAuto();
    // Pode haver outros criterios disparados; o que nao pode e o de
    // 3 treinos com autor pessoa_a (que nao tem nenhum).
    const tresTreinos = mockSaveMarco.mock.calls.filter((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Três treinos');
    });
    expect(tresTreinos).toHaveLength(0);
    expect(out.criados).toBe(0);
  });

  it('marca origem=client e auto=true', async () => {
    const agora = new Date();
    const dias = (n: number) =>
      new Date(agora.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
    mockListarTreinos.mockResolvedValueOnce([
      fakeTreino(dias(0)),
      fakeTreino(dias(2)),
      fakeTreino(dias(4)),
    ]);

    await verificarMarcosAuto();
    const arg = mockSaveMarco.mock.calls[0][0] as { meta: Marco };
    expect(arg.meta.auto).toBe(true);
    expect(arg.meta.origem).toBe('client');
    expect(arg.meta.hash).toMatch(/^[0-9a-f]{12}$/);
  });
});

// Fabrica um retorno de readVaultFile para um arquivo de humor: o
// modulo consome apenas r.meta, entao devolvemos a meta minima valida
// com o campo data (YMD-local BRT).
function fakeHumor(
  data: string,
  autor: 'pessoa_a' | 'pessoa_b' = 'pessoa_a'
): { meta: HumorMeta } {
  return {
    meta: {
      tipo: 'humor',
      data,
      autor,
      humor: 3,
      energia: 3,
      ansiedade: 3,
      foco: 3,
      tags: [],
    },
  };
}

// Fabrica um retorno de readVaultFile para um diario emocional em modo
// conquista. Campo data e ISO8601 absoluto (instante), diferente do
// humor (YMD puro). O readVaultFile e mockado (bypassa o schema); o
// criterio 5 le apenas autor/modo/data, entao a meta minima basta.
// Cast via unknown por ser um objeto parcial de proposito.
function fakeConquista(
  dataIso: string,
  autor: 'pessoa_a' | 'pessoa_b' = 'pessoa_a'
): { meta: DiarioEmocionalMeta } {
  return {
    meta: {
      tipo: 'diario_emocional',
      data: dataIso,
      autor,
      modo: 'conquista',
    } as unknown as DiarioEmocionalMeta,
  };
}

// Semeia listVaultFolder + readVaultFile a partir de uma lista de YMDs
// de humor consecutivos. Os arquivos vivem em markdown/humor-<ymd>.md
// (matchesFeaturePrefix 'humor-'); readVaultFile devolve a meta por URI.
function semearHumores(ymds: string[]): void {
  mockListVaultFolder.mockResolvedValue(
    ymds.map((d) => `${VAULT_ROOT}/markdown/humor-${d}.md`)
  );
  mockReadVaultFile.mockImplementation(async (uri: string) => {
    const m = /humor-(\d{4}-\d{2}-\d{2})\.md$/.exec(uri);
    return m ? fakeHumor(m[1]) : null;
  });
}

// Semeia diarios em modo conquista a partir de instantes ISO. Cada
// conquista vira markdown/diario-<i>.md (matchesFeaturePrefix 'diario-');
// sem arquivos de humor, so o criterio 5 pode disparar.
function semearConquistas(
  isos: string[],
  autor: 'pessoa_a' | 'pessoa_b' = 'pessoa_a'
): void {
  const porUri = new Map<string, { meta: DiarioEmocionalMeta }>();
  const uris = isos.map((iso, i) => {
    const uri = `${VAULT_ROOT}/markdown/diario-${i}.md`;
    porUri.set(uri, fakeConquista(iso, autor));
    return uri;
  });
  mockListVaultFolder.mockResolvedValue(uris);
  mockReadVaultFile.mockImplementation(async (uri: string) => porUri.get(uri) ?? null);
}

describe('avaliarSeteDiasConsecutivos (criterio 3, ancorado em BRT)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  // 7 dias BRT consecutivos terminando em 2026-07-10.
  const seteDias = [
    '2026-07-04',
    '2026-07-05',
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
    '2026-07-09',
    '2026-07-10',
  ];

  it('cria "Sete dias acompanhando" as 23:30 BRT (UTC ja virou o dia)', async () => {
    // 2026-07-11T02:30:00Z = 23:30 BRT de 2026-07-10 (janela 21h-23h59).
    // No codigo velho a janela UTC do i=0 e 2026-07-11, fora do conjunto
    // -> nenhum marco. Ancorado em BRT, o i=0 e 2026-07-10 -> dispara.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-11T02:30:00Z'));
    semearHumores(seteDias);

    await verificarMarcosAuto();

    const houveSeteDias = mockSaveMarco.mock.calls.some((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Sete dias acompanhando');
    });
    expect(houveSeteDias).toBe(true);
  });

  it('cria "Sete dias acompanhando" ao meio-dia BRT (nao-regressao)', async () => {
    // 2026-07-10T15:00:00Z = 12:00 BRT; UTC e BRT no mesmo dia. Caso que
    // ja funcionava antes do fix: garante que a mudanca nao regride.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-10T15:00:00Z'));
    semearHumores(seteDias);

    await verificarMarcosAuto();

    const houveSeteDias = mockSaveMarco.mock.calls.some((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Sete dias acompanhando');
    });
    expect(houveSeteDias).toBe(true);
  });
});

describe('avaliarPrimeiraConquistaSemana (criterio 5, fronteira BRT)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('conquista vivida na segunda BRT da semana corrente dispara o marco', async () => {
    // agora = qua 2026-07-15 12:00 BRT; segunda da semana = 2026-07-13.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-15T15:00:00Z'));
    // Conquista vivida seg 2026-07-13 12:00 BRT (dentro da semana).
    semearConquistas(['2026-07-13T15:00:00Z']);

    await verificarMarcosAuto();

    const houve = mockSaveMarco.mock.calls.some((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Primeira conquista');
    });
    expect(houve).toBe(true);
  });

  it('conquista do domingo BRT (semana anterior) NAO conta, mesmo com UTC ja em segunda', async () => {
    // agora = qua 2026-07-15 12:00 BRT; segunda da semana = 2026-07-13.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-15T15:00:00Z'));
    // Instante 2026-07-13T01:00Z: em UTC ja e segunda 13, mas em BRT e
    // domingo 2026-07-12 22:00 (semana anterior). A fronteira BRT exclui;
    // no codigo antigo (UTC) a conquista contaria na semana corrente.
    semearConquistas(['2026-07-13T01:00:00Z']);

    await verificarMarcosAuto();

    const houve = mockSaveMarco.mock.calls.some((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Primeira conquista');
    });
    expect(houve).toBe(false);
  });
});
