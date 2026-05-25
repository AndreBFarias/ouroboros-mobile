// Testes do puxadorMedidas (HC Weight+BodyFat -> Vault). Cobre:
//   1. readRecords vazio (ambos) -> {novos: 0, erro: null}, zero writes.
//   2. Peso solo (sem gordura) -> 1 write so com peso.
//   3. Peso + gordura no mesmo dia -> 1 write com peso e gordura.
//   4. Dias diferentes -> writes em ordem ascendente.
//   5. Dia em curso pulado (time hoje BRT).
//   6. First sync (since=null) -> janela default 7d nas duas leituras.
//   7. Idempotencia: 2 chamadas escrevem 2x os mesmos valores.
//   8. readRecords lanca -> {novos: 0, erro: msg}.
//   9. Pessoa = pessoa_b -> autor pessoa_b.
//  10. Vault root null -> {novos: 0, erro: vault_root_indisponivel}.
//  11. Multiplas pesagens no mesmo dia -> fica a ultima (maior time).
//  12. Peso invalido (<=0) e gordura fora de 0..100 sao filtrados.
//
// Mocka a bridge nativa e o writer vault/medidas. Usa store real para
// useSettings e useVault (fiel ao runtime, mesma estrategia de passos).
//
// Comentarios sem acento.
const mockReadRecords = jest.fn();
const mockEscreverMedida = jest.fn();

jest.mock('../../../../modules/health-connect/src', () => ({
  __esModule: true,
  readRecords: (...args: unknown[]) => mockReadRecords(...args),
}));

jest.mock('@/lib/vault/medidas', () => ({
  __esModule: true,
  escreverMedida: (...args: unknown[]) => mockEscreverMedida(...args),
}));

import { puxadorMedidas } from '@/lib/health/puxadores/medidas';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

