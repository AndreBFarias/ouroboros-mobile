// Tests do calendarApi: 200 ok, 401 invalido (chama marcarInvalido),
// 403 quota, 429 backoff (retry uma vez), 5xx retry.
//
// Comentarios sem acento (convencao shell/CI).
import {
  ApiError,
  listarEventos,
  type EventoCalendar,
} from '@/lib/services/calendarApi';
import { useGoogleAuth } from '@/lib/stores/googleAuth';

const TOKEN = 'test-token';

function fakeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  // Construct minimal Response-like interface used by listarEventos.
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
    json: async () => JSON.parse(text),
    text: async () => text,
  } as unknown as Response;
}

describe('listarEventos', () => {
  beforeEach(() => {
    // zera estado do store entre testes
    useGoogleAuth.setState({
      contas: {
        pessoa_a: {
          accessToken: 'a-token',
          refreshToken: 'a-refresh',
          expiraEm: Date.now() + 3600_000,
          email: 'a@example.com',
          ultimaConexao: Date.now(),
          invalido: false,
        },
        pessoa_b: {
          accessToken: null,
          refreshToken: null,
          expiraEm: 0,
          email: null,
          ultimaConexao: 0,
          invalido: false,
        },
      },
    });
  });

  test('200 ok devolve lista mapeada', async () => {
    const fetchImpl = jest.fn(async () =>
      fakeResponse(200, {
        items: [
          {
            id: 'e1',
            summary: 'Reunião',
            start: { dateTime: '2026-05-10T10:00:00Z' },
            end: { dateTime: '2026-05-10T11:00:00Z' },
            location: 'Sala 1',
          },
          {
            id: 'e2',
            summary: 'Almoço',
            start: { date: '2026-05-11' },
            end: { date: '2026-05-12' },
          },
        ],
      })
    );
    const lista = await listarEventos(
      TOKEN,
      new Date('2026-05-10'),
      new Date('2026-06-10'),
      'pessoa_a',
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(lista).toHaveLength(2);
    expect(lista[0]?.titulo).toBe('Reunião');
    expect(lista[0]?.local).toBe('Sala 1');
    expect(lista[1]?.titulo).toBe('Almoço');
  });

  test('401 lanca ApiError invalido e marca conta', async () => {
    const fetchImpl = jest.fn(async () =>
      fakeResponse(401, { error: 'invalid_credentials' })
    );
    await expect(
      listarEventos(
        TOKEN,
        new Date(),
        new Date(),
        'pessoa_a',
        { fetchImpl: fetchImpl as unknown as typeof fetch }
      )
    ).rejects.toMatchObject({ name: 'ApiError', code: 'invalido' });

    expect(useGoogleAuth.getState().contas.pessoa_a.invalido).toBe(true);
  });

  test('403 lanca ApiError quota', async () => {
    const fetchImpl = jest.fn(async () =>
      fakeResponse(403, { error: 'quotaExceeded' })
    );
    const promessa = listarEventos(
      TOKEN,
      new Date(),
      new Date(),
      'pessoa_a',
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    await expect(promessa).rejects.toMatchObject({
      name: 'ApiError',
      code: 'quota',
    });
  });

  test('429 faz backoff e retry uma vez', async () => {
    const calls: number[] = [];
    const fetchImpl = jest.fn(async () => {
      calls.push(Date.now());
      if (calls.length === 1) {
        return fakeResponse(429, 'too many', { 'Retry-After': '0' });
      }
      return fakeResponse(200, { items: [] });
    });
    const delay = jest.fn(async () => undefined);
    const lista = await listarEventos(
      TOKEN,
      new Date(),
      new Date(),
      'pessoa_a',
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        delay,
        maxRetry: 1,
      }
    );
    expect(lista).toEqual<EventoCalendar[]>([]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledTimes(1);
  });

  test('5xx retry e depois lanca erro_google', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse(503, 'down'));
    const delay = jest.fn(async () => undefined);
    await expect(
      listarEventos(
        TOKEN,
        new Date(),
        new Date(),
        'pessoa_a',
        {
          fetchImpl: fetchImpl as unknown as typeof fetch,
          delay,
          maxRetry: 1,
        }
      )
    ).rejects.toMatchObject({ name: 'ApiError', code: 'erro_google' });
    // Tenta uma vez + retry uma = 2 calls
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('rede falha lanca ApiError rede', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('network down');
    });
    await expect(
      listarEventos(
        TOKEN,
        new Date(),
        new Date(),
        'pessoa_a',
        { fetchImpl: fetchImpl as unknown as typeof fetch }
      )
    ).rejects.toMatchObject({ name: 'ApiError', code: 'rede' });
  });
});

describe('ApiError', () => {
  test('captura code e detalhe', () => {
    const e = new ApiError('quota', 'detalhe x');
    expect(e.code).toBe('quota');
    expect(e.detalhe).toBe('detalhe x');
    expect(e.name).toBe('ApiError');
  });
});
