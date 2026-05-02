// Testes do loader cruzado de conquistas (M11.5). Cobre filtro
// modo, filtro midia.length, ordenação desc, mídia órfã (mantida na
// lista, decisão A5 do adendo), schema inválido (descartado), lista
// vazia.
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
  midia: Midia[],
  extras: Partial<EventoMeta> = {}
): EventoMeta {
  return {
    tipo: 'evento',
    data,
    autor: 'pessoa_a',
    modo,
    categoria: 'show',
    intensidade: 4,
    midia,
    ...extras,
  } as EventoMeta;
}

function fakeDiario(
  data: string,
  modo: 'vitoria' | 'trigger',
  midia: Midia[],
  extras: Partial<DiarioEmocionalMeta> = {}
): DiarioEmocionalMeta {
  return {
    tipo: 'diario_emocional',
    data,
    autor: 'pessoa_b',
    modo,
    intensidade: 3,
    estrategia: 'respiracao',
    texto: 'Texto qualquer.',
    tags: [],
    midia,
    ...extras,
  } as DiarioEmocionalMeta;
}

describe('lerConquistas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna vazio quando vaultRoot e string vazia', async () => {
    const result = await lerConquistas('');
    expect(result.conquistas).toEqual([]);
    expect(result.totaisPorOrigem).toEqual({
      evento_positivo: 0,
      diario_vitoria: 0,
    });
  });

  it('filtra eventos por modo positivo', async () => {
    mockListVaultFolder.mockImplementation(async (uri: string) => {
      if (uri.includes('eventos')) return ['a.md', 'b.md'];
      return [];
    });
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      if (uri.endsWith('a.md')) {
        return { meta: fakeEvento('2026-04-01', 'positivo', [midiaFoto('p1.jpg')]), body: '' };
      }
      if (uri.endsWith('b.md')) {
        return { meta: fakeEvento('2026-04-02', 'negativo', [midiaFoto('p2.jpg')]), body: '' };
      }
      return null;
    });

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(1);
    expect(result.conquistas[0].origem).toBe('evento_positivo');
    expect(result.totaisPorOrigem.evento_positivo).toBe(1);
  });

  it('filtra eventos sem midia', async () => {
    mockListVaultFolder.mockImplementation(async (uri: string) => {
      if (uri.includes('eventos')) return ['a.md', 'b.md'];
      return [];
    });
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      if (uri.endsWith('a.md')) {
        return { meta: fakeEvento('2026-04-01', 'positivo', []), body: '' };
      }
      if (uri.endsWith('b.md')) {
        return { meta: fakeEvento('2026-04-02', 'positivo', [midiaFoto('p2.jpg')]), body: '' };
      }
      return null;
    });

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(1);
    expect(result.conquistas[0].data).toBe('2026-04-02');
  });

  it('filtra diario por modo vitoria', async () => {
    mockListVaultFolder.mockImplementation(async (uri: string) => {
      if (uri.includes('inbox/mente/diario')) return ['v.md', 't.md'];
      return [];
    });
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      if (uri.endsWith('v.md')) {
        return { meta: fakeDiario('2026-04-10', 'vitoria', [midiaFoto('v.jpg')]), body: '' };
      }
      if (uri.endsWith('t.md')) {
        return { meta: fakeDiario('2026-04-11', 'trigger', [midiaFoto('t.jpg')]), body: '' };
      }
      return null;
    });

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(1);
    expect(result.conquistas[0].origem).toBe('diario_vitoria');
  });

  it('ordena conquistas por data descendente', async () => {
    mockListVaultFolder.mockImplementation(async (uri: string) => {
      if (uri.includes('eventos')) return ['a.md', 'b.md'];
      if (uri.includes('inbox/mente/diario')) return ['c.md'];
      return [];
    });
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      if (uri.endsWith('a.md')) {
        return { meta: fakeEvento('2026-03-01', 'positivo', [midiaFoto('p1.jpg')]), body: '' };
      }
      if (uri.endsWith('b.md')) {
        return { meta: fakeEvento('2026-04-15', 'positivo', [midiaFoto('p2.jpg')]), body: '' };
      }
      if (uri.endsWith('c.md')) {
        return { meta: fakeDiario('2026-04-20', 'vitoria', [midiaFoto('v.jpg')]), body: '' };
      }
      return null;
    });

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(3);
    expect(result.conquistas[0].data).toBe('2026-04-20');
    expect(result.conquistas[1].data).toBe('2026-04-15');
    expect(result.conquistas[2].data).toBe('2026-03-01');
  });

  it('mantem conquista mesmo quando arquivo de midia esta ausente (decisao A5)', async () => {
    // Loader nao verifica existencia do arquivo de midia. O cover
    // cuida do fallback graciosamente (placeholder ImageOff).
    mockListVaultFolder.mockImplementation(async (uri: string) => {
      if (uri.includes('eventos')) return ['orf.md'];
      return [];
    });
    mockReadVaultFile.mockImplementation(async () => ({
      meta: fakeEvento('2026-04-01', 'positivo', [
        midiaFoto('content://does-not-exist.jpg'),
      ]),
      body: '',
    }));

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(1);
    expect(result.conquistas[0].midiaPrincipal.tipo).toBe('foto');
  });

  it('descarta arquivo cujo schema falha (read retorna null)', async () => {
    mockListVaultFolder.mockImplementation(async (uri: string) => {
      if (uri.includes('eventos')) return ['ok.md', 'broken.md'];
      return [];
    });
    mockReadVaultFile.mockImplementation(async (uri: string) => {
      if (uri.endsWith('ok.md')) {
        return { meta: fakeEvento('2026-04-01', 'positivo', [midiaFoto('p1.jpg')]), body: '' };
      }
      // broken: simula schema invalido (reader retorna null)
      return null;
    });

    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas.length).toBe(1);
    expect(result.totaisPorOrigem.evento_positivo).toBe(1);
  });

  it('lista vazia quando nenhuma pasta tem arquivos', async () => {
    mockListVaultFolder.mockResolvedValue([]);
    const result = await lerConquistas(VAULT_ROOT);
    expect(result.conquistas).toEqual([]);
    expect(result.totaisPorOrigem.evento_positivo).toBe(0);
    expect(result.totaisPorOrigem.diario_vitoria).toBe(0);
  });
});
