// Testes de lerPassosHojeHC (R-INT-3-HC-NOTIF-META-PASSOS).
//
// Cobre:
//   1. Soma o count de varios records de hoje.
//   2. records vazio -> 0 (HC sem dados hoje, mas com acesso).
//   3. readRecords lanca -> null (sem modulo / sem permissao / erro).
//   4. Ignora count negativo / nao-numerico.
//   5. Passa timeRangeFilter 'between' com inicio < fim.
//
// Mocka a bridge nativa (mesmo import do helper e do puxador).
//
// Comentarios sem acento.
const mockReadRecords = jest.fn();

jest.mock('../../../modules/health-connect/src', () => ({
  __esModule: true,
  readRecords: (...args: unknown[]) => mockReadRecords(...args),
}));

import { lerPassosHojeHC } from '@/lib/health/passosHoje';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('lerPassosHojeHC', () => {
  it('soma o count de varios records de hoje', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        { count: 1200, startTime: 'x', endTime: 'y' },
        { count: 800, startTime: 'x', endTime: 'y' },
        { count: 3000, startTime: 'x', endTime: 'y' },
      ],
    });
    const total = await lerPassosHojeHC();
    expect(total).toBe(5000);
  });

  it('records vazio -> 0 (acesso ok, sem passos hoje)', async () => {
    mockReadRecords.mockResolvedValueOnce({ records: [] });
    const total = await lerPassosHojeHC();
    expect(total).toBe(0);
  });

  it('readRecords lanca -> null (sem modulo / erro)', async () => {
    mockReadRecords.mockRejectedValueOnce(new Error('sem modulo nativo'));
    const total = await lerPassosHojeHC();
    expect(total).toBeNull();
  });

  it('ignora count negativo ou nao-numerico', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        { count: 1000 },
        { count: -50 },
        { count: 'oops' as unknown as number },
        { count: 500 },
      ],
    });
    const total = await lerPassosHojeHC();
    expect(total).toBe(1500);
  });

  it('chama readRecords com timeRangeFilter between (inicio < fim)', async () => {
    mockReadRecords.mockResolvedValueOnce({ records: [] });
    await lerPassosHojeHC();
    expect(mockReadRecords).toHaveBeenCalledTimes(1);
    const [tipo, opts] = mockReadRecords.mock.calls[0] as [
      string,
      {
        timeRangeFilter: {
          operator: string;
          startTime: string;
          endTime: string;
        };
      },
    ];
    expect(tipo).toBe('Steps');
    expect(opts.timeRangeFilter.operator).toBe('between');
    const inicio = new Date(opts.timeRangeFilter.startTime).getTime();
    const fim = new Date(opts.timeRangeFilter.endTime).getTime();
    expect(inicio).toBeLessThan(fim);
  });

  it('res null/undefined -> 0 (defesa contra shape inesperado)', async () => {
    mockReadRecords.mockResolvedValueOnce(undefined);
    const total = await lerPassosHojeHC();
    expect(total).toBe(0);
  });
});
