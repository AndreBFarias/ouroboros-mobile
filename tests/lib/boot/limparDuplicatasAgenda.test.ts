// Testes do boot hook AUDIT-P1-4 limparDuplicatasAgenda, que colapsa
// os .md de agenda repetidos por id (mesmo evento gravado em datas
// diferentes antes do fix de sincronizarSnapshotAgenda).
//
// Mocka:
//  - @/lib/vault/reader: listVaultFolder + readVaultFile (a leitura em
//    lote de leituraLote.ts reusa readVaultFile, entao o mock cobre as
//    duas primitivas).
//  - expo-file-system/legacy: StorageAccessFramework.deleteAsync, para
//    assertar exatamente quais URIs sairam.
//  - useSessao.flags / useVault.vaultRoot: stores reais (zustand
//    in-memory), resetados entre testes.
//
// Comentarios sem acento (convencao shell/CI).

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: 'cache://test/',
  makeDirectoryAsync: jest.fn(),
  StorageAccessFramework: {
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  },
}));

import {
  limparDuplicatasAgenda,
  limparDuplicatasAgendaUmaVez,
} from '@/lib/boot/limparDuplicatasAgenda';
import { BOOT_HOOKS } from '@/lib/boot/reagendamento';
import { useSessao } from '@/lib/stores/sessao';
import { useVault } from '@/lib/stores/vault';
import type { AgendaEvento } from '@/lib/vault/agenda';

const VAULT_ROOT = 'content://test/vault';
const MD = `${VAULT_ROOT}/markdown`;

const eventoBase: AgendaEvento = {
  id: 'ev_dentista',
  pessoa: 'pessoa_a',
  titulo: 'Dentista',
  inicio: '2026-08-03T09:00:00-03:00',
  fim: '2026-08-03T10:00:00-03:00',
  fonte: 'google_calendar',
  sincronizado_em: '2026-07-01T08:00:00-03:00',
};

// Copia do evento em outra data, com o sincronizado_em do sync que a
// gravou (mais recente = versao corrente).
function copiaEm(
  ymd: string,
  sincronizadoEm: string,
  extra: Partial<AgendaEvento> = {}
): AgendaEvento {
  return {
    ...eventoBase,
    inicio: `${ymd}T09:00:00-03:00`,
    fim: `${ymd}T10:00:00-03:00`,
    sincronizado_em: sincronizadoEm,
    ...extra,
  };
}

beforeEach(() => {
  // mockReset (nao clearAllMocks): os casos abaixo enfileiram valores
  // com mockResolvedValueOnce e alguns saem cedo sem consumir a fila.
  // clearAllMocks nao drena a fila de "Once", entao sobra de um caso
  // vazaria para o proximo.
  mockListVaultFolder.mockReset();
  mockReadVaultFile.mockReset();
  mockDeleteAsync.mockReset();
  mockDeleteAsync.mockResolvedValue(undefined);
  useVault.setState({ vaultRoot: VAULT_ROOT });
  useSessao.setState((s) => ({
    flags: { ...s.flags, duplicatasAgendaLimpas: false },
  }));
});

