// Testes da funcao saveDiario. Mocka writeVaultFile e readVaultFile
// do barrel '@/lib/vault' para isolar a logica pura sem tocar SAF.
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';

const mockWriteVaultFile = jest.fn<Promise<void>, [string, unknown, string]>();
const mockReadVaultFile = jest.fn<
  Promise<{ meta: DiarioEmocionalMeta; body: string } | null>,
  [string, unknown]
>();

jest.mock('@/lib/vault', () => {
  const actual = jest.requireActual('@/lib/vault');
  return {
    ...actual,
    writeVaultFile: (...args: [string, unknown, string]) =>
      mockWriteVaultFile(...args),
    readVaultFile: (...args: [string, unknown]) =>
      mockReadVaultFile(...args),
  };
});

import { saveDiario } from '@/lib/diario/saveDiario';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const baseTrigger: DiarioEmocionalMeta = {
  tipo: 'diario_emocional',
  data: '2026-04-29T15:30:00-03:00',
  autor: 'pessoa_a',
  modo: 'trigger',
  emocoes: ['raiva', 'frustracao'],
  intensidade: 4,
  com: ['pessoa_b'],
  contexto_social: [],
  texto: 'discussao sobre planejamento.',
  estrategia: 'respirei e sai do comodo.',
  funcionou: true,
  audio: null,
};

const baseSucesso: DiarioEmocionalMeta = {
  tipo: 'diario_emocional',
  data: '2026-04-29T19:45:00-03:00',
  autor: 'pessoa_a',
  modo: 'vitoria',
  emocoes: ['gratidao', 'alegria'],
  intensidade: 4,
  com: [],
  contexto_social: ['sozinho'],
  texto: 'consegui terminar o que comecei hoje.',
  audio: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  // Fixa relogio para tornar o path canonico determinista.
  // 2026-04-29 12:00 UTC = 09:00 em Sao Paulo (UTC-3).
  jest.useFakeTimers().setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('saveDiario caminho feliz', () => {
  it('grava no path canonico com slug da primeira emocao', async () => {
    const out = await saveDiario(
      baseTrigger,
      'corpo livre.',
      VAULT_ROOT
    );
    expect(out.uri).toMatch(
      /inbox\/mente\/diario\/2026-04-29-0900-raiva\.md$/
    );
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('inbox/mente/diario/2026-04-29-0900-raiva.md');
    expect(meta).toMatchObject({
      tipo: 'diario_emocional',
      modo: 'trigger',
      autor: 'pessoa_a',
    });
    expect(body).toBe('corpo livre.');
  });

  it('usa slug "registro" quando emocoes esta vazio', async () => {
    const sem: DiarioEmocionalMeta = { ...baseSucesso, emocoes: [] };
    const out = await saveDiario(sem, 'sem emocoes.', VAULT_ROOT);
    expect(out.uri).toMatch(
      /inbox\/mente\/diario\/2026-04-29-0900-registro\.md$/
    );
  });

  it('grava modo vitoria sem funcionou', async () => {
    const out = await saveDiario(baseSucesso, 'feliz.', VAULT_ROOT);
    expect(out.uri).toMatch(/-gratidao\.md$/);
    const [, meta] = mockWriteVaultFile.mock.calls[0];
    expect((meta as DiarioEmocionalMeta).funcionou).toBeUndefined();
  });

  it('normaliza root com barra final na concatenacao', async () => {
    await saveDiario(baseTrigger, '', `${VAULT_ROOT}/`);
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).not.toContain('//inbox/');
    expect(uri).toMatch(/\/inbox\/mente\/diario\//);
  });
});

describe('saveDiario validacao', () => {
  it('rejeita payload com funcionou em modo vitoria', async () => {
    const invalido = {
      ...baseSucesso,
      funcionou: true,
    } as unknown as DiarioEmocionalMeta;
    await expect(
      saveDiario(invalido, '', VAULT_ROOT)
    ).rejects.toThrow(/diario emocional invalido/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('rejeita intensidade fora do intervalo 1-5', async () => {
    const invalido = {
      ...baseTrigger,
      intensidade: 7,
    } as unknown as DiarioEmocionalMeta;
    await expect(
      saveDiario(invalido, '', VAULT_ROOT)
    ).rejects.toThrow(/diario emocional invalido/);
  });
});

describe('saveDiario conflito de path', () => {
  it('aplica sufixo numerico quando arquivo canonico ja existe', async () => {
    mockReadVaultFile.mockImplementation((uri) => {
      if (typeof uri !== 'string') return Promise.resolve(null);
      // Canonico existe; primeira tentativa com -1 nao existe.
      if (/-raiva\.md$/.test(uri)) {
        return Promise.resolve({ meta: baseTrigger, body: '' });
      }
      return Promise.resolve(null);
    });
    const out = await saveDiario(baseTrigger, 'corpo.', VAULT_ROOT);
    expect(out.uri).toMatch(/-raiva-1\.md$/);
  });

  it('aplica sufixo numerico crescente em colisoes consecutivas', async () => {
    mockReadVaultFile.mockImplementation((uri) => {
      if (typeof uri !== 'string') return Promise.resolve(null);
      if (
        /-raiva\.md$/.test(uri) ||
        /-raiva-1\.md$/.test(uri) ||
        /-raiva-2\.md$/.test(uri)
      ) {
        return Promise.resolve({ meta: baseTrigger, body: '' });
      }
      return Promise.resolve(null);
    });
    const out = await saveDiario(baseTrigger, 'corpo.', VAULT_ROOT);
    expect(out.uri).toMatch(/-raiva-3\.md$/);
  });
});
