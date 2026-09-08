// EXE-2 AC-6: o marco automatico "Tres treinos nesta semana." deixa de
// disparar por marcar exercicios num dia so'.
//
// Este arquivo NAO mocka listarTreinos, e e' o ponto dele. O
// tests/lib/marcos/marcosAuto.test.ts mocka a listagem e entrega os
// treinos ja prontos, entao ele mede a heuristica -- nunca poderia ter
// pego a supercontagem, porque a supercontagem nascia antes, na escrita.
// Aqui o circuito e' fechado: adicionarTreinoLivre escreve num vault em
// memoria e verificarMarcosAuto le desse mesmo vault.
//
// Antes da EXE-2, tres toques num dia deixavam tres drafts, a migracao
// os convertia em tres sessoes de 30 minutos e `recentes.length >= 3`
// virava verdadeiro (marcosAuto.ts:81) sem treino nenhum.
//
// Comentarios sem acento (convencao shell/CI).
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockListarMarcos = jest.fn();
const mockSaveMarco = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('@/lib/vault/marcos', () => ({
  __esModule: true,
  listarMarcos: (...args: unknown[]) => mockListarMarcos(...args),
}));
jest.mock('@/lib/marcos/saveMarco', () => ({
  __esModule: true,
  saveMarco: (...args: unknown[]) => mockSaveMarco(...args),
}));

import { adicionarTreinoLivre } from '@/lib/exercicios/adicionarTreinoLivre';
import { verificarMarcosAuto } from '@/lib/marcos/marcosAuto';
import { usePessoa } from '@/lib/stores/pessoa';

const VAULT_ROOT = 'content://test/vault';
const DESCRICAO_TRES_TREINOS = 'Três treinos nesta semana.';

let disco: Map<string, { meta: TreinoSessao; body: string }>;

function descricoesSalvas(): string[] {
  return mockSaveMarco.mock.calls.map(
    (c) => (c[0] as { meta: { descricao: string } }).meta.descricao
  );
}

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
  mockListarMarcos.mockResolvedValue([]);
  mockSaveMarco.mockResolvedValue({ uri: 'x', rel: 'marcos/x.md', slug: 'x' });
  usePessoa.setState({ pessoaAtiva: 'pessoa_a' });
  // 2026-04-30T18:03 em America/Sao_Paulo.
  jest.useFakeTimers().setSystemTime(new Date('2026-04-30T21:03:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('marco de tres treinos x treino livre', () => {
  it('tres exercicios num unico dia NAO criam o marco', async () => {
    for (const slug of ['supino', 'agachamento', 'remada']) {
      await adicionarTreinoLivre({
        vaultRoot: VAULT_ROOT,
        exercicioSlug: slug,
        autor: 'pessoa_a',
      });
    }
    expect(arquivosDeTreino()).toHaveLength(1);

    const out = await verificarMarcosAuto(VAULT_ROOT);

    expect(descricoesSalvas()).not.toContain(DESCRICAO_TRES_TREINOS);
    expect(out.criados).toBe(0);
  });

  it('tres dias distintos continuam criando o marco', async () => {
    // 28, 29 e 30 de abril, sempre as 18h03 locais.
    const dias = [
      '2026-04-28T21:03:00.000Z',
      '2026-04-29T21:03:00.000Z',
      '2026-04-30T21:03:00.000Z',
    ];
    for (const instante of dias) {
      jest.setSystemTime(new Date(instante));
      await adicionarTreinoLivre({
        vaultRoot: VAULT_ROOT,
        exercicioSlug: 'supino',
        autor: 'pessoa_a',
      });
    }
    expect(arquivosDeTreino()).toHaveLength(3);

    const out = await verificarMarcosAuto(VAULT_ROOT);

    expect(descricoesSalvas()).toContain(DESCRICAO_TRES_TREINOS);
    expect(out.criados).toBeGreaterThanOrEqual(1);
  });
});
