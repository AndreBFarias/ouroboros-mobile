// Testes do modulo de vault para agenda (M37.1.2). Cobre escrita,
// leitura, listagem, exclusao, sincronizacao snapshot (3 cenarios:
// adicionado, atualizado, removido), idempotencia e rejeicao de
// frontmatter invalido.
//
// Comentarios sem acento (convencao shell/CI).

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockDeleteAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: 'cache://test/',
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  StorageAccessFramework: {
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

import {
  AgendaEventoSchema,
  apagarEventoAgenda,
  listarEventosAgenda,
  salvarEventoAgenda,
  sincronizarSnapshotAgenda,
  type AgendaEvento,
} from '@/lib/vault/agenda';

const VAULT_ROOT = 'content://test/vault';
const TS_BASE = '2026-05-05T20:00:00-03:00';

const eventoBase: AgendaEvento = {
  id: 'abc123',
  pessoa: 'pessoa_a',
  titulo: 'Reuniao com equipe',
  inicio: '2026-05-07T13:00:00-03:00',
  fim: '2026-05-07T14:00:00-03:00',
  fonte: 'google_calendar',
  sincronizado_em: TS_BASE,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMakeDirectoryAsync.mockResolvedValue(undefined);
  mockWriteVaultFile.mockResolvedValue(undefined);
  mockDeleteAsync.mockResolvedValue(undefined);
});

describe('AgendaEventoSchema', () => {
  it('aceita evento com 7 campos canonicos', () => {
    const r = AgendaEventoSchema.safeParse(eventoBase);
    expect(r.success).toBe(true);
  });

  it('aceita campo local opcional', () => {
    const r = AgendaEventoSchema.safeParse({
      ...eventoBase,
      local: 'Sao Paulo',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita id vazio', () => {
    const r = AgendaEventoSchema.safeParse({ ...eventoBase, id: '' });
    expect(r.success).toBe(false);
  });

  it('rejeita pessoa fora do enum', () => {
    const r = AgendaEventoSchema.safeParse({
      ...eventoBase,
      pessoa: 'pessoa_c',
    });
    expect(r.success).toBe(false);
  });

  it('rejeita fonte que nao seja google_calendar', () => {
    const r = AgendaEventoSchema.safeParse({ ...eventoBase, fonte: 'outlook' });
    expect(r.success).toBe(false);
  });
});

describe('listarEventosAgenda', () => {
  it('lista eventos da pasta', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-07-abc123.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({ meta: eventoBase, body: '' });
    const lista = await listarEventosAgenda(VAULT_ROOT, 'pessoa_a');
    expect(lista).toHaveLength(1);
    expect(lista[0].titulo).toBe('Reuniao com equipe');
  });

  it('ordena ascendente por inicio', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-a.md',
      'content://test/vault/markdown/agenda-pessoa_a-b.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      return {
        meta:
          i === 1
            ? {
                ...eventoBase,
                id: 'tarde',
                inicio: '2026-05-07T20:00:00-03:00',
              }
            : {
                ...eventoBase,
                id: 'manha',
                inicio: '2026-05-07T08:00:00-03:00',
              },
        body: '',
      };
    });
    const lista = await listarEventosAgenda(VAULT_ROOT, 'pessoa_a');
    expect(lista[0].id).toBe('manha');
    expect(lista[1].id).toBe('tarde');
  });

  it('ignora arquivos malformados', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-ok.md',
      'content://test/vault/markdown/agenda-pessoa_a-ruim.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      if (i === 2) throw new Error('frontmatter ausente');
      return { meta: eventoBase, body: '' };
    });
    const lista = await listarEventosAgenda(VAULT_ROOT, 'pessoa_a');
    expect(lista).toHaveLength(1);
  });

  it('pasta vazia retorna []', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    const lista = await listarEventosAgenda(VAULT_ROOT, 'pessoa_a');
    expect(lista).toEqual([]);
  });
});

