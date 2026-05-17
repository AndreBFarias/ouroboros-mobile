// Testes do helper de Vault para Eventos de Contador (R-RECAP-5,
// 2026-05-16). Cobre listagem filtrada por contadorId, leitura
// global e ordenacao desc por criado_em.
//
// Mocks: reader/syncConflict para isolar I/O.
//
// Comentarios sem acento (convencao shell/CI).
import type { EventoContador } from '@/lib/schemas/evento_contador';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));

import {
  listarEventosContador,
  listarTodosEventosContador,
} from '@/lib/vault/eventosContador';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<EventoContador> = {}): EventoContador {
  return {
    tipo: 'evento_contador',
    contadorId: 'sem-cigarro',
    data: '2026-05-16',
    slug: 'evento-abcd',
    humor: 4,
    descricao: 'Almoco com amigos',
    tags: [],
    midias: [],
    criado_em: '2026-05-16T14:00:00-03:00',
    autor: 'pessoa_a',
    para: { tipo: 'mim' },
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listarEventosContador', () => {
  it('retorna [] para pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarEventosContador(VAULT_ROOT, 'sem-cigarro');
    expect(out).toEqual([]);
  });

  it('filtra apenas eventos do contador solicitado', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/evento-contador-sem-cigarro-2026-05-16-aaa.md`,
      `${VAULT_ROOT}/markdown/evento-contador-sem-cigarro-2026-05-15-bbb.md`,
      `${VAULT_ROOT}/markdown/evento-contador-outra-meta-2026-05-16-ccc.md`,
      `${VAULT_ROOT}/markdown/contador-sem-cigarro.md`,
      `${VAULT_ROOT}/markdown/diario-2026-05-16-1400-zzz.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('aaa.md')) {
        return Promise.resolve({
          meta: fixture({
            slug: 'aaa',
            criado_em: '2026-05-16T14:00:00-03:00',
          }),
          body: '',
        });
      }
      if (uri.endsWith('bbb.md')) {
        return Promise.resolve({
          meta: fixture({
            slug: 'bbb',
            data: '2026-05-15',
            criado_em: '2026-05-15T10:00:00-03:00',
          }),
          body: '',
        });
      }
      // ccc.md (outra-meta) -- nao deve aparecer (filtrado por prefixo)
      // contador-sem-cigarro.md -- nao deve aparecer
      // diario.md -- nao deve aparecer
      return Promise.resolve(null);
    });
    const out = await listarEventosContador(VAULT_ROOT, 'sem-cigarro');
    expect(out).toHaveLength(2);
    expect(out.map((e) => e.slug)).toEqual(['aaa', 'bbb']);
  });

  it('ordena desc por criado_em (mais recente primeiro)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/evento-contador-x-2026-05-10-old.md`,
      `${VAULT_ROOT}/markdown/evento-contador-x-2026-05-16-new.md`,
      `${VAULT_ROOT}/markdown/evento-contador-x-2026-05-12-mid.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('old.md'))
        return Promise.resolve({
          meta: fixture({
            contadorId: 'x',
            slug: 'old',
            criado_em: '2026-05-10T10:00:00-03:00',
          }),
          body: '',
        });
      if (uri.endsWith('new.md'))
        return Promise.resolve({
          meta: fixture({
            contadorId: 'x',
            slug: 'new',
            criado_em: '2026-05-16T10:00:00-03:00',
          }),
          body: '',
        });
      if (uri.endsWith('mid.md'))
        return Promise.resolve({
          meta: fixture({
            contadorId: 'x',
            slug: 'mid',
            criado_em: '2026-05-12T10:00:00-03:00',
          }),
          body: '',
        });
      return Promise.resolve(null);
    });
    const out = await listarEventosContador(VAULT_ROOT, 'x');
    expect(out.map((e) => e.slug)).toEqual(['new', 'mid', 'old']);
  });

  it('ignora arquivos malformados (schema fail) sem propagar', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/evento-contador-x-2026-05-16-ok.md`,
      `${VAULT_ROOT}/markdown/evento-contador-x-2026-05-16-bad.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('bad.md')) {
        return Promise.reject(new Error('schema invalido'));
      }
      return Promise.resolve({
        meta: fixture({ contadorId: 'x', slug: 'ok' }),
        body: '',
      });
    });
    const out = await listarEventosContador(VAULT_ROOT, 'x');
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe('ok');
  });

  it('filtra sync-conflict files do Syncthing', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/evento-contador-x-2026-05-16-aaa.md`,
      `${VAULT_ROOT}/markdown/evento-contador-x-2026-05-16-aaa.sync-conflict-20260516-100000-DEVICE.md`,
    ]);
    mockReadVaultFile.mockResolvedValue({
      meta: fixture({ contadorId: 'x', slug: 'aaa' }),
      body: '',
    });
    const out = await listarEventosContador(VAULT_ROOT, 'x');
    // Apenas o arquivo limpo entra (sync-conflict filtrado).
    expect(out).toHaveLength(1);
    expect(mockReadVaultFile).toHaveBeenCalledTimes(1);
  });
});

describe('listarTodosEventosContador', () => {
  it('retorna eventos de TODOS os contadores', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${VAULT_ROOT}/markdown/evento-contador-a-2026-05-16-aaa.md`,
      `${VAULT_ROOT}/markdown/evento-contador-b-2026-05-16-bbb.md`,
      `${VAULT_ROOT}/markdown/contador-a.md`,
    ]);
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.endsWith('aaa.md'))
        return Promise.resolve({
          meta: fixture({
            contadorId: 'a',
            slug: 'aaa',
            criado_em: '2026-05-16T14:00:00-03:00',
          }),
          body: '',
        });
      if (uri.endsWith('bbb.md'))
        return Promise.resolve({
          meta: fixture({
            contadorId: 'b',
            slug: 'bbb',
            criado_em: '2026-05-16T16:00:00-03:00',
          }),
          body: '',
        });
      return Promise.resolve(null);
    });
    const out = await listarTodosEventosContador(VAULT_ROOT);
    expect(out).toHaveLength(2);
    // Mais recente primeiro: bbb (16h) > aaa (14h).
    expect(out[0].slug).toBe('bbb');
    expect(out[1].slug).toBe('aaa');
  });

  it('retorna [] para pasta vazia', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const out = await listarTodosEventosContador(VAULT_ROOT);
    expect(out).toEqual([]);
  });
});