// Helper: roteia readRecords por recordType. Weight e BodyFat sao
// chamados em paralelo dentro do puxar(); cada mock entry retorna pelo
// tipo solicitado.
function mockPorTipo(weight: unknown[], bodyFat: unknown[]) {
  mockReadRecords.mockImplementation((tipo: string) => {
    if (tipo === 'Weight') return Promise.resolve({ records: weight });
    if (tipo === 'BodyFat') return Promise.resolve({ records: bodyFat });
    return Promise.resolve({ records: [] });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEscreverMedida.mockResolvedValue({
    uri: 'content://test/vault/markdown/medidas-x.md',
    rel: 'markdown/medidas-x.md',
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

describe('puxadorMedidas', () => {
  it('tipo Weight', () => {
    expect(puxadorMedidas.tipo).toBe('Weight');
  });

  it('cenario 1: leituras vazias -> novos=0, erro=null, zero writes', async () => {
    mockPorTipo([], []);
    const r = await puxadorMedidas.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 0, erro: null });
    expect(mockEscreverMedida).not.toHaveBeenCalled();
  });

  it('cenario 2: peso solo (sem gordura) -> 1 write so com peso', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo(
      [
        {
          time: '2026-05-21T13:00:00.000Z',
          weight: { inKilograms: 72.5 },
          metadata: { id: 'w1' },
        },
      ],
      []
    );
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 1, erro: null });
    expect(mockEscreverMedida).toHaveBeenCalledTimes(1);
    const meta = mockEscreverMedida.mock.calls[0][1];
    expect(meta).toMatchObject({
      tipo: 'medidas',
      data: '2026-05-21',
      autor: 'pessoa_a',
      peso: 72.5,
    });
    expect(meta.gordura).toBeUndefined();
    jest.useRealTimers();
  });

  it('cenario 3: peso + gordura no mesmo dia -> 1 write com ambos', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo(
      [
        {
          time: '2026-05-21T13:00:00.000Z',
          weight: { inKilograms: 72.5 },
          metadata: { id: 'w1' },
        },
      ],
      [
        {
          time: '2026-05-21T13:00:30.000Z',
          percentage: 18.3,
          metadata: { id: 'b1' },
        },
      ]
    );
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 1, erro: null });
    expect(mockEscreverMedida).toHaveBeenCalledTimes(1);
    const meta = mockEscreverMedida.mock.calls[0][1];
    expect(meta).toMatchObject({
      tipo: 'medidas',
      data: '2026-05-21',
      autor: 'pessoa_a',
      peso: 72.5,
      gordura: 18.3,
    });
    jest.useRealTimers();
  });

  it('cenario 4: dias diferentes -> writes em ordem ascendente', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo(
      [
        {
          time: '2026-05-21T13:00:00.000Z',
          weight: { inKilograms: 72.5 },
          metadata: { id: 'w2' },
        },
        {
          time: '2026-05-19T13:00:00.000Z',
          weight: { inKilograms: 73.1 },
          metadata: { id: 'w1' },
        },
      ],
      []
    );
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r.novos).toBe(2);
    const datas = mockEscreverMedida.mock.calls.map((c) => c[1].data);
    expect(datas).toEqual(['2026-05-19', '2026-05-21']);
    jest.useRealTimers();
  });

  it('cenario 5: dia em curso pulado (time hoje BRT)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo(
      [
        // D-1 (deve escrever).
        {
          time: '2026-05-21T18:00:00.000Z',
          weight: { inKilograms: 72.0 },
          metadata: { id: 'w1' },
        },
        // Hoje (deve pular — time apos 00:00 BRT de 2026-05-22 = 03:00Z).
        {
          time: '2026-05-22T14:00:00.000Z',
          weight: { inKilograms: 71.5 },
          metadata: { id: 'w2' },
        },
      ],
      []
    );
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 1, erro: null });
    expect(mockEscreverMedida).toHaveBeenCalledTimes(1);
    expect(mockEscreverMedida.mock.calls[0][1].data).toBe('2026-05-21');
    jest.useRealTimers();
  });

  it('cenario 6: first sync (since=null) usa janela default 7d nas 2 leituras', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo([], []);
    await puxadorMedidas.puxar({ since: null, pageSize: 1000 });
    expect(mockReadRecords).toHaveBeenCalledTimes(2);
    const tipos = mockReadRecords.mock.calls.map((c) => c[0]).sort();
    expect(tipos).toEqual(['BodyFat', 'Weight']);
    for (const [, opts] of mockReadRecords.mock.calls) {
      const startDate = new Date(opts.timeRangeFilter.startTime).getTime();
      const esperado = new Date('2026-05-15T15:00:00.000Z').getTime();
      expect(Math.abs(startDate - esperado)).toBeLessThan(2000);
      expect(opts.timeRangeFilter.endTime).toBe('2026-05-22T15:00:00.000Z');
      expect(opts.pageSize).toBe(1000);
      expect(opts.ascendingOrder).toBe(true);
    }
    jest.useRealTimers();
  });

  it('cenario 7: idempotencia — 2 chamadas escrevem 2x mesmos valores', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo(
      [
        {
          time: '2026-05-21T13:00:00.000Z',
          weight: { inKilograms: 72.5 },
          metadata: { id: 'w1' },
        },
      ],
      [
        {
          time: '2026-05-21T13:00:00.000Z',
          percentage: 18.3,
          metadata: { id: 'b1' },
        },
      ]
    );
    const r1 = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    const r2 = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r1.novos).toBe(1);
    expect(r2.novos).toBe(1);
    expect(mockEscreverMedida).toHaveBeenCalledTimes(2);
    const metas = mockEscreverMedida.mock.calls.map((c) => c[1]);
    expect(metas[0]).toMatchObject({ data: '2026-05-21', peso: 72.5, gordura: 18.3 });
    expect(metas[1]).toMatchObject({ data: '2026-05-21', peso: 72.5, gordura: 18.3 });
    jest.useRealTimers();
  });

  it('cenario 8: readRecords lanca -> {novos: 0, erro: msg}', async () => {
    mockReadRecords.mockRejectedValue(new Error('permission_denied'));
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 0, erro: 'permission_denied' });
    expect(mockEscreverMedida).not.toHaveBeenCalled();
  });

  it('cenario 9: pessoa = pessoa_b -> autor pessoa_b', async () => {
    useSettings.setState({
      pessoa: {
        ativa: 'pessoa_b',
        vaultCompartilhado: true,
        tipoCompanhia: 'sozinho',
      },
    });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo(
      [
        {
          time: '2026-05-21T13:00:00.000Z',
          weight: { inKilograms: 72.5 },
          metadata: { id: 'w1' },
        },
      ],
      []
    );
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r.novos).toBe(1);
    expect(mockEscreverMedida.mock.calls[0][1].autor).toBe('pessoa_b');
    jest.useRealTimers();
  });

  it('cenario 10: vault root null -> {novos: 0, erro: vault_root_indisponivel}', async () => {
    useVault.setState({ vaultRoot: null });
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 0, erro: 'vault_root_indisponivel' });
    expect(mockReadRecords).not.toHaveBeenCalled();
    expect(mockEscreverMedida).not.toHaveBeenCalled();
  });

  it('cenario 11: multiplas pesagens no mesmo dia -> fica a ultima (maior time)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo(
      [
        {
          time: '2026-05-21T08:00:00.000Z',
          weight: { inKilograms: 73.0 },
          metadata: { id: 'w1' },
        },
        {
          time: '2026-05-21T20:00:00.000Z',
          weight: { inKilograms: 72.2 },
          metadata: { id: 'w2' },
        },
      ],
      []
    );
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r.novos).toBe(1);
    expect(mockEscreverMedida.mock.calls[0][1].peso).toBe(72.2);
    jest.useRealTimers();
  });

  it('cenario 12: peso <=0 e gordura fora de 0..100 sao filtrados', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockPorTipo(
      [
        {
          time: '2026-05-21T08:00:00.000Z',
          weight: { inKilograms: 0 },
          metadata: { id: 'w1' },
        },
        {
          time: '2026-05-21T09:00:00.000Z',
          weight: { inKilograms: 72.5 },
          metadata: { id: 'w2' },
        },
      ],
      [
        {
          time: '2026-05-21T09:00:00.000Z',
          percentage: 150,
          metadata: { id: 'b1' },
        },
      ]
    );
    const r = await puxadorMedidas.puxar({
      since: '2026-05-19T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r.novos).toBe(1);
    const meta = mockEscreverMedida.mock.calls[0][1];
    expect(meta.peso).toBe(72.5);
    expect(meta.gordura).toBeUndefined();
    jest.useRealTimers();
  });
});
