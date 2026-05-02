// Testes da funcao saveEvento. Mocka writeVaultFile e readVaultFile
// do barrel '@/lib/vault' para isolar a logica pura sem tocar SAF;
// mocka expo-file-system/legacy.copyAsync para validar a copia das
// fotos sem mexer no filesystem real.
import type { EventoMeta } from '@/lib/schemas/evento';

const mockWriteVaultFile = jest.fn<Promise<void>, [string, unknown, string]>();
const mockReadVaultFile = jest.fn<
  Promise<{ meta: EventoMeta; body: string } | null>,
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

const mockCopyAsync = jest.fn<Promise<void>, [{ from: string; to: string }]>();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: [{ from: string; to: string }]) => mockCopyAsync(...args),
}));

import { saveEvento } from '@/lib/eventos/saveEvento';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const baseMeta: EventoMeta = {
  tipo: 'evento',
  data: '2026-04-29T15:30:00-03:00',
  autor: 'pessoa_a',
  modo: 'positivo',
  lugar: 'padaria da esquina',
  bairro: 'Vila Madalena',
  com: ['pessoa_b'],
  categoria: 'rolezinho',
  intensidade: 4,
  fotos: [],
  // M07.x: positivo exige ao menos uma midia. Saveevento nao reaplica
  // refine, mas mantemos populado para refletir o caminho real.
  midia: [{ tipo: 'foto', path: 'assets/2026-04-29-1530-stub.jpg' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReadVaultFile.mockResolvedValue(null);
  mockWriteVaultFile.mockResolvedValue(undefined);
  mockCopyAsync.mockResolvedValue(undefined);
  // Fixa relogio para path canonico determinista. 2026-04-29 12:00
  // UTC = 09:00 em Sao Paulo (UTC-3).
  jest.useFakeTimers().setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('saveEvento caminho feliz', () => {
  it('grava no path canonico com slug do bairro', async () => {
    const out = await saveEvento({
      meta: baseMeta,
      body: 'cafe da manha gostoso.',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/eventos\/2026-04-29-vila-madalena\.md$/);
    expect(out.fotosGravadas).toEqual([]);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta, body] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toContain('eventos/2026-04-29-vila-madalena.md');
    expect(meta).toMatchObject({
      tipo: 'evento',
      autor: 'pessoa_a',
      modo: 'positivo',
      lugar: 'padaria da esquina',
      bairro: 'Vila Madalena',
      categoria: 'rolezinho',
    });
    expect(body).toBe('cafe da manha gostoso.');
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('usa slug do texto quando bairro vazio', async () => {
    const semBairro: EventoMeta = { ...baseMeta, bairro: undefined };
    const out = await saveEvento({
      meta: semBairro,
      body: 'cafe da manha no parque.',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/eventos\/2026-04-29-cafe-da-manha\.md$/);
  });

  it('usa slug da categoria quando bairro e texto vazios', async () => {
    const minimo: EventoMeta = {
      ...baseMeta,
      bairro: undefined,
      categoria: 'evento_social',
    };
    const out = await saveEvento({
      meta: minimo,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/eventos\/2026-04-29-evento-social\.md$/);
  });

  it('normaliza root com barra final na concatenacao', async () => {
    await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: `${VAULT_ROOT}/`,
      fotos: [],
    });
    const [uri] = mockWriteVaultFile.mock.calls[0];
    expect(uri).not.toContain('//eventos/');
    expect(uri).toMatch(/\/eventos\//);
  });
});

describe('saveEvento fotos copiadas', () => {
  it('copia cada foto para assets/ e atualiza meta.fotos', async () => {
    const out = await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [
        'file:///cache/img-temp-1.jpg',
        'file:///cache/img-temp-2.jpg',
      ],
    });
    expect(mockCopyAsync).toHaveBeenCalledTimes(2);
    expect(out.fotosGravadas).toHaveLength(2);
    // Os paths gravados ficam relativos ao Vault e usam o
    // formatDateYmdHm (2026-04-29-0900) + sufixo evento + indice.
    expect(out.fotosGravadas[0]).toMatch(
      /^assets\/2026-04-29-0900-evento-1\.jpg$/
    );
    expect(out.fotosGravadas[1]).toMatch(
      /^assets\/2026-04-29-0900-evento-2\.jpg$/
    );
    // O meta gravado tem fotos com paths relativos (nao URIs locais).
    const [, metaGravado] = mockWriteVaultFile.mock.calls[0];
    expect((metaGravado as EventoMeta).fotos).toEqual(out.fotosGravadas);
  });

  it('cada copyAsync recebe URI completo de destino dentro do Vault', async () => {
    await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: ['file:///cache/img.jpg'],
    });
    const [arg] = mockCopyAsync.mock.calls[0];
    expect(arg.from).toBe('file:///cache/img.jpg');
    expect(arg.to).toMatch(/Vault\/assets\/2026-04-29-0900-evento-1\.jpg$/);
  });

  it('lista vazia de fotos nao chama copyAsync', async () => {
    await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });
});

describe('saveEvento validacao', () => {
  it('rejeita meta com intensidade fora do intervalo', async () => {
    const invalido = { ...baseMeta, intensidade: 9 } as unknown as EventoMeta;
    await expect(
      saveEvento({
        meta: invalido,
        body: '',
        vaultRoot: VAULT_ROOT,
        fotos: [],
      })
    ).rejects.toThrow(/evento invalido/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('rejeita meta com data fora de ISO 8601', async () => {
    const invalido = {
      ...baseMeta,
      data: 'ontem de manha',
    } as unknown as EventoMeta;
    await expect(
      saveEvento({
        meta: invalido,
        body: '',
        vaultRoot: VAULT_ROOT,
        fotos: [],
      })
    ).rejects.toThrow(/evento invalido/);
  });
});

describe('saveEvento conflito de path', () => {
  it('aplica sufixo numerico quando arquivo canonico ja existe', async () => {
    mockReadVaultFile.mockImplementation((uri) => {
      if (typeof uri !== 'string') return Promise.resolve(null);
      if (/-vila-madalena\.md$/.test(uri)) {
        return Promise.resolve({ meta: baseMeta, body: '' });
      }
      return Promise.resolve(null);
    });
    const out = await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/-vila-madalena-1\.md$/);
  });

  it('aplica sufixo numerico crescente em colisoes consecutivas', async () => {
    mockReadVaultFile.mockImplementation((uri) => {
      if (typeof uri !== 'string') return Promise.resolve(null);
      if (
        /-vila-madalena\.md$/.test(uri) ||
        /-vila-madalena-1\.md$/.test(uri) ||
        /-vila-madalena-2\.md$/.test(uri)
      ) {
        return Promise.resolve({ meta: baseMeta, body: '' });
      }
      return Promise.resolve(null);
    });
    const out = await saveEvento({
      meta: baseMeta,
      body: '',
      vaultRoot: VAULT_ROOT,
      fotos: [],
    });
    expect(out.uri).toMatch(/-vila-madalena-3\.md$/);
  });
});
