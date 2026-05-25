// Testes do puxadorSono (HC -> Vault). Cobre:
//   1. tipo = SleepSession.
//   2. readRecords vazio -> {novos: 0, erro: null}, zero writes.
//   3. 2 sessoes novas -> 2 writes com duracao_min e data corretos.
//   4. Idempotencia: sessao com hc id ja presente no Vault e' pulada.
//   5. Dedup intra-batch: mesmo hc id 2x no batch escreve so 1x.
//   6. first sync (since=null) usa janela default 7d.
//   7. readRecords lanca -> {novos: 0, erro: msg}.
//   8. vault root null -> {novos: 0, erro: vault_root_indisponivel}.
//   9. pessoa = pessoa_b -> autor escrito com pessoa_b.
//  10. sessao sem metadata.id e' pulada (sem chave estavel).
//  11. duracao invalida (invertida/zero) e' filtrada.
//
// Mocka a bridge nativa, o writer vault/sono e o reader. Usa store real
// para useSettings e useVault (mesma estrategia do passos.test.ts).
//
// Comentarios sem acento.
const mockReadRecords = jest.fn();
const mockEscreverSono = jest.fn();
const mockListVaultFolder = jest.fn();

jest.mock('../../../../modules/health-connect/src', () => ({
  __esModule: true,
  readRecords: (...args: unknown[]) => mockReadRecords(...args),
}));

jest.mock('@/lib/vault/sono', () => ({
  __esModule: true,
  escreverSono: (...args: unknown[]) => mockEscreverSono(...args),
}));

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
}));

import { puxadorSono } from '@/lib/health/puxadores/sleep';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockEscreverSono.mockResolvedValue({
    uri: 'content://test/vault/markdown/sono-x.md',
    rel: 'markdown/sono-x.md',
  });
  mockListVaultFolder.mockResolvedValue([]);
  useVault.setState({ vaultRoot: VAULT_ROOT });
  useSettings.setState({
    pessoa: {
      ativa: 'pessoa_a',
      vaultCompartilhado: true,
      tipoCompanhia: 'sozinho',
    },
  });
});

afterAll(() => {
  useVault.setState({ vaultRoot: null });
});

