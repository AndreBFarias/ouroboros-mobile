// Testes do adicionarTreinoLivre (EXE-2).
//
// O arquivo anterior mockava readVaultFile/writeVaultFile e afirmava
// coisas sobre as CHAMADAS, nunca sobre o que sobrava no disco. Foi por
// isso que o defeito sobreviveu a suite verde: o caso chamado "anexa
// novo slug a lista existente" passava 'agachamento-livre' nas duas
// pontas, entao nunca exercitou dois slugs diferentes -- que e'
// exatamente o cenario em que cada exercicio ganhava um arquivo proprio.
//
// Aqui o vault e' um Map alimentado pelo PROPRIO escreverTreino (mesmo
// padrao de tests/lib/vault/treinos.test.ts), e a contagem e'
// consequencia do que foi escrito.
//
// Relogio: fake timers em 2026-04-30T18:03 de Sao Paulo (21:03Z). A
// duracao derivada e' medida avancando o relogio, nunca injetada.
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import { adicionarTreinoLivre } from '@/lib/exercicios/adicionarTreinoLivre';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';
// 2026-04-30T18:03 em America/Sao_Paulo.
const AGORA_1803 = new Date('2026-04-30T21:03:00.000Z');

// uri -> arquivo gravado. O writer real sobrescreve sem avisar; o mock
// faz o mesmo, entao duas escritas no mesmo caminho aparecem como UM
// arquivo -- que e' o sintoma que este arquivo precisa poder medir.
let disco: Map<string, { meta: TreinoSessao; body: string }>;

function arquivosDeTreino(): string[] {
  return [...disco.keys()].filter((u) => u.includes('/treinos/'));
}

