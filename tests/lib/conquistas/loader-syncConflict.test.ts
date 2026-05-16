// Teste de regressao do filtro sync-conflict no loader cruzado de
// conquistas (sprint AUDIT-T1B6-MIGRATION-FIX, 2026-05-15).
//
// Sem o filtro, listVaultFolder devolveria a copia
// evento-show.sync-conflict-...md ao lado do evento-show.md original;
// readVaultFile parsearia ambos e a UI exibiria conquista duplicada.
//
// Filtro defensivo: copia .sync-conflict permanece no vault para
// Obsidian/Syncthing reconciliar; loader apenas nao a inclui.
//
// Comentarios sem acento (convencao shell/CI).
import type { EventoMeta } from '@/lib/schemas/evento';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { Midia } from '@/lib/schemas/midia';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

import { lerConquistas } from '@/lib/conquistas/loader';

const VAULT_ROOT = 'content://test/vault';

function midiaFoto(path: string): Midia {
  return { tipo: 'foto', path };
}

function fakeEvento(
  data: string,
  modo: 'positivo' | 'negativo',
  midia: Midia[]
): EventoMeta {
  return {
    tipo: 'evento',
    data,
    autor: 'pessoa_a',
    modo,
    categoria: 'show',
    intensidade: 4,
    fotos: [],
    com: [],
    midia,
    para: { tipo: 'mim' },
  } as unknown as EventoMeta;
}

function fakeDiario(
  data: string,
  modo: 'conquista' | 'gatilho' | 'vitoria' | 'trigger',
  midia: Midia[]
): DiarioEmocionalMeta {
  // R0: normaliza modo legacy para canonico (espelha o que o schema
  // faz com z.preprocess ao ler .md antigos do disco).
  const modoCanonico: 'gatilho' | 'conquista' =
    modo === 'trigger' || modo === 'gatilho' ? 'gatilho' : 'conquista';
  return {
    tipo: 'diario_emocional',
    data,
    autor: 'pessoa_b',
    modo: modoCanonico,
    intensidade: 3,
    emocoes: [],
    com: [],
    contexto_social: [],
    estrategia: 'respiracao',
    texto: 'Texto qualquer.',
    tags: [],
    midia,
    para: { tipo: 'mim' },
  } as unknown as DiarioEmocionalMeta;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('lerConquistas — filtro sync-conflict (T1B6)', () => {
  it('descarta evento-<slug>.sync-conflict-...md mesmo com mesmo modo positivo', async () => {
    mockListVaultFolder.mockImplementation(async () => [
      `${VAULT_ROOT}/markdown/evento-show.md`,
      `${VAULT_ROOT}/markdown/evento-show.sync-conflict-20260506-093412-OURO1.md`,
    ]);
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      // Ambos arquivos passariam parse; conflito devolveria duplicata.
      const meta = fakeEvento('2026-05-06', 'positivo', [midiaFoto('p1.jpg')]);
      if (uri.includes('sync-conflict')) {
        return { meta, body: '' };
      }
      if (uri.endsWith('evento-show.md')) {
        return { meta, body: '' };
      }
      return null;
    });

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(1);
    expect(result.totaisPorOrigem.evento_positivo).toBe(1);
    // readVaultFile so foi chamado para o arquivo legitimo.
    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => u.includes('sync-conflict'))).toBe(false);
  });

  it('descarta diario-<slug>.sync-conflict-...md mesmo com modo conquista', async () => {
    mockListVaultFolder.mockImplementation(async () => [
      `${VAULT_ROOT}/markdown/diario-2026-05-06.md`,
      `${VAULT_ROOT}/markdown/diario-2026-05-06.sync-conflict-20260506-093412-OURO1.md`,
    ]);
    mockReadVaultFile.mockImplementation(async () => {
      const meta = fakeDiario('2026-05-06', 'conquista', [midiaFoto('v.jpg')]);
      return { meta, body: '' };
    });

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(1);
    expect(result.totaisPorOrigem.diario_vitoria).toBe(1);
    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => u.includes('sync-conflict'))).toBe(false);
  });

  it('detecta marker case-insensitive', async () => {
    mockListVaultFolder.mockImplementation(async () => [
      `${VAULT_ROOT}/markdown/evento-a.md`,
      `${VAULT_ROOT}/markdown/evento-a.SYNC-CONFLICT-20260506-093412-OURO1.md`,
      `${VAULT_ROOT}/markdown/evento-a.Sync-Conflict-20260506-093412-OURO2.md`,
    ]);
    mockReadVaultFile.mockImplementation(async () => ({
      meta: fakeEvento('2026-05-06', 'positivo', [midiaFoto('p1.jpg')]),
      body: '',
    }));

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(1);
    const urisLidos = mockReadVaultFile.mock.calls.map((c) => c[0] as string);
    expect(urisLidos.some((u) => /sync-conflict/i.test(u))).toBe(false);
  });
});
