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

function fakeTreino(data: string, autor: 'pessoa_a' | 'pessoa_b' = 'pessoa_a'): TreinoSessao {
  return {
    tipo: 'treino_sessao',
    data,
    autor,
    rotina: 'A',
    duracao_min: 30,
    exercicios: [{ nome: 'x', series: 1, reps: 1 }],
  };
}

function fakeHumor(data: string, autor: 'pessoa_a' | 'pessoa_b' = 'pessoa_a'): HumorMeta {
  return {
    tipo: 'humor',
    data,
    autor,
    humor: 4,
    energia: 4,
    ansiedade: 2,
    foco: 4,
    tags: [],
  } as HumorMeta;
}

function fakeDiario(
  data: string,
  modo: 'trigger' | 'vitoria',
  autor: 'pessoa_a' | 'pessoa_b' = 'pessoa_a'
): DiarioEmocionalMeta {
  return {
    tipo: 'diario_emocional',
    data,
    autor,
    modo,
    emocoes: [],
    intensidade: 3,
    com: [],
    contexto_social: [],
    texto: 'algo.',
    midia: [],
  } as DiarioEmocionalMeta;
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
      return arg.meta.descricao.includes('Tres treinos');
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
      'Tres treinos nesta semana.'
    );
    mockListarMarcos.mockResolvedValueOnce([
      {
        tipo: 'marco',
        data: '2026-01-01T00:00:00-03:00',
        autor: 'pessoa_a',
        descricao: 'Tres treinos nesta semana.',
        tags: [],
        auto: true,
        origem: 'backend',
        hash: hashEsperado,
      } as Marco,
    ]);

    const out = await verificarMarcosAuto();
    expect(out.ignorados).toBeGreaterThanOrEqual(1);
    const chamadas = mockSaveMarco.mock.calls;
    const houveTresTreinos = chamadas.some((c) => {
      const arg = c[0] as { meta: Marco };
      return arg.meta.descricao.includes('Tres treinos');
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
      return arg.meta.descricao.includes('Tres treinos');
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
