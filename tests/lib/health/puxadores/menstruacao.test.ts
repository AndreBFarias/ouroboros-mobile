// Testes do puxadorMenstruacao (HC -> Vault). Cobre:
//   1. readRecords vazio -> {novos: 0, erro: null}, zero writes.
//   2. mapeamento flow -> intensidade (1->2, 2->3, 3->4) e fase
//      menstrual, autor, schema-shape.
//   3. idempotencia por data: lerRegistroCiclo retorna existente ->
//      pula (nao sobrescreve registro manual).
//   4. first sync (since=null) usa janela default 7d e tipo
//      MenstruationFlow.
//   5. readRecords lanca -> {novos: 0, erro: msg}.
//   6. pessoa = pessoa_b -> autor escrito com pessoa_b.
//   7. vault root null -> {novos: 0, erro: vault_root_indisponivel}.
//   8. flow fora do dominio e record no futuro sao filtrados.
//   9. multiplos records na mesma data -> mantem maior flow.
//
// Mocka a bridge nativa e o modulo vault/ciclo (writer + reader).
// Usa store real para useSettings e useVault (fiel ao runtime).
//
// Comentarios sem acento.
const mockReadRecords = jest.fn();
const mockEscreverRegistroCiclo = jest.fn();
const mockLerRegistroCiclo = jest.fn();

jest.mock('../../../../modules/health-connect/src', () => ({
  __esModule: true,
  readRecords: (...args: unknown[]) => mockReadRecords(...args),
}));

jest.mock('@/lib/vault/ciclo', () => ({
  __esModule: true,
  escreverRegistroCiclo: (...args: unknown[]) =>
    mockEscreverRegistroCiclo(...args),
  lerRegistroCiclo: (...args: unknown[]) => mockLerRegistroCiclo(...args),
}));

import { puxadorMenstruacao } from '@/lib/health/puxadores/menstruacao';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockEscreverRegistroCiclo.mockResolvedValue({
    uri: 'content://test/vault/markdown/ciclo-x.md',
    rel: 'markdown/ciclo-x.md',
  });
  // Default: nenhum registro previo no Vault (autopull escreve).
  mockLerRegistroCiclo.mockResolvedValue(null);
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