describe('puxadorSono', () => {
  it('cenario 1: tipo SleepSession', () => {
    expect(puxadorSono.tipo).toBe('SleepSession');
  });

  it('cenario 2: readRecords vazio -> novos=0, erro=null, zero writes', async () => {
    mockReadRecords.mockResolvedValueOnce({ records: [] });
    const r = await puxadorSono.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 0, erro: null });
    expect(mockEscreverSono).not.toHaveBeenCalled();
  });

  it('cenario 3: 2 sessoes novas -> 2 writes com duracao_min e data corretos', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        {
          startTime: '2026-05-21T02:15:00.000Z', // 23:15 BRT (D-1)
          endTime: '2026-05-21T10:32:00.000Z', // 07:32 BRT, data despertar 2026-05-21
          metadata: {
            id: 'sess-aaa',
            dataOrigin: { packageName: 'com.samsung.health' },
          },
        },
        {
          startTime: '2026-05-22T03:00:00.000Z', // 00:00 BRT
          endTime: '2026-05-22T11:00:00.000Z', // 08:00 BRT, data despertar 2026-05-22
          metadata: { id: 'sess-bbb' },
        },
      ],
    });

    const r = await puxadorSono.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.erro).toBeNull();
    expect(r.novos).toBe(2);
    expect(mockEscreverSono).toHaveBeenCalledTimes(2);

    const [, d1] = mockEscreverSono.mock.calls[0];
    expect(d1.data).toBe('2026-05-21');
    // 10:32 - 02:15 = 8h17 = 497 min.
    expect(d1.duracao_min).toBe(497);
    expect(d1.fonte_hc_id).toBe('sess-aaa');
    expect(d1.fonte_hc_origin).toBe('com.samsung.health');
    expect(d1.autor).toBe('pessoa_a');

    const [, d2] = mockEscreverSono.mock.calls[1];
    expect(d2.data).toBe('2026-05-22');
    expect(d2.duracao_min).toBe(480); // 8h
    expect(d2.fonte_hc_id).toBe('sess-bbb');
    expect(d2.fonte_hc_origin).toBeUndefined();
  });

  it('cenario 4: idempotencia — sessao com hc id ja no Vault e pulada', async () => {
    // Vault ja tem a sessao sess-aaa (slug derivado).
    mockListVaultFolder.mockResolvedValueOnce([
      'content://test/vault/markdown/sono-2026-05-21-hc-sess-aaa.md',
    ]);
    mockReadRecords.mockResolvedValueOnce({
      records: [
        {
          startTime: '2026-05-21T02:15:00.000Z',
          endTime: '2026-05-21T10:32:00.000Z',
          metadata: { id: 'sess-aaa' },
        },
        {
          startTime: '2026-05-22T03:00:00.000Z',
          endTime: '2026-05-22T11:00:00.000Z',
          metadata: { id: 'sess-bbb' },
        },
      ],
    });

    const r = await puxadorSono.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    expect(mockEscreverSono).toHaveBeenCalledTimes(1);
    const [, d] = mockEscreverSono.mock.calls[0];
    expect(d.fonte_hc_id).toBe('sess-bbb');
  });

  it('cenario 5: dedup intra-batch — mesmo hc id 2x escreve so 1x', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        {
          startTime: '2026-05-21T02:15:00.000Z',
          endTime: '2026-05-21T10:32:00.000Z',
          metadata: { id: 'sess-dup' },
        },
        {
          startTime: '2026-05-21T02:15:00.000Z',
          endTime: '2026-05-21T10:32:00.000Z',
          metadata: { id: 'sess-dup' },
        },
      ],
    });

    const r = await puxadorSono.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    expect(mockEscreverSono).toHaveBeenCalledTimes(1);
  });

  it('cenario 6: first sync (since=null) usa janela default 7d', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({ records: [] });

    await puxadorSono.puxar({ since: null, pageSize: 1000 });

    expect(mockReadRecords).toHaveBeenCalledTimes(1);
    const [tipo, opts] = mockReadRecords.mock.calls[0];
    expect(tipo).toBe('SleepSession');
    const startDate = new Date(opts.timeRangeFilter.startTime);
    const esperado = new Date('2026-05-15T15:00:00.000Z').getTime();
    expect(Math.abs(startDate.getTime() - esperado)).toBeLessThan(2000);
    expect(opts.timeRangeFilter.endTime).toBe('2026-05-22T15:00:00.000Z');
    expect(opts.pageSize).toBe(1000);
    expect(opts.ascendingOrder).toBe(true);

    jest.useRealTimers();
  });

  it('cenario 7: readRecords lanca -> {novos: 0, erro: msg}', async () => {
    mockReadRecords.mockRejectedValueOnce(new Error('permission_denied'));

    const r = await puxadorSono.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 0, erro: 'permission_denied' });
    expect(mockEscreverSono).not.toHaveBeenCalled();
  });

  it('cenario 8: vault root null -> {novos: 0, erro: vault_root_indisponivel}', async () => {
    useVault.setState({ vaultRoot: null });

    const r = await puxadorSono.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 0, erro: 'vault_root_indisponivel' });
    expect(mockReadRecords).not.toHaveBeenCalled();
    expect(mockEscreverSono).not.toHaveBeenCalled();
  });

  it('cenario 9: pessoa = pessoa_b -> autor escrito com pessoa_b', async () => {
    useSettings.setState({
      pessoa: {
        ativa: 'pessoa_b',
        vaultCompartilhado: true,
        tipoCompanhia: 'sozinho',
      },
    });
    mockReadRecords.mockResolvedValueOnce({
      records: [
        {
          startTime: '2026-05-21T02:15:00.000Z',
          endTime: '2026-05-21T10:32:00.000Z',
          metadata: { id: 'sess-pb' },
        },
      ],
    });

    const r = await puxadorSono.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const [, d] = mockEscreverSono.mock.calls[0];
    expect(d.autor).toBe('pessoa_b');
  });

  it('cenario 10: sessao sem metadata.id e pulada (sem chave estavel)', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        {
          startTime: '2026-05-21T02:15:00.000Z',
          endTime: '2026-05-21T10:32:00.000Z',
          metadata: {},
        },
      ],
    });

    const r = await puxadorSono.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(0);
    expect(mockEscreverSono).not.toHaveBeenCalled();
  });

  it('cenario 11: duracao invalida (invertida ou zero) e filtrada', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        // Invertida (fim antes do inicio).
        {
          startTime: '2026-05-21T10:00:00.000Z',
          endTime: '2026-05-21T08:00:00.000Z',
          metadata: { id: 'inv' },
        },
        // Zero (inicio == fim).
        {
          startTime: '2026-05-21T05:00:00.000Z',
          endTime: '2026-05-21T05:00:00.000Z',
          metadata: { id: 'zero' },
        },
      ],
    });

    const r = await puxadorSono.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(0);
    expect(mockEscreverSono).not.toHaveBeenCalled();
  });
});
