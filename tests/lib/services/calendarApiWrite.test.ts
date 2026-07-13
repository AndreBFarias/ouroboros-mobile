// Tests da escrita no Google Calendar (M37.2): criarEvento e
// deletarEvento. Cobre 200/201 sucesso, 401 (marca conta invalida),
// 409 conflito, 5xx retry idempotente (mesmo eventId reusado), rede,
// e a idempotencia do delete (404/410 resolvem sem erro).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import {
  ApiError,
  criarEvento,
  deletarEvento,
  gerarEventoId,
  type NovoEventoInput,
} from '@/lib/services/calendarApi';
import { useGoogleAuth } from '@/lib/stores/googleAuth';

const TOKEN = 'test-token';

const INPUT: NovoEventoInput = {
  titulo: 'Almoço com a família',
  inicioIso: '2026-07-15T12:00:00-03:00',
  fimIso: '2026-07-15T13:00:00-03:00',
  local: 'São Paulo',
  descricao: 'Rodízio de pizza',
  timeZone: 'America/Sao_Paulo',
};

function fakeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => JSON.parse(text),
    text: async () => text,
  } as unknown as Response;
}

beforeEach(() => {
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

describe('gerarEventoId', () => {
  test('gera id base32hex com 26 chars', () => {
    const id = gerarEventoId();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9a-v]{26}$/);
  });

  test('ids sucessivos diferem', () => {
    expect(gerarEventoId()).not.toBe(gerarEventoId());
  });
});

describe('criarEvento', () => {
  test('201 devolve evento mapeado e envia body correto', async () => {
    let capturado: unknown = null;
    const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
      capturado = init?.body ? JSON.parse(init.body as string) : null;
      return fakeResponse(201, {
        id: 'srv-evento-1',
        summary: 'Almoço com a família',
        location: 'São Paulo',
        description: 'Rodízio de pizza',
        start: { dateTime: '2026-07-15T12:00:00-03:00' },
        end: { dateTime: '2026-07-15T13:00:00-03:00' },
      });
    });
    const evento = await criarEvento(TOKEN, INPUT, 'pessoa_a', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      eventId: 'clienteid00000000000000000',
    });
    expect(evento.id).toBe('srv-evento-1');
    expect(evento.titulo).toBe('Almoço com a família');
    expect(evento.local).toBe('São Paulo');
    // Body enviado ao Google: id do cliente (idempotencia) + timeZone.
    expect(capturado).toMatchObject({
      id: 'clienteid00000000000000000',
      summary: 'Almoço com a família',
      start: {
        dateTime: '2026-07-15T12:00:00-03:00',
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: '2026-07-15T13:00:00-03:00',
        timeZone: 'America/Sao_Paulo',
      },
    });
  });

  test('200 sem payload minimo reconstroi a partir do input', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse(200, {}));
    const evento = await criarEvento(TOKEN, INPUT, 'pessoa_a', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      eventId: 'fallbackid0000000000000000',
    });
    expect(evento.id).toBe('fallbackid0000000000000000');
    expect(evento.titulo).toBe('Almoço com a família');
    expect(evento.inicio).toBe('2026-07-15T12:00:00-03:00');
  });

  test('401 lanca ApiError invalido e marca conta', async () => {
    const fetchImpl = jest.fn(async () =>
      fakeResponse(401, { error: 'invalid_credentials' })
    );
    await expect(
      criarEvento(TOKEN, INPUT, 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ name: 'ApiError', code: 'invalido' });
    expect(useGoogleAuth.getState().contas.pessoa_a.invalido).toBe(true);
  });

  test('409 lanca ApiError conflito', async () => {
    const fetchImpl = jest.fn(async () =>
      fakeResponse(409, { error: 'duplicate' })
    );
    await expect(
      criarEvento(TOKEN, INPUT, 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ name: 'ApiError', code: 'conflito' });
  });

  test('403 lanca ApiError quota', async () => {
    const fetchImpl = jest.fn(async () =>
      fakeResponse(403, { error: 'quotaExceeded' })
    );
    await expect(
      criarEvento(TOKEN, INPUT, 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ name: 'ApiError', code: 'quota' });
  });

  test('5xx faz retry uma vez reusando o mesmo eventId (idempotente)', async () => {
    const idsEnviados: string[] = [];
    const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      idsEnviados.push(body.id);
      if (idsEnviados.length === 1) return fakeResponse(503, 'down');
      return fakeResponse(201, {
        id: 'srv-2',
        summary: INPUT.titulo,
        start: { dateTime: INPUT.inicioIso },
        end: { dateTime: INPUT.fimIso },
      });
    });
    const delay = jest.fn(async () => undefined);
    const evento = await criarEvento(TOKEN, INPUT, 'pessoa_a', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      delay,
      maxRetry: 1,
    });
    expect(evento.id).toBe('srv-2');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledTimes(1);
    // Idempotencia: os dois POSTs carregaram o MESMO id de cliente,
    // entao o Google deduplica em vez de criar duplicata.
    expect(idsEnviados[0]).toBe(idsEnviados[1]);
  });

  test('5xx esgota retry e lanca erro_google', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse(500, 'boom'));
    const delay = jest.fn(async () => undefined);
    await expect(
      criarEvento(TOKEN, INPUT, 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        delay,
        maxRetry: 1,
      })
    ).rejects.toMatchObject({ name: 'ApiError', code: 'erro_google' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('rede falha lanca ApiError rede', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('network down');
    });
    await expect(
      criarEvento(TOKEN, INPUT, 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ name: 'ApiError', code: 'rede' });
  });

  test('token mock em web dev nao chama fetch', async () => {
    const platformOriginal = Platform.OS;
    (Platform as unknown as { OS: string }).OS = 'web';
    const fetchImpl = jest.fn(async () => {
      throw new Error('nao deveria chamar fetch');
    });
    try {
      const evento = await criarEvento(
        'mock-access-token-dev-web',
        INPUT,
        'pessoa_a',
        { fetchImpl: fetchImpl as unknown as typeof fetch }
      );
      expect(evento.titulo).toBe('Almoço com a família');
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      (Platform as unknown as { OS: string }).OS = platformOriginal;
    }
  });
});