describe('salvarEventoAgenda', () => {
  it('escreve no path canonico markdown/agenda-<pessoa>-<YMD>-<id>.md (H2 layout-por-tipo)', async () => {
    const out = await salvarEventoAgenda(VAULT_ROOT, eventoBase);
    expect(out.rel).toBe('markdown/agenda-pessoa_a-2026-05-07-abc123.md');
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('rejeita evento com schema invalido', async () => {
    await expect(
      salvarEventoAgenda(VAULT_ROOT, { ...eventoBase, titulo: '' })
    ).rejects.toThrow(/evento agenda invalido/);
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('passa descricao como body do .md', async () => {
    await salvarEventoAgenda(VAULT_ROOT, eventoBase, 'Pauta no link');
    expect(mockWriteVaultFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: 'abc123' }),
      'Pauta no link'
    );
  });

  it('vaultRoot vazio dispara erro de vaultUriJoin (defesa A29)', async () => {
    await expect(salvarEventoAgenda('', eventoBase)).rejects.toThrow(
      /vault.*nao inicializado|root vazio/i
    );
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('vaultRoot SAF com trailing slash usa vaultUriJoin canonico (sem barras duplas)', async () => {
    // vaultUriJoin (paths.ts) normaliza trailing slashes do root,
    // garantindo que a URI final nao tem '//' no meio. Test de
    // contrato: agenda.ts agora delega para o helper canonico
    // (substituiu joinUri local em I-AGENDA).
    const rootComBarra =
      'content://com.android.externalstorage.documents/tree/primary%3AProtocolo-Ouroboros/';
    const out = await salvarEventoAgenda(rootComBarra, eventoBase);
    expect(out.uri).toBe(
      'content://com.android.externalstorage.documents/tree/primary%3AProtocolo-Ouroboros/markdown/agenda-pessoa_a-2026-05-07-abc123.md'
    );
    expect(out.uri).not.toContain('//markdown');
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('vaultRoot SAF com trailing %20 e barra usa vaultUriJoin (defesa A29)', async () => {
    // Caso especifico de OEM com SAF retornando %20 colado ao slug
    // (Armadilha A29). vaultUriJoin remove na ordem: trim, \s+$,
    // %20+$, /+$. Ate uma barra final precede o %20, mas nao o
    // contrario — entao testamos a forma realista pos-trim.
    const rootComPercent =
      'content://com.android.externalstorage.documents/tree/primary%3AProtocolo-Ouroboros%20';
    const out = await salvarEventoAgenda(rootComPercent, eventoBase);
    expect(out.uri).toBe(
      'content://com.android.externalstorage.documents/tree/primary%3AProtocolo-Ouroboros/markdown/agenda-pessoa_a-2026-05-07-abc123.md'
    );
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });
});

describe('apagarEventoAgenda', () => {
  it('remove .md cujo basename termina em -<id>.md', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-07-abc123.md',
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-08-xyz999.md',
    ]);
    await apagarEventoAgenda(VAULT_ROOT, 'pessoa_a', 'abc123');
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-07-abc123.md'
    );
  });

  it('id ausente nao quebra (idempotente)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]);
    await expect(
      apagarEventoAgenda(VAULT_ROOT, 'pessoa_a', 'fantasma')
    ).resolves.toBeUndefined();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });
});

describe('sincronizarSnapshotAgenda', () => {
  it('cenario 1: evento novo -> adicionado=1', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]); // listar inicial vazio
    const r = await sincronizarSnapshotAgenda(
      VAULT_ROOT,
      'pessoa_a',
      [eventoBase],
      TS_BASE
    );
    expect(r).toEqual({ adicionados: 1, atualizados: 0, removidos: 0 });
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });

  it('sincronizacao inicial com N eventos cria N arquivos .md', async () => {
    mockListVaultFolder.mockResolvedValueOnce([]); // pasta vazia
    const eventos: AgendaEvento[] = Array.from({ length: 5 }, (_, i) => ({
      ...eventoBase,
      id: `ev_${i}`,
      titulo: `Evento ${i}`,
      inicio: `2026-05-${String(7 + i).padStart(2, '0')}T10:00:00-03:00`,
    }));
    const r = await sincronizarSnapshotAgenda(
      VAULT_ROOT,
      'pessoa_a',
      eventos,
      TS_BASE
    );
    expect(r).toEqual({ adicionados: 5, atualizados: 0, removidos: 0 });
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(5);
    // Cada chamada deve ter URI canonica via vaultUriJoin.
    for (let i = 0; i < 5; i++) {
      const uriArg = mockWriteVaultFile.mock.calls[i][0] as string;
      expect(uriArg).toContain(
        `markdown/agenda-pessoa_a-2026-05-${String(7 + i).padStart(2, '0')}-ev_${i}.md`
      );
    }
  });

  it('cenario 2: evento existente com mudanca -> atualizado=1', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-07-abc123.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: { ...eventoBase, titulo: 'Antigo titulo' },
      body: '',
    });
    const r = await sincronizarSnapshotAgenda(
      VAULT_ROOT,
      'pessoa_a',
      [{ ...eventoBase, titulo: 'Novo titulo' }],
      TS_BASE
    );
    expect(r).toEqual({ adicionados: 0, atualizados: 1, removidos: 0 });
  });

  it('cenario 3: evento removido remotamente -> removido=1', async () => {
    // Primeiro list call (em listarEventosAgenda interno do sincronizar)
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-07-abc123.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: { ...eventoBase, sincronizado_em: '2026-05-04T20:00:00-03:00' },
      body: '',
    });
    // Segundo list call (em apagarEventoAgenda interno)
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-07-abc123.md',
    ]);

    const r = await sincronizarSnapshotAgenda(
      VAULT_ROOT,
      'pessoa_a',
      [], // lista nova vazia: removeu o unico evento
      TS_BASE
    );
    expect(r).toEqual({ adicionados: 0, atualizados: 0, removidos: 1 });
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
  });

  it('idempotencia: rodar 2x com mesma lista e mesmo ts -> {0,0,0}', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-07-abc123.md',
    ]);
    mockReadVaultFile.mockResolvedValueOnce({ meta: eventoBase, body: '' });
    const r = await sincronizarSnapshotAgenda(
      VAULT_ROOT,
      'pessoa_a',
      [eventoBase],
      TS_BASE
    );
    expect(r).toEqual({ adicionados: 0, atualizados: 0, removidos: 0 });
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('cenario combinado: 1 novo + 1 atualizado + 1 removido', async () => {
    // Estado atual: ev_a (sera atualizado), ev_b (sera removido)
    const evA: AgendaEvento = {
      ...eventoBase,
      id: 'ev_a',
      titulo: 'Antigo A',
      sincronizado_em: '2026-05-04T20:00:00-03:00',
    };
    const evB: AgendaEvento = {
      ...eventoBase,
      id: 'ev_b',
      titulo: 'B',
      inicio: '2026-05-08T10:00:00-03:00',
      sincronizado_em: '2026-05-04T20:00:00-03:00',
    };

    // Listar interno
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-07-ev_a.md',
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-08-ev_b.md',
    ]);
    let i = 0;
    mockReadVaultFile.mockImplementation(async () => {
      i++;
      return { meta: i === 1 ? evA : evB, body: '' };
    });
    // Listar de novo dentro de apagarEventoAgenda(ev_b)
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/agenda-pessoa_a-2026-05-08-ev_b.md',
    ]);

    // Lista nova: ev_a atualizado + ev_c novo (ev_b sumiu)
    const evANovo: AgendaEvento = {
      ...evA,
      titulo: 'Novo A',
      sincronizado_em: TS_BASE,
    };
    const evC: AgendaEvento = {
      ...eventoBase,
      id: 'ev_c',
      titulo: 'C',
      inicio: '2026-05-09T15:00:00-03:00',
    };

    const r = await sincronizarSnapshotAgenda(
      VAULT_ROOT,
      'pessoa_a',
      [evANovo, evC],
      TS_BASE
    );
    expect(r).toEqual({ adicionados: 1, atualizados: 1, removidos: 1 });
  });
});
