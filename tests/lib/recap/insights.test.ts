// R-INT-3-HC-INSIGHT-SEMANAL: testes do calcularInsightSaude. Mocka o
// reader listarPassos e valida o comportamento POSITIVE ONLY: insight
// quando a semana atual supera a anterior acima do limiar; null quando
// o delta e' <= 0, abaixo do limiar, ou as janelas tem base ruim.
//
// Janela para ATE = 2026-05-22 (UTC-3):
//   atual    = [2026-05-16, 2026-05-22]
//   anterior = [2026-05-09, 2026-05-15]
//
// Comentarios sem acento.
const mockListarPassos = jest.fn();

jest.mock('@/lib/vault/passos', () => ({
  __esModule: true,
  listarPassos: (...args: unknown[]) => mockListarPassos(...args),
}));

import { calcularInsightSaude } from '@/lib/recap/insights';

const VAULT_ROOT = 'content://test/vault';
const ATE = new Date('2026-05-22T12:00:00-03:00');

beforeEach(() => {
  jest.clearAllMocks();
  mockListarPassos.mockResolvedValue([]);
});

function passo(data: string, total: number) {
  return {
    tipo: 'passos' as const,
    data,
    autor: 'pessoa_a' as const,
    total,
    fonte_hc: true as const,
    sincronizado_em: '2026-05-22T20:30:00-03:00',
  };
}

// Tres dias na semana atual e tres na anterior (>= MIN_DIAS em cada).
function janelasComDelta(somaAtual: number, somaAnterior: number) {
  return [
    // atual: 3 dias somando somaAtual
    passo('2026-05-20', somaAtual - 2),
    passo('2026-05-21', 1),
    passo('2026-05-22', 1),
    // anterior: 3 dias somando somaAnterior
    passo('2026-05-13', somaAnterior - 2),
    passo('2026-05-14', 1),
    passo('2026-05-15', 1),
  ];
}

describe('calcularInsightSaude - POSITIVE ONLY', () => {
  it('delta positivo acima do limiar gera insight com texto e deltaPct', async () => {
    // atual 11800, anterior 10000 => +18%.
    mockListarPassos.mockResolvedValueOnce(janelasComDelta(11800, 10000));
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out).toEqual({
      tipo: 'passos',
      deltaPct: 18,
      texto: 'Você caminhou 18% mais que a semana passada.',
    });
  });

  it('delta zero (semanas iguais) retorna null', async () => {
    mockListarPassos.mockResolvedValueOnce(janelasComDelta(10000, 10000));
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out).toBeNull();
  });

  it('delta negativo (caminhou menos) retorna null - nunca insight negativo', async () => {
    mockListarPassos.mockResolvedValueOnce(janelasComDelta(8000, 10000));
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out).toBeNull();
  });

  it('delta positivo abaixo do limiar (5%) retorna null', async () => {
    // atual 10300, anterior 10000 => +3% (< 5%).
    mockListarPassos.mockResolvedValueOnce(janelasComDelta(10300, 10000));
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out).toBeNull();
  });

  it('delta exatamente no limiar (5%) gera insight', async () => {
    // atual 10500, anterior 10000 => +5%.
    mockListarPassos.mockResolvedValueOnce(janelasComDelta(10500, 10000));
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out?.deltaPct).toBe(5);
  });
});

describe('calcularInsightSaude - base ruim', () => {
  it('nenhum passo registrado retorna null', async () => {
    mockListarPassos.mockResolvedValueOnce([]);
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out).toBeNull();
  });

  it('semana atual com menos de 3 dias retorna null mesmo com aumento', async () => {
    mockListarPassos.mockResolvedValueOnce([
      // atual: so 2 dias
      passo('2026-05-21', 9000),
      passo('2026-05-22', 9000),
      // anterior: 3 dias
      passo('2026-05-13', 4000),
      passo('2026-05-14', 4000),
      passo('2026-05-15', 4000),
    ]);
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out).toBeNull();
  });

  it('semana anterior com menos de 3 dias retorna null mesmo com aumento', async () => {
    mockListarPassos.mockResolvedValueOnce([
      // atual: 3 dias
      passo('2026-05-20', 9000),
      passo('2026-05-21', 9000),
      passo('2026-05-22', 9000),
      // anterior: so 2 dias
      passo('2026-05-14', 4000),
      passo('2026-05-15', 4000),
    ]);
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out).toBeNull();
  });

  it('soma anterior zero (3 dias com total 0) retorna null sem dividir por zero', async () => {
    mockListarPassos.mockResolvedValueOnce([
      passo('2026-05-20', 5000),
      passo('2026-05-21', 5000),
      passo('2026-05-22', 5000),
      passo('2026-05-13', 0),
      passo('2026-05-14', 0),
      passo('2026-05-15', 0),
    ]);
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    expect(out).toBeNull();
  });
});

describe('calcularInsightSaude - janela', () => {
  it('ignora dias fora das duas janelas (7d vs 7d a partir de ate)', async () => {
    mockListarPassos.mockResolvedValueOnce([
      // atual: 3 dias, soma 30000
      passo('2026-05-20', 10000),
      passo('2026-05-21', 10000),
      passo('2026-05-22', 10000),
      // anterior: 3 dias, soma 10000
      passo('2026-05-13', 4000),
      passo('2026-05-14', 3000),
      passo('2026-05-15', 3000),
      // fora de ambas as janelas (anterior a 2026-05-09): ignorado
      passo('2026-05-01', 99999),
      // dia 2026-05-08 tambem fora (janela anterior comeca em 09)
      passo('2026-05-08', 99999),
    ]);
    const out = await calcularInsightSaude(VAULT_ROOT, ATE);
    // +200% (30000 vs 10000); os dias fora nao entram.
    expect(out).toEqual({
      tipo: 'passos',
      deltaPct: 200,
      texto: 'Você caminhou 200% mais que a semana passada.',
    });
  });
});