describe('deletarEvento', () => {
  test('204 resolve sem erro', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse(204, ''));
    await expect(
      deletarEvento(TOKEN, 'ev-1', 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('404 (ja removido) resolve sem erro -- idempotente', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse(404, 'not found'));
    await expect(
      deletarEvento(TOKEN, 'ev-2', 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toBeUndefined();
  });

  test('410 (gone) resolve sem erro', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse(410, 'gone'));
    await expect(
      deletarEvento(TOKEN, 'ev-3', 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toBeUndefined();
  });

  test('401 lanca invalido e marca conta', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse(401, 'unauthorized'));
    await expect(
      deletarEvento(TOKEN, 'ev-4', 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ name: 'ApiError', code: 'invalido' });
    expect(useGoogleAuth.getState().contas.pessoa_a.invalido).toBe(true);
  });

  test('5xx faz retry uma vez e depois lanca erro_google', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse(502, 'bad gateway'));
    const delay = jest.fn(async () => undefined);
    await expect(
      deletarEvento(TOKEN, 'ev-5', 'pessoa_a', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        delay,
        maxRetry: 1,
      })
    ).rejects.toMatchObject({ name: 'ApiError', code: 'erro_google' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('encoda o id na URL', async () => {
    let urlUsada = '';
    const fetchImpl = jest.fn(async (url: string) => {
      urlUsada = url;
      return fakeResponse(204, '');
    });
    await deletarEvento(TOKEN, 'a b/c', 'pessoa_a', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(urlUsada).toContain('/events/a%20b%2Fc');
  });
});

describe('ApiError conflito', () => {
  test('code conflito propaga', () => {
    const e = new ApiError('conflito', 'dup');
    expect(e.code).toBe('conflito');
  });
});
