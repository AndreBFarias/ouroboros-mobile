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

// M37.2 (escrita): payload de criacao de evento. inicioIso/fimIso vem
// em ISO 8601 com offset local; timeZone acompanha para o Google
// interpretar o horario corretamente (default 'America/Sao_Paulo',
// decisao M37.2 secao 9 -- fuso fixo Brasil).
export interface NovoEventoInput {
  titulo: string;
  inicioIso: string;
  fimIso: string;
  local?: string;
  descricao?: string;
  timeZone: string;
}

export type ApiErrorCode =
  | 'invalido'
  | 'quota'
  | 'rate_limit'
  | 'erro_google'
  | 'conflito'
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

// M37.2 -- escrita no Google Calendar.

interface EscritaOpcoes {
  // Numero maximo de retries para 429 e 5xx. Default 1.
  maxRetry?: number;
  delay?: (ms: number) => Promise<void>;
  fetchImpl?: typeof fetch;
  // Id do evento gerado pelo cliente (idempotencia). Quando ausente,
  // criarEvento gera um base32hex aleatorio. Reusar o mesmo id em
  // retries garante que o Google deduplique (2a insercao com mesmo id
  // volta 409) em vez de criar duplicata quando a rede falha no meio.
  eventId?: string;
}

// Alfabeto base32hex (RFC 4648): 0-9 seguido de a-v. Google Calendar
// aceita apenas estes caracteres em ids gerados pelo cliente, com 5 a
// 1024 chars. 26 chars dao entropia suficiente para evitar colisao
// acidental entre eventos distintos sem precisar de RNG criptografico
// (idempotencia, nao seguranca).
const BASE32HEX = '0123456789abcdefghijklmnopqrstuv';

export function gerarEventoId(): string {
  let out = '';
  for (let i = 0; i < 26; i += 1) {
    out += BASE32HEX[Math.floor(Math.random() * BASE32HEX.length)];
  }
  return out;
}

interface GoogleEventoInsertBody {
  id: string;
  summary: string;
  location?: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

function insertBodyFromInput(
  input: NovoEventoInput,
  eventId: string
): GoogleEventoInsertBody {
  const body: GoogleEventoInsertBody = {
    id: eventId,
    summary: input.titulo,
    start: { dateTime: input.inicioIso, timeZone: input.timeZone },
    end: { dateTime: input.fimIso, timeZone: input.timeZone },
  };
  if (typeof input.local === 'string' && input.local.length > 0) {
    body.location = input.local;
  }
  if (typeof input.descricao === 'string' && input.descricao.length > 0) {
    body.description = input.descricao;
  }
  return body;
}

// Cria um evento no calendar primary. Idempotente por eventId: um retry
// interno (5xx/429) reusa o mesmo id, entao o Google deduplica em vez de
// duplicar. Mesma tabela de erros HTTP do listarEventos, com adicao do
// 409 -> ApiError 'conflito' (evento com este id ja existe).
//
// Em web __DEV__ com token mock, devolve um EventoCalendar sintetico sem
// rede (Nivel A). Branch dead-code em release Android.
export async function criarEvento(
  token: string,
  input: NovoEventoInput,
  pessoa: PessoaAutor,
  opcoes: EscritaOpcoes = {}
): Promise<EventoCalendar> {
  const eventId = opcoes.eventId ?? gerarEventoId();

  if (isMockToken(token)) {
    const evento: EventoCalendar = {
      id: eventId,
      titulo: input.titulo,
      inicio: input.inicioIso,
      fim: input.fimIso,
    };
    if (typeof input.local === 'string' && input.local.length > 0) {
      evento.local = input.local;
    }
    if (typeof input.descricao === 'string' && input.descricao.length > 0) {
      evento.descricao = input.descricao;
    }
    return evento;
  }

  const maxRetry = opcoes.maxRetry ?? 1;
  const delay = opcoes.delay ?? sleepReal;
  const doFetch = opcoes.fetchImpl ?? fetch;
  const url = `${CALENDAR_BASE}/calendars/primary/events`;
  const body = JSON.stringify(insertBodyFromInput(input, eventId));

  let tentativas = 0;
  while (true) {
    let res: Response;
    try {
      res = await doFetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });
    } catch {
      throw new ApiError('rede');
    }

