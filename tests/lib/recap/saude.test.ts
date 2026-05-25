// R-INT-3-HC-RECAP-CARD: testes do agregador calcularSaudeRecap.
// Mocka os readers de Vault (listarPassos/listarTreinos/listarSono/
// listarMedidas) e valida a consolidacao em SaudeRecap nos cenarios
// com dados / sem dados / parcial, alem do filtro de janela.
//
// Comentarios sem acento.
const mockListarPassos = jest.fn();
const mockListarTreinos = jest.fn();
const mockListarSono = jest.fn();
const mockListarMedidas = jest.fn();

jest.mock('@/lib/vault/passos', () => ({
  __esModule: true,
  listarPassos: (...args: unknown[]) => mockListarPassos(...args),
}));
jest.mock('@/lib/vault/treinos', () => ({
  __esModule: true,
  listarTreinos: (...args: unknown[]) => mockListarTreinos(...args),
}));
jest.mock('@/lib/vault/sono', () => ({
  __esModule: true,
  listarSono: (...args: unknown[]) => mockListarSono(...args),
}));
jest.mock('@/lib/vault/medidas', () => ({
  __esModule: true,
  listarMedidas: (...args: unknown[]) => mockListarMedidas(...args),
}));

import { calcularSaudeRecap } from '@/lib/recap/saude';

const VAULT_ROOT = 'content://test/vault';
// Janela 'semana' a partir de 2026-05-22 (UTC-3) cobre 2026-05-16..22.
const ATE = new Date('2026-05-22T12:00:00-03:00');

beforeEach(() => {
  jest.clearAllMocks();
  mockListarPassos.mockResolvedValue([]);
  mockListarTreinos.mockResolvedValue([]);
  mockListarSono.mockResolvedValue([]);
  mockListarMedidas.mockResolvedValue([]);
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

function treino(data: string, duracao_min: number) {
  return {
    tipo: 'treino_sessao' as const,
    data,
    autor: 'pessoa_a' as const,
    duracao_min,
    exercicios: [{ nome: 'agachamento', series: 3, reps: 10 }],
  };
}

function sono(data: string, duracao_min: number, id: string) {
  return {
    tipo: 'sono' as const,
    data,
    autor: 'pessoa_a' as const,
    inicio: '2026-05-21T23:00:00-03:00',
    fim: '2026-05-22T07:00:00-03:00',
    duracao_min,
    fonte_hc_id: id,
  };
}

function medida(data: string, peso?: number, gordura?: number) {
  return {
    tipo: 'medidas' as const,
    data,
    autor: 'pessoa_a' as const,
    ...(peso !== undefined ? { peso } : {}),
    ...(gordura !== undefined ? { gordura } : {}),
    fotos: [],
  };
}

describe('calcularSaudeRecap - sem dados', () => {
  it('retorna todos os campos null quando nenhum reader devolve dado', async () => {
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    expect(out).toEqual({
      passos: null,
      treinos: null,
      sono: null,
      medidaUltima: null,
    });
  });

  it('ignora dados fora da janela do periodo', async () => {
    // 2026-05-01 esta fora da janela semana (16..22).
    mockListarPassos.mockResolvedValueOnce([passo('2026-05-01', 9999)]);
    mockListarTreinos.mockResolvedValueOnce([
      treino('2026-05-01T18:00:00-03:00', 60),
    ]);
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    expect(out.passos).toBeNull();
    expect(out.treinos).toBeNull();
  });
});

describe('calcularSaudeRecap - com dados', () => {
  it('agrega passos: total e media por dia com registro', async () => {
    mockListarPassos.mockResolvedValueOnce([
      passo('2026-05-20', 8000),
      passo('2026-05-21', 9000),
      passo('2026-05-22', 10000),
    ]);
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    expect(out.passos).toEqual({ total: 27000, mediaDia: 9000 });
  });

  it('agrega treinos: contagem e soma de duracao', async () => {
    mockListarTreinos.mockResolvedValueOnce([
      treino('2026-05-20T18:00:00-03:00', 60),
      treino('2026-05-22T07:00:00-03:00', 90),
    ]);
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    expect(out.treinos).toEqual({ total: 2, duracaoMin: 150 });
  });

  it('agrega sono: media de horas e numero de noites', async () => {
    mockListarSono.mockResolvedValueOnce([
      sono('2026-05-21', 480, 'a'), // 8h
      sono('2026-05-22', 420, 'b'), // 7h
    ]);
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    // (480+420)/2 = 450 min = 7,5h
    expect(out.sono).toEqual({ mediaHoras: 7.5, noites: 2 });
  });

  it('medida ultima com delta de peso vs registro anterior', async () => {
    // listarMedidas devolve desc; a mais recente e a primeira.
    mockListarMedidas.mockResolvedValueOnce([
      medida('2026-05-22', 72.5, 18.2),
      medida('2026-05-15', 72.9),
    ]);
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    expect(out.medidaUltima).toEqual({
      peso: 72.5,
      deltaPeso: -0.4,
      gordura: 18.2,
    });
  });

  it('medida sem registro anterior nao calcula delta', async () => {
    mockListarMedidas.mockResolvedValueOnce([medida('2026-05-22', 72.5)]);
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    expect(out.medidaUltima).toEqual({ peso: 72.5 });
  });
});

describe('calcularSaudeRecap - parcial', () => {
  it('so passos presente; demais null', async () => {
    mockListarPassos.mockResolvedValueOnce([passo('2026-05-22', 5000)]);
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    expect(out.passos).toEqual({ total: 5000, mediaDia: 5000 });
    expect(out.treinos).toBeNull();
    expect(out.sono).toBeNull();
    expect(out.medidaUltima).toBeNull();
  });

  it('medida no periodo sem peso nem gordura vira null (linha vazia evitada)', async () => {
    mockListarMedidas.mockResolvedValueOnce([medida('2026-05-22')]);
    const out = await calcularSaudeRecap(VAULT_ROOT, 'semana', ATE);
    expect(out.medidaUltima).toBeNull();
  });
});
