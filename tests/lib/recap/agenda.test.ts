// R-INT-2-CALENDAR-RECAP-CARD: testes do agregador calcularAgendaRecap.
// Mocka o reader de Vault (listarEventosAgenda) e valida a consolidacao
// em AgendaRecap nos cenarios com dados / sem dados / parcial, o filtro
// de janela e a deteccao do proximo evento.
//
// Comentarios sem acento.
const mockListarEventosAgenda = jest.fn();

jest.mock('@/lib/vault/agenda', () => ({
  __esModule: true,
  listarEventosAgenda: (...args: unknown[]) =>
    mockListarEventosAgenda(...args),
}));

import { calcularAgendaRecap } from '@/lib/recap/agenda';

const VAULT_ROOT = 'content://test/vault';
// Janela 'semana' a partir de 2026-05-22 (UTC-3) cobre 2026-05-16..22.
const ATE = new Date('2026-05-22T12:00:00-03:00');

beforeEach(() => {
  jest.clearAllMocks();
  // Default: nenhuma das duas pessoas tem evento.
  mockListarEventosAgenda.mockResolvedValue([]);
});

function evento(id: string, inicioIso: string, titulo: string) {
  return {
    id,
    pessoa: 'pessoa_a' as const,
    titulo,
    inicio: inicioIso,
    fim: inicioIso,
    fonte: 'google_calendar' as const,
    sincronizado_em: '2026-05-22T20:30:00-03:00',
  };
}

// Faz o mock devolver eventos por pessoa: primeira chamada (pessoa_a),
// segunda (pessoa_b). calcularAgendaRecap chama em paralelo nessa ordem.
function seedPorPessoa(a: ReturnType<typeof evento>[], b: ReturnType<typeof evento>[]) {
  mockListarEventosAgenda
    .mockResolvedValueOnce(a)
    .mockResolvedValueOnce(b);
}

describe('calcularAgendaRecap - sem dados', () => {
  it('retorna null quando nenhuma pessoa tem evento', async () => {
    const out = await calcularAgendaRecap(VAULT_ROOT, 'semana', ATE);
    expect(out).toBeNull();
  });

  it('retorna null quando todos os eventos estao fora da janela', async () => {
    // 2026-05-01 esta fora da janela semana (16..22).
    seedPorPessoa([evento('e1', '2026-05-01T18:00:00-03:00', 'Antigo')], []);
    const out = await calcularAgendaRecap(VAULT_ROOT, 'semana', ATE);
    expect(out).toBeNull();
  });

  it('tolera erro de leitura de uma das pessoas sem quebrar', async () => {
    mockListarEventosAgenda
      .mockRejectedValueOnce(new Error('io falhou'))
      .mockResolvedValueOnce([
        evento('e1', '2026-05-20T10:00:00-03:00', 'Reuniao'),
      ]);
    const out = await calcularAgendaRecap(VAULT_ROOT, 'semana', ATE);
    expect(out).not.toBeNull();
    expect(out?.totalEventos).toBe(1);
  });
});

describe('calcularAgendaRecap - com dados', () => {
  it('conta eventos e dias distintos no periodo', async () => {
    seedPorPessoa(
      [
        evento('a1', '2026-05-20T09:00:00-03:00', 'Reuniao'),
        evento('a2', '2026-05-20T15:00:00-03:00', 'Almoco'),
        evento('a3', '2026-05-21T11:00:00-03:00', 'Consulta'),
      ],
      []
    );
    const out = await calcularAgendaRecap(VAULT_ROOT, 'semana', ATE);
    // 3 eventos em 2 dias distintos (20 e 21).
    expect(out?.totalEventos).toBe(3);
    expect(out?.diasComEvento).toBe(2);
  });

  it('soma eventos de pessoa_a e pessoa_b (duo)', async () => {
    seedPorPessoa(
      [evento('a1', '2026-05-20T09:00:00-03:00', 'Reuniao A')],
      [evento('b1', '2026-05-22T09:00:00-03:00', 'Reuniao B')]
    );
    const out = await calcularAgendaRecap(VAULT_ROOT, 'semana', ATE);
    expect(out?.totalEventos).toBe(2);
    expect(out?.diasComEvento).toBe(2);
  });

  it('proximoTitulo aponta o primeiro evento futuro em relacao a ate', async () => {
    // ATE = 22/05 12:00. Evento as 09:00 ja passou; o das 18:00 e o
    // proximo futuro.
    seedPorPessoa(
      [
        evento('a1', '2026-05-22T09:00:00-03:00', 'Cafe da manha'),
        evento('a2', '2026-05-22T18:00:00-03:00', 'Jantar'),
      ],
      []
    );
    const out = await calcularAgendaRecap(VAULT_ROOT, 'semana', ATE);
    expect(out?.proximoTitulo).toBe('Jantar');
  });

  it('proximoTitulo e null quando todos os eventos do periodo ja passaram', async () => {
    seedPorPessoa(
      [evento('a1', '2026-05-20T09:00:00-03:00', 'Reuniao')],
      []
    );
    const out = await calcularAgendaRecap(VAULT_ROOT, 'semana', ATE);
    expect(out?.totalEventos).toBe(1);
    expect(out?.proximoTitulo).toBeNull();
  });
});

describe('calcularAgendaRecap - janela', () => {
  it('inclui eventos no limite inferior e exclui anteriores', async () => {
    seedPorPessoa(
      [
        evento('dentro', '2026-05-16T08:00:00-03:00', 'No limite'),
        evento('fora', '2026-05-15T23:00:00-03:00', 'Vespera'),
      ],
      []
    );
    const out = await calcularAgendaRecap(VAULT_ROOT, 'semana', ATE);
    expect(out?.totalEventos).toBe(1);
    expect(out?.diasComEvento).toBe(1);
  });
});