    if (res.status === 200 || res.status === 201) {
      const raw = (await res.json()) as GoogleEventoRaw;
      const evento = eventoFromRaw(raw);
      if (evento === null) {
        // Google aceitou mas devolveu payload sem campos minimos;
        // reconstruimos a partir do input para nao perder o evento.
        const fallback: EventoCalendar = {
          id: typeof raw.id === 'string' ? raw.id : eventId,
          titulo: input.titulo,
          inicio: input.inicioIso,
          fim: input.fimIso,
        };
        if (typeof input.local === 'string' && input.local.length > 0) {
          fallback.local = input.local;
        }
        if (
          typeof input.descricao === 'string' &&
          input.descricao.length > 0
        ) {
          fallback.descricao = input.descricao;
        }
        return fallback;
      }
      return evento;
    }

    if (res.status === 401) {
      useGoogleAuth.getState().marcarInvalido(pessoa);
      throw new ApiError('invalido', await safeText(res));
    }

    if (res.status === 403) {
      throw new ApiError('quota', await safeText(res));
    }

    if (res.status === 409) {
      // Evento com este id ja existe: a insercao anterior (ou um retry)
      // ja vingou. Idempotencia satisfeita -- tratamos como conflito
      // para o caller decidir (toast "Evento ja existe").
      throw new ApiError('conflito', await safeText(res));
    }

    if (res.status === 429 || res.status >= 500) {
      if (tentativas >= maxRetry) {
        throw new ApiError(
          res.status === 429 ? 'rate_limit' : 'erro_google',
          await safeText(res)
        );
      }
      const baseMs = parseRetryAfterMs(res.headers.get('Retry-After'));
      const backoffMs = baseMs ?? Math.min(1000 * 2 ** tentativas, 8000);
      await delay(backoffMs);
      tentativas += 1;
      continue;
    }

    throw new ApiError('erro_google', await safeText(res));
  }
}

// Apaga um evento do calendar primary pelo id. Idempotente: 404/410
// (evento ja removido) resolve sem erro. Mesma tabela de erros do
// criarEvento para 401/403/429/5xx. Mock em web __DEV__: no-op.
export async function deletarEvento(
  token: string,
  id: string,
  pessoa: PessoaAutor,
  opcoes: EscritaOpcoes = {}
): Promise<void> {
  if (isMockToken(token)) {
    return;
  }

  const maxRetry = opcoes.maxRetry ?? 1;
  const delay = opcoes.delay ?? sleepReal;
  const doFetch = opcoes.fetchImpl ?? fetch;
  const url = `${CALENDAR_BASE}/calendars/primary/events/${encodeURIComponent(
    id
  )}`;

  let tentativas = 0;
  while (true) {
    let res: Response;
    try {
      res = await doFetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new ApiError('rede');
    }

    // 200/204 = removido; 404/410 = ja nao existe (idempotente).
    if (
      res.status === 200 ||
      res.status === 204 ||
      res.status === 404 ||
      res.status === 410
    ) {
      return;
    }

    if (res.status === 401) {
      useGoogleAuth.getState().marcarInvalido(pessoa);
      throw new ApiError('invalido', await safeText(res));
    }

    if (res.status === 403) {
      throw new ApiError('quota', await safeText(res));
    }

    if (res.status === 429 || res.status >= 500) {
      if (tentativas >= maxRetry) {
        throw new ApiError(
          res.status === 429 ? 'rate_limit' : 'erro_google',
          await safeText(res)
        );
      }
      const baseMs = parseRetryAfterMs(res.headers.get('Retry-After'));
      const backoffMs = baseMs ?? Math.min(1000 * 2 ** tentativas, 8000);
      await delay(backoffMs);
      tentativas += 1;
      continue;
    }

    throw new ApiError('erro_google', await safeText(res));
  }
}