describe('puxadorMenstruacao', () => {
  it('tipo MenstruationFlow', () => {
    expect(puxadorMenstruacao.tipo).toBe('MenstruationFlow');
  });

  it('cenario 1: readRecords vazio -> novos=0, erro=null, zero writes', async () => {
    mockReadRecords.mockResolvedValueOnce({ records: [] });
    const r = await puxadorMenstruacao.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 0, erro: null });
    expect(mockEscreverRegistroCiclo).not.toHaveBeenCalled();
  });

  it('cenario 2: mapeamento flow->intensidade e shape do meta', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({
      records: [
        // flow 1 (light) -> intensidade 2, data 2026-05-19.
        { time: '2026-05-19T13:00:00.000Z', flow: 1, metadata: { id: 'a' } },
        // flow 2 (medium) -> intensidade 3, data 2026-05-20.
        { time: '2026-05-20T13:00:00.000Z', flow: 2, metadata: { id: 'b' } },
        // flow 3 (heavy) -> intensidade 4, data 2026-05-21.
        { time: '2026-05-21T13:00:00.000Z', flow: 3, metadata: { id: 'c' } },
      ],
    });

    const r = await puxadorMenstruacao.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.erro).toBeNull();
    expect(r.novos).toBe(3);
    expect(mockEscreverRegistroCiclo).toHaveBeenCalledTimes(3);

    const metas = mockEscreverRegistroCiclo.mock.calls.map((c) => c[1]);
    expect(metas[0]).toEqual({
      tipo: 'ciclo_menstrual',
      data: '2026-05-19',
      autor: 'pessoa_a',
      data_inicio: null,
      fase: 'menstrual',
      sintomas: [],
      intensidade: 2,
      humor_associado: null,
      texto: null,
    });
    expect(metas[1].intensidade).toBe(3);
    expect(metas[2].intensidade).toBe(4);
    // Ordem ascendente de datas.
    expect(metas.map((m) => m.data)).toEqual([
      '2026-05-19',
      '2026-05-20',
      '2026-05-21',
    ]);

    jest.useRealTimers();
  });

  it('cenario 3: idempotencia por data — registro existente e pulado', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({
      records: [
        { time: '2026-05-20T13:00:00.000Z', flow: 2, metadata: { id: 'b' } },
        { time: '2026-05-21T13:00:00.000Z', flow: 3, metadata: { id: 'c' } },
      ],
    });
    // Dia 2026-05-20 ja tem registro manual; 2026-05-21 nao.
    mockLerRegistroCiclo.mockImplementation((_root: string, data: string) =>
      Promise.resolve(
        data === '2026-05-20'
          ? { tipo: 'ciclo_menstrual', data, autor: 'pessoa_a' }
          : null
      )
    );

    const r = await puxadorMenstruacao.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    expect(mockEscreverRegistroCiclo).toHaveBeenCalledTimes(1);
    const meta = mockEscreverRegistroCiclo.mock.calls[0][1];
    expect(meta.data).toBe('2026-05-21');

    jest.useRealTimers();
  });

  it('cenario 4: first sync (since=null) usa janela 7d e tipo MenstruationFlow', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({ records: [] });

    await puxadorMenstruacao.puxar({ since: null, pageSize: 1000 });

    expect(mockReadRecords).toHaveBeenCalledTimes(1);
    const [tipo, opts] = mockReadRecords.mock.calls[0];
    expect(tipo).toBe('MenstruationFlow');
    const startDate = new Date(opts.timeRangeFilter.startTime);
    const expectado = new Date('2026-05-15T15:00:00.000Z').getTime();
    expect(Math.abs(startDate.getTime() - expectado)).toBeLessThan(2000);
    expect(opts.timeRangeFilter.endTime).toBe('2026-05-22T15:00:00.000Z');
    expect(opts.pageSize).toBe(1000);
    expect(opts.ascendingOrder).toBe(true);

    jest.useRealTimers();
  });

  it('cenario 5: readRecords lanca -> {novos: 0, erro: msg}', async () => {
    mockReadRecords.mockRejectedValueOnce(new Error('permission_denied'));

    const r = await puxadorMenstruacao.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 0, erro: 'permission_denied' });
    expect(mockEscreverRegistroCiclo).not.toHaveBeenCalled();
  });

  it('cenario 6: pessoa = pessoa_b -> autor escrito com pessoa_b', async () => {
    useSettings.setState({
      pessoa: {
        ativa: 'pessoa_b',
        vaultCompartilhado: true,
        tipoCompanhia: 'sozinho',
      },
    });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({
      records: [
        { time: '2026-05-21T13:00:00.000Z', flow: 2, metadata: { id: 'a' } },
      ],
    });

    const r = await puxadorMenstruacao.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const meta = mockEscreverRegistroCiclo.mock.calls[0][1];
    expect(meta.autor).toBe('pessoa_b');

    jest.useRealTimers();
  });

  it('cenario 7: vault root null -> {novos: 0, erro: vault_root_indisponivel}', async () => {
    useVault.setState({ vaultRoot: null });

    const r = await puxadorMenstruacao.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 0, erro: 'vault_root_indisponivel' });
    expect(mockReadRecords).not.toHaveBeenCalled();
    expect(mockEscreverRegistroCiclo).not.toHaveBeenCalled();
  });

  it('cenario 8: flow fora do dominio e record no futuro sao filtrados', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({
      records: [
        // flow 0 (unspecified) -> fora do dominio, descartado.
        { time: '2026-05-19T13:00:00.000Z', flow: 0, metadata: { id: 'a' } },
        // time no futuro -> descartado.
        { time: '2026-06-01T13:00:00.000Z', flow: 2, metadata: { id: 'b' } },
        // valido.
        { time: '2026-05-20T13:00:00.000Z', flow: 2, metadata: { id: 'c' } },
      ],
    });

    const r = await puxadorMenstruacao.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    expect(mockEscreverRegistroCiclo).toHaveBeenCalledTimes(1);
    expect(mockEscreverRegistroCiclo.mock.calls[0][1].data).toBe('2026-05-20');

    jest.useRealTimers();
  });

  // R-INT-3-HC-AUTOPULL-WRITEBACK-GUARD: autopull pula write-back HC.
  it('cenario 10: chama escreverRegistroCiclo com pularSyncHC=true (guard anti-loop)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({
      records: [
        { time: '2026-05-21T13:00:00.000Z', flow: 2, metadata: { id: 'a' } },
      ],
    });

    await puxadorMenstruacao.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(mockEscreverRegistroCiclo).toHaveBeenCalledTimes(1);
    const [, , body, opts] = mockEscreverRegistroCiclo.mock.calls[0];
    expect(body).toBe('');
    expect(opts).toEqual({ pularSyncHC: true });

    jest.useRealTimers();
  });

  it('cenario 9: multiplos records na mesma data -> mantem maior flow', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({
      records: [
        { time: '2026-05-21T08:00:00.000Z', flow: 1, metadata: { id: 'a' } },
        { time: '2026-05-21T20:00:00.000Z', flow: 3, metadata: { id: 'b' } },
        { time: '2026-05-21T14:00:00.000Z', flow: 2, metadata: { id: 'c' } },
      ],
    });

    const r = await puxadorMenstruacao.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const meta = mockEscreverRegistroCiclo.mock.calls[0][1];
    expect(meta.data).toBe('2026-05-21');
    // flow maximo do dia = 3 (heavy) -> intensidade 4.
    expect(meta.intensidade).toBe(4);

    jest.useRealTimers();
  });
});