describe('limparDuplicatasAgenda', () => {
  it('mantem so a copia de sincronizado_em mais recente e apaga a antiga', async () => {
    const antigo = `${MD}/agenda-pessoa_a-2026-08-03-ev_dentista.md`;
    const corrente = `${MD}/agenda-pessoa_a-2026-08-10-ev_dentista.md`;
    mockListVaultFolder.mockResolvedValueOnce([antigo, corrente]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-03', '2026-07-01T08:00:00-03:00'),
      body: '',
    });
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-10', '2026-07-20T08:00:00-03:00'),
      body: '',
    });

    const apagados = await limparDuplicatasAgenda(VAULT_ROOT);

    expect(apagados).toBe(1);
    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
    expect(mockDeleteAsync).toHaveBeenCalledWith(antigo);
  });

  it('tres copias do mesmo id sobram em uma so', async () => {
    const a = `${MD}/agenda-pessoa_a-2026-08-03-ev_dentista.md`;
    const b = `${MD}/agenda-pessoa_a-2026-08-10-ev_dentista.md`;
    const c = `${MD}/agenda-pessoa_a-2026-08-17-ev_dentista.md`;
    mockListVaultFolder.mockResolvedValueOnce([a, b, c]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-03', '2026-07-01T08:00:00-03:00'),
      body: '',
    });
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-10', '2026-07-10T08:00:00-03:00'),
      body: '',
    });
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-17', '2026-07-20T08:00:00-03:00'),
      body: '',
    });

    const apagados = await limparDuplicatasAgenda(VAULT_ROOT);

    expect(apagados).toBe(2);
    expect(mockDeleteAsync.mock.calls.map((ch) => ch[0]).sort()).toEqual(
      [a, b].sort()
    );
  });

  it('vault sem duplicata nao apaga nada', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${MD}/agenda-pessoa_a-2026-08-03-ev_dentista.md`,
      `${MD}/agenda-pessoa_a-2026-08-10-ev_reuniao.md`,
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-03', '2026-07-20T08:00:00-03:00'),
      body: '',
    });
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-10', '2026-07-20T08:00:00-03:00', {
        id: 'ev_reuniao',
      }),
      body: '',
    });

    const apagados = await limparDuplicatasAgenda(VAULT_ROOT);

    expect(apagados).toBe(0);
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('mesmo id em pessoas diferentes nao e duplicata', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${MD}/agenda-pessoa_a-2026-08-03-ev_dentista.md`,
      `${MD}/agenda-pessoa_b-2026-08-03-ev_dentista.md`,
    ]);
    // pessoa_a le o dela; pessoa_b le o dela (uma listagem, dois filtros).
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-03', '2026-07-20T08:00:00-03:00'),
      body: '',
    });
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-03', '2026-07-20T08:00:00-03:00', {
        pessoa: 'pessoa_b',
      }),
      body: '',
    });

    const apagados = await limparDuplicatasAgenda(VAULT_ROOT);

    expect(apagados).toBe(0);
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('arquivo malformado nao e apagado (sai da leitura em lote)', async () => {
    const bom = `${MD}/agenda-pessoa_a-2026-08-10-ev_dentista.md`;
    const ruim = `${MD}/agenda-pessoa_a-2026-08-03-ev_dentista.md`;
    mockListVaultFolder.mockResolvedValueOnce([ruim, bom]);
    mockReadVaultFile.mockRejectedValueOnce(new Error('frontmatter ausente'));
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-10', '2026-07-20T08:00:00-03:00'),
      body: '',
    });

    const apagados = await limparDuplicatasAgenda(VAULT_ROOT);

    expect(apagados).toBe(0);
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('pasta com menos de 2 arquivos nem le (sai antes)', async () => {
    mockListVaultFolder.mockResolvedValueOnce([
      `${MD}/agenda-pessoa_a-2026-08-10-ev_dentista.md`,
    ]);

    const apagados = await limparDuplicatasAgenda(VAULT_ROOT);

    expect(apagados).toBe(0);
    expect(mockReadVaultFile).not.toHaveBeenCalled();
  });

  it('vaultRoot vazio e no-op', async () => {
    const apagados = await limparDuplicatasAgenda('');
    expect(apagados).toBe(0);
    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });
});

describe('limparDuplicatasAgendaUmaVez', () => {
  it('apaga a duplicata e marca a flag de boot', async () => {
    const antigo = `${MD}/agenda-pessoa_a-2026-08-03-ev_dentista.md`;
    mockListVaultFolder.mockResolvedValueOnce([
      antigo,
      `${MD}/agenda-pessoa_a-2026-08-10-ev_dentista.md`,
    ]);
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-03', '2026-07-01T08:00:00-03:00'),
      body: '',
    });
    mockReadVaultFile.mockResolvedValueOnce({
      meta: copiaEm('2026-08-10', '2026-07-20T08:00:00-03:00'),
      body: '',
    });

    await limparDuplicatasAgendaUmaVez();

    expect(mockDeleteAsync).toHaveBeenCalledWith(antigo);
    expect(useSessao.getState().flags.duplicatasAgendaLimpas).toBe(true);
  });

  it('flag ja marcada: nao varre de novo', async () => {
    useSessao.setState((s) => ({
      flags: { ...s.flags, duplicatasAgendaLimpas: true },
    }));

    await limparDuplicatasAgendaUmaVez();

    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });

  it('sem vaultRoot: nao marca a flag (tenta de novo no proximo boot)', async () => {
    useVault.setState({ vaultRoot: null });

    await limparDuplicatasAgendaUmaVez();

    expect(mockListVaultFolder).not.toHaveBeenCalled();
    expect(useSessao.getState().flags.duplicatasAgendaLimpas).toBe(false);
  });

  it('falha de I/O nao propaga e ainda marca a flag', async () => {
    mockListVaultFolder.mockRejectedValueOnce(new Error('SAF indisponivel'));

    await expect(limparDuplicatasAgendaUmaVez()).resolves.toBeUndefined();
    expect(useSessao.getState().flags.duplicatasAgendaLimpas).toBe(true);
  });

  // CONTRACT 5.4: boot hook sem registro nunca executa em producao.
  it('esta plugado em BOOT_HOOKS', () => {
    expect(BOOT_HOOKS).toContain(limparDuplicatasAgendaUmaVez);
  });
});
