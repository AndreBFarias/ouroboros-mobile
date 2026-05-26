// Testes do puxadorPassos (HC -> Vault). Cobre os cenarios do
// briefing:
//   1. readRecords vazio -> {novos: 0, erro: null}, zero writes.
//   2. 3 dias completos -> 3 writes, ordem correta.
//   3. Dia em curso pulado.
//   4. First sync (since=null) -> usa janela default 7d.
//   5. Idempotencia: chamar 2x escreve 2x mesmo total.
//   6. readRecords lanca -> {novos: 0, erro: 'X'}.
//   7. Pessoa = 'pessoa_b' no settings -> escrito com pessoa_b.
//   8. Vault root null -> erro vault_root_indisponivel.
//   9. Record com count negativo e filtrado.
//   10. Timezone UTC: barreira e YMD computados em UTC via Intl.
//   11. Timezone America/Los_Angeles: DST (PDT) resolvido por Intl.
//
// Mocka a bridge nativa (`modules/health-connect/src`) e o writer
// vault/passos. Usa store real para useSettings e useVault (mais
// fiel ao runtime, mesma estrategia do scheduler.test.ts).
//
// Comentarios sem acento.
const mockReadRecords = jest.fn();
const mockEscreverPassos = jest.fn();

jest.mock('../../../../modules/health-connect/src', () => ({
  __esModule: true,
  readRecords: (...args: unknown[]) => mockReadRecords(...args),
}));

jest.mock('@/lib/vault/passos', () => ({
  __esModule: true,
  escreverPassos: (...args: unknown[]) => mockEscreverPassos(...args),
}));

import { puxadorPassos, __test__only__ } from '@/lib/health/puxadores/passos';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

