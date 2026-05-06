// Wrappers fetch para Google Calendar API v3. Apenas leitura em
// M37.1 (escopo calendar.events.readonly). Tratamento explicito de
// erros HTTP conforme ADR-0018 §5:
//   401 -> chama useGoogleAuth.marcarInvalido + lanca ApiError 'invalido'
//   403 -> ApiError 'quota'
//   429 -> backoff exponencial; tenta uma vez
//   5xx -> retry uma vez; se falhar, ApiError 'erro_google'
//
// Pessoa contida na assinatura para que marcarInvalido saiba qual
// das duas contas zerar. Caller passa a pessoa que originou o
// token; sem isso seria preciso fazer round-trip pelo store.
//
// Em web __DEV__ (Gauntlet), token comeca com "mock-access-token"
// e listarEventos devolve eventos sinteticos para Nivel A — sem
// rede real. IDs estaveis por pessoa (mock-<pessoa>-<idx>) garantem
// idempotencia da migracao M37.1.2: rodar 2x nao duplica entradas
// no Vault. Branch dead-code em release Android (Platform.OS !=
// 'web').
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { useGoogleAuth } from '@/lib/stores/googleAuth';

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

export interface EventoCalendar {
  id: string;
  titulo: string;
  inicio: string; // ISO 8601
  fim: string; // ISO 8601
  local?: string;
  descricao?: string;
}

export type ApiErrorCode =
  | 'invalido'
  | 'quota'
  | 'rate_limit'
  | 'erro_google'
  | 'rede';

export class ApiError extends Error {
  code: ApiErrorCode;
  detalhe?: string;
  constructor(code: ApiErrorCode, detalhe?: string) {
    super(`ApiError(${code}): ${detalhe ?? ''}`);
    this.name = 'ApiError';
    this.code = code;
    this.detalhe = detalhe;
  }
}

interface GoogleEventoRaw {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GoogleEventsListResponse {
  items?: GoogleEventoRaw[];
}

function eventoFromRaw(raw: GoogleEventoRaw): EventoCalendar | null {
  const id = typeof raw.id === 'string' ? raw.id : null;
  const titulo = typeof raw.summary === 'string' ? raw.summary : '(sem título)';
  const inicio = raw.start?.dateTime ?? raw.start?.date;
  const fim = raw.end?.dateTime ?? raw.end?.date;
  if (id === null || typeof inicio !== 'string' || typeof fim !== 'string') {
    return null;
  }
  const out: EventoCalendar = { id, titulo, inicio, fim };
  if (typeof raw.location === 'string' && raw.location.length > 0) {
    out.local = raw.location;
  }
  if (typeof raw.description === 'string' && raw.description.length > 0) {
    out.descricao = raw.description;
  }
  return out;
}

interface ListarOpcoes {
  // Numero maximo de retries para 429 e 5xx. Default 1 (uma tentativa
  // de retry alem da inicial).
  maxRetry?: number;
  // Hook para pausar entre retries (testes injetam fake timer).
  delay?: (ms: number) => Promise<void>;
  // Override do fetch global (testes injetam mock).
  fetchImpl?: typeof fetch;
}

const sleepReal = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Eventos sinteticos para Nivel A em web dev. Distribuidos a cada 2
// dias a partir de "de" (parametro do listarEventos), com IDs estaveis
// por pessoa (mock-<pessoa>-<idx>) para idempotencia da migracao
// M37.1.2 -- rodar 2x nao duplica entradas no Vault.
function eventosMockados(
  de: Date,
  _ate: Date,
  pessoa: PessoaAutor
): EventoCalendar[] {
  const base = new Date(de.getTime());
  base.setHours(10, 0, 0, 0);
  const titulos = [
    'Reunião com equipe',
    'Consulta médica',
    'Almoço de aniversário',
    'Treino na academia',
    'Estudo de mandarim',
  ] as const;
  const descricaoPrimeiro =
    'Reunião semanal de status. Pauta no link do convite.';
  return titulos.map((titulo, idx) => {
    const inicio = new Date(base.getTime() + idx * 2 * 86400_000);
    const fim = new Date(inicio.getTime() + 3600_000);
    const evento: EventoCalendar = {
      id: `mock-${pessoa}-${idx}`,
      titulo,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    };
    if (idx === 0) {
      evento.local = 'São Paulo';
      evento.descricao = descricaoPrimeiro;
    }
    return evento;
  });
}

function isMockToken(token: string): boolean {
  // eslint-disable-next-line no-undef
  const dev = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  return dev && Platform.OS === 'web' && token.startsWith('mock-access-token');
}

// Busca eventos do calendar primary entre [de, ate). Resolve com
// array possivelmente vazio. Lanca ApiError em falhas durol.
export async function listarEventos(
  token: string,
  de: Date,
  ate: Date,
  pessoa: PessoaAutor,
  opcoes: ListarOpcoes = {}
): Promise<EventoCalendar[]> {
  if (isMockToken(token)) {
    return eventosMockados(de, ate, pessoa);
  }
  const maxRetry = opcoes.maxRetry ?? 1;
  const delay = opcoes.delay ?? sleepReal;
  const doFetch = opcoes.fetchImpl ?? fetch;

  const url = new URL(`${CALENDAR_BASE}/calendars/primary/events`);
  url.searchParams.set('timeMin', de.toISOString());
  url.searchParams.set('timeMax', ate.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  let tentativas = 0;
  // loop com retry controlado
  while (true) {
    let res: Response;
    try {
      res = await doFetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new ApiError('rede');
    }

    if (res.status === 200) {
      const json = (await res.json()) as GoogleEventsListResponse;
      const items = Array.isArray(json.items) ? json.items : [];
      return items
        .map(eventoFromRaw)
        .filter((e): e is EventoCalendar => e !== null);
    }

    if (res.status === 401) {
      useGoogleAuth.getState().marcarInvalido(pessoa);
      const detalhe = await safeText(res);
      throw new ApiError('invalido', detalhe);
    }

    if (res.status === 403) {
      const detalhe = await safeText(res);
      throw new ApiError('quota', detalhe);
    }

    if (res.status === 429 || res.status >= 500) {
      if (tentativas >= maxRetry) {
        const detalhe = await safeText(res);
        throw new ApiError(
          res.status === 429 ? 'rate_limit' : 'erro_google',
          detalhe
        );
      }
      const retryAfterHeader = res.headers.get('Retry-After');
      const baseMs = parseRetryAfterMs(retryAfterHeader);
      const backoffMs = baseMs ?? Math.min(1000 * 2 ** tentativas, 8000);
      await delay(backoffMs);
      tentativas += 1;
      continue;
    }

    // outros 4xx: trata como erro_google generico
    const detalhe = await safeText(res);
    throw new ApiError('erro_google', detalhe);
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function parseRetryAfterMs(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  // Pode vir como HTTP-date; fallback para null e callsite usa
  // backoff exponencial.
  return null;
}