beforeEach(() => {
  jest.clearAllMocks();
  disco = new Map();
  mockWriteVaultFile.mockImplementation(
    async (uri: string, meta: TreinoSessao, body: string) => {
      disco.set(uri, { meta, body: body ?? '' });
    }
  );
  mockListVaultFolder.mockImplementation(async (folderUri: string) =>
    [...disco.keys()].filter((u) => u.startsWith(`${folderUri}/`))
  );
  mockReadVaultFile.mockImplementation(async (uri: string) => {
    const arq = disco.get(uri);
    return arq ? { meta: arq.meta, body: arq.body } : null;
  });
  jest.useFakeTimers().setSystemTime(AGORA_1803);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('adicionarTreinoLivre', () => {
  it('AC-1: tres slugs DIFERENTES no mesmo dia dao um arquivo so', async () => {
    const primeiro = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    const segundo = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'agachamento',
      autor: 'pessoa_a',
    });
    const terceiro = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'remada',
      autor: 'pessoa_a',
    });

    expect(primeiro.criadoNovo).toBe(true);
    expect(segundo.criadoNovo).toBe(false);
    expect(terceiro.criadoNovo).toBe(false);
    // O disco, nao a contagem de chamadas: era aqui que apareciam os
    // cinco arquivos do bug.
    expect(arquivosDeTreino()).toHaveLength(1);
    expect(segundo.rel).toBe(primeiro.rel);
    expect(terceiro.rel).toBe(primeiro.rel);

    const arq = disco.get(primeiro.uri);
    expect(arq?.meta.exercicios).toHaveLength(3);
    expect(arq?.meta.exercicios.map((e) => e.nome)).toEqual([
      'supino',
      'agachamento',
      'remada',
    ]);
    expect(arq?.meta.rotina).toBe('Treino livre');
    expect(arq?.meta.autor).toBe('pessoa_a');
    expect(arq?.meta.tipo).toBe('treino_sessao');
  });

  it('AC-2: o mesmo slug duas vezes nao duplica o item', async () => {
    const primeiro = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    const segundo = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });

    expect(segundo.criadoNovo).toBe(false);
    expect(segundo.rel).toBe(primeiro.rel);
    expect(arquivosDeTreino()).toHaveLength(1);
    expect(disco.get(primeiro.uri)?.meta.exercicios).toHaveLength(1);
  });

  it('AC-3: duracao nasce 1 e vira o tempo decorrido, nao 30 por exercicio', async () => {
    const criada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    expect(disco.get(criada.uri)?.meta.duracao_min).toBe(1);

    // 18h47: 44 minutos depois da sessao aberta as 18h03.
    jest.setSystemTime(new Date('2026-04-30T21:47:00.000Z'));
    const anexada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'agachamento',
      autor: 'pessoa_a',
    });

    const meta = disco.get(anexada.uri)?.meta;
    expect(meta?.duracao_min).toBe(44);
    // Guarda contra a volta da constante: com 2 exercicios, o valor
    // antigo seria 60.
    expect(meta?.duracao_min).not.toBe(30 * (meta?.exercicios.length ?? 0));
  });

  it('AC-3: duracao nao passa do teto de 240 do schema', async () => {
    const criada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    // Nove horas depois, ainda no mesmo dia civil.
    jest.setSystemTime(new Date('2026-05-01T02:03:00.000Z'));
    const anexada = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'remada',
      autor: 'pessoa_a',
    });
    expect(anexada.rel).toBe(criada.rel);
    expect(disco.get(anexada.uri)?.meta.duracao_min).toBe(240);
  });

  it('AC-4: nada e escrito em treinos/draft/', async () => {
    const out = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    expect(out.rel.startsWith('treinos/')).toBe(true);
    expect(out.rel).not.toContain('/draft/');
    expect([...disco.keys()].some((u) => u.includes('/draft/'))).toBe(false);
    // O nome carrega dia, hora e autor -- nao o slug do exercicio.
    expect(out.rel).toBe('treinos/2026-04-30-1803-treino-livre-pessoa-a.md');
  });

  it('separa a sessao por autor no mesmo dia', async () => {
    const a = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });
    const b = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_b',
    });
    expect(b.rel).not.toBe(a.rel);
    expect(arquivosDeTreino()).toHaveLength(2);
    expect(disco.get(b.uri)?.meta.autor).toBe('pessoa_b');
  });

  it('anexa na sessao de hoje mesmo quando ela esta em formato legado', async () => {
    // Sessao de treino livre gravada antes da EXE-1 (sem hora no nome) e
    // ainda no disco. O exercicio novo tem de cair NELA.
    const relLegado = 'treinos/2026-04-30-treino-livre.md';
    const uriLegado = `${VAULT_ROOT}/${relLegado}`;
    disco.set(uriLegado, {
      meta: {
        tipo: 'treino_sessao',
        data: '2026-04-30T17:19:00-03:00',
        autor: 'pessoa_a',
        rotina: 'Treino livre',
        duracao_min: 30,
        exercicios: [{ nome: 'supino', series: 3, reps: 10 }],
      },
      body: '',
    });

    const out = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'remada',
      autor: 'pessoa_a',
    });

    expect(out.criadoNovo).toBe(false);
    expect(out.rel).toBe(relLegado);
    expect(arquivosDeTreino()).toHaveLength(1);
    expect(disco.get(uriLegado)?.meta.exercicios).toHaveLength(2);
    // 17h19 -> 18h03 = 44 minutos.
    expect(disco.get(uriLegado)?.meta.duracao_min).toBe(44);
  });

  it('nao invade sessao de outra rotina no mesmo dia', async () => {
    disco.set(`${VAULT_ROOT}/treinos/2026-04-30-0700-rotina-a.md`, {
      meta: {
        tipo: 'treino_sessao',
        data: '2026-04-30T07:00:00-03:00',
        autor: 'pessoa_a',
        rotina: 'Rotina A',
        duracao_min: 50,
        exercicios: [{ nome: 'levantamento-terra', series: 5, reps: 5 }],
      },
      body: '',
    });

    const out = await adicionarTreinoLivre({
      vaultRoot: VAULT_ROOT,
      exercicioSlug: 'supino',
      autor: 'pessoa_a',
    });

    expect(out.criadoNovo).toBe(true);
    expect(arquivosDeTreino()).toHaveLength(2);
    expect(
      disco.get(`${VAULT_ROOT}/treinos/2026-04-30-0700-rotina-a.md`)?.meta
        .exercicios
    ).toHaveLength(1);
  });

  it('rejeita slug vazio', async () => {
    await expect(
      adicionarTreinoLivre({
        vaultRoot: VAULT_ROOT,
        exercicioSlug: '',
        autor: 'pessoa_a',
      })
    ).rejects.toThrow(/slug obrigatorio/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });
});