beforeEach(() => {
  jest.clearAllMocks();
  mockEscreverPassos.mockResolvedValue({
    uri: 'content://test/vault/markdown/passos-x.md',
    rel: 'markdown/passos-x.md',
  });
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

describe('puxadorPassos', () => {
  it('tipo Steps', () => {
    expect(puxadorPassos.tipo).toBe('Steps');
  });

  it('cenario 1: readRecords vazio -> novos=0, erro=null, zero writes', async () => {
    mockReadRecords.mockResolvedValueOnce({ records: [] });
    const r = await puxadorPassos.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 0, erro: null });
    expect(mockEscreverPassos).not.toHaveBeenCalled();
  });

  it('cenario 2: 3 dias completos -> 3 writes em ordem ascendente', async () => {
    // Dia D-3, D-2, D-1 (todos antes de hoje em BRT). Records
    // distribuidos com endTime em horas variadas dentro do dia.
    // Para testar o agregado por dia, uso 2 records por dia.
    mockReadRecords.mockResolvedValueOnce({
      records: [
        // D-3 = 2026-05-19 (10:00 BRT = 13:00 UTC)
        { endTime: '2026-05-19T13:00:00.000Z', count: 3000, metadata: { id: 'a' } },
        { endTime: '2026-05-19T22:00:00.000Z', count: 2000, metadata: { id: 'b' } },
        // D-2 = 2026-05-20
        { endTime: '2026-05-20T15:00:00.000Z', count: 4500, metadata: { id: 'c' } },
        // D-1 = 2026-05-21
        { endTime: '2026-05-21T18:00:00.000Z', count: 8000, metadata: { id: 'd' } },
      ],
    });
    // Mocka clock: hoje = 2026-05-22 12:00 BRT (15:00 UTC).
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    const r = await puxadorPassos.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.erro).toBeNull();
    expect(r.novos).toBe(3);
    expect(mockEscreverPassos).toHaveBeenCalledTimes(3);
    // Verifica ordem ascendente das datas escritas.
    const dadosEscritos = mockEscreverPassos.mock.calls.map((c) => c[1]);
    expect(dadosEscritos).toEqual(['2026-05-19', '2026-05-20', '2026-05-21']);
    // Verifica totais agregados.
    const totaisEscritos = mockEscreverPassos.mock.calls.map((c) => c[2]);
    expect(totaisEscritos).toEqual([5000, 4500, 8000]);

    jest.useRealTimers();
  });

  it('cenario 3: dia em curso pulado (endTime hoje BRT)', async () => {
    // Mocka clock: hoje = 2026-05-22 12:00 BRT.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({
      records: [
        // D-1 = 2026-05-21 (deve ser escrito).
        { endTime: '2026-05-21T18:00:00.000Z', count: 5000, metadata: { id: 'a' } },
        // Hoje = 2026-05-22 (deve ser PULADO — endTime apos 00:00 BRT
        // de hoje, que e 2026-05-22T03:00:00Z).
        { endTime: '2026-05-22T14:00:00.000Z', count: 3000, metadata: { id: 'b' } },
      ],
    });

    const r = await puxadorPassos.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 1, erro: null });
    expect(mockEscreverPassos).toHaveBeenCalledTimes(1);
    const [, dataEscrita, total] = mockEscreverPassos.mock.calls[0];
    expect(dataEscrita).toBe('2026-05-21');
    expect(total).toBe(5000);

    jest.useRealTimers();
  });

  it('cenario 4: first sync (since=null) usa janela default 7d', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({ records: [] });

    await puxadorPassos.puxar({ since: null, pageSize: 1000 });

    expect(mockReadRecords).toHaveBeenCalledTimes(1);
    const [tipo, opts] = mockReadRecords.mock.calls[0];
    expect(tipo).toBe('Steps');
    // startTime ~ 7d atras = 2026-05-15T15:00:00Z.
    const startDate = new Date(opts.timeRangeFilter.startTime);
    const expectado = new Date('2026-05-15T15:00:00.000Z').getTime();
    expect(Math.abs(startDate.getTime() - expectado)).toBeLessThan(2000);
    // endTime = agora.
    expect(opts.timeRangeFilter.endTime).toBe('2026-05-22T15:00:00.000Z');
    expect(opts.pageSize).toBe(1000);
    expect(opts.ascendingOrder).toBe(true);

    jest.useRealTimers();
  });

  it('cenario 5: idempotencia — 2 chamadas escrevem 2x mesmo total', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValue({
      records: [
        { endTime: '2026-05-21T18:00:00.000Z', count: 8472, metadata: { id: 'd' } },
      ],
    });

    const r1 = await puxadorPassos.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    const r2 = await puxadorPassos.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r1.novos).toBe(1);
    expect(r2.novos).toBe(1);
    expect(mockEscreverPassos).toHaveBeenCalledTimes(2);
    // Mesmo total escrito nas duas execucoes (writer e' regrava-on-call;
    // dia esta encerrado, agregado e' estavel).
    const totais = mockEscreverPassos.mock.calls.map((c) => c[2]);
    expect(totais).toEqual([8472, 8472]);
    const datas = mockEscreverPassos.mock.calls.map((c) => c[1]);
    expect(datas).toEqual(['2026-05-21', '2026-05-21']);

    jest.useRealTimers();
  });

  it('cenario 6: readRecords lanca -> retorna {novos: 0, erro: msg}', async () => {
    mockReadRecords.mockRejectedValueOnce(new Error('permission_denied'));

    const r = await puxadorPassos.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 0, erro: 'permission_denied' });
    expect(mockEscreverPassos).not.toHaveBeenCalled();
  });

  it('cenario 7: pessoa = pessoa_b no settings -> autor escrito com pessoa_b', async () => {
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
        { endTime: '2026-05-21T18:00:00.000Z', count: 5000, metadata: { id: 'a' } },
      ],
    });

    const r = await puxadorPassos.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const [, , , autor] = mockEscreverPassos.mock.calls[0];
    expect(autor).toBe('pessoa_b');

    jest.useRealTimers();
  });

  it('cenario 8 (extra): vault root null -> retorna {novos: 0, erro: vault_root_indisponivel}', async () => {
    useVault.setState({ vaultRoot: null });

    const r = await puxadorPassos.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 0, erro: 'vault_root_indisponivel' });
    expect(mockReadRecords).not.toHaveBeenCalled();
    expect(mockEscreverPassos).not.toHaveBeenCalled();
  });

  it('cenario 9 (extra): record com count negativo e filtrado', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));

    mockReadRecords.mockResolvedValueOnce({
      records: [
        { endTime: '2026-05-21T10:00:00.000Z', count: 1000, metadata: { id: 'a' } },
        { endTime: '2026-05-21T15:00:00.000Z', count: -50, metadata: { id: 'b' } },
        { endTime: '2026-05-21T20:00:00.000Z', count: 2000, metadata: { id: 'c' } },
      ],
    });

    const r = await puxadorPassos.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const total = mockEscreverPassos.mock.calls[0][2];
    expect(total).toBe(3000); // -50 ignorado

    jest.useRealTimers();
  });

  // Cenarios timezone: validam os helpers internos Intl-based via
  // __test__only__. O contrato publico puxar({since, pageSize}) nao
  // expoe tz, entao os helpers sao exercidos diretamente. Default
  // (tz omitido) usa America/Sao_Paulo, preservando o BRT anterior.
  it('cenario 10: timezone UTC computa barreira e YMD em UTC', () => {
    const { dataLocalYmd, isoToDataLocalYmd, startOfTodayLocal } =
      __test__only__;

    // Instante 2026-05-22T02:30Z: 22/05 em UTC, mas ainda 21/05
    // 23:30 em BRT. Os dois fusos divergem de dia aqui.
    const clock = new Date('2026-05-22T02:30:00.000Z');

    // Default BRT vê 21/05; UTC vê 22/05.
    expect(dataLocalYmd(clock)).toBe('2026-05-21');
    expect(dataLocalYmd(clock, 'UTC')).toBe('2026-05-22');

    // Barreira do dia em curso difere por tz.
    expect(startOfTodayLocal(clock, 'UTC').toISOString()).toBe(
      '2026-05-22T00:00:00.000Z'
    );
    expect(startOfTodayLocal(clock).toISOString()).toBe(
      '2026-05-21T03:00:00.000Z'
    );

    // Record com endTime 2026-05-22T00:30Z (22/05 em UTC, 21/05 em
    // BRT). Sob tz=UTC esta APOS a barreira 00:00Z -> seria filtrado
    // como dia em curso. Sob BRT cai em 21/05 -> seria escrito.
    const endRec = new Date('2026-05-22T00:30:00.000Z');
    const barreiraUtc = startOfTodayLocal(clock, 'UTC');
    expect(endRec.getTime() >= barreiraUtc.getTime()).toBe(true);
    expect(isoToDataLocalYmd('2026-05-22T00:30:00.000Z')).toBe('2026-05-21');
  });

  it('cenario 11: timezone America/Los_Angeles resolve DST via Intl', () => {
    const { dataLocalYmd, startOfTodayLocal } = __test__only__;

    // 2026-05-22T15:00Z = 08:00 PDT (LA) / 12:00 BRT.
    const clock = new Date('2026-05-22T15:00:00.000Z');

    // YMD em LA = 22/05 (correto; PDT resolvido automaticamente).
    expect(dataLocalYmd(clock, 'America/Los_Angeles')).toBe('2026-05-22');

    // Meia-noite local LA = 00:00 PDT = 07:00 UTC.
    expect(
      startOfTodayLocal(clock, 'America/Los_Angeles').toISOString()
    ).toBe('2026-05-22T07:00:00.000Z');

    // Record com endTime 2026-05-22T06:00Z (antes da barreira PDT
    // 07:00Z) cai no dia anterior em LA: 21/05.
    expect(
      dataLocalYmd(new Date('2026-05-22T06:00:00.000Z'), 'America/Los_Angeles')
    ).toBe('2026-05-21');
  });
});
