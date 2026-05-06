// Cache de eventos Calendar (M37.1) refatorado em M37.1.2 para delegar
// ao modulo de Vault (.md individual por evento, alinhado ao ADR-0019).
// API publica (salvarCacheEventos, lerCacheEventos, cacheEstaFresco)
// preservada para nao quebrar callers (app/agenda.tsx).
//
// Path canonico antigo: <vaultRoot>/media/cache/agenda-<pessoa>.json
// (1 JSON unico por pessoa, ~30 dias de eventos).
// Path canonico novo: <vaultRoot>/agenda/<pessoa>/YYYY-MM-DD-<eventId>.md
// (N arquivos pequenos, sincing seletivo, conflito isolado, legivel).
//
// Em web (mock OAuth dev), vaultRoot pode ser 'web://mock-vault/...'
// — fallback para in-memory via Map preservado para Nivel A sem rede
// real. Mobile real usa SAF normalmente via agenda.ts.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { EventoCalendar } from '@/lib/services/calendarApi';
import {
  AgendaEventoSchema,
  listarEventosAgenda,
  sincronizarSnapshotAgenda,
  type AgendaEvento,
} from '@/lib/vault/agenda';

const TTL_MIN_DEFAULT = 60;

// Map em memoria para fallback web mock. Em mobile real, nao usado.
// Estrutura: Map<pessoa, { eventos, geradoEm }>.
interface MemoriaWebPayload {
  eventos: EventoCalendar[];
  geradoEm: number;
}
const memoryCacheWeb = new Map<string, MemoriaWebPayload>();

function memoryCacheKey(pessoa: PessoaAutor): string {
  return `agenda-${pessoa}`;
}

function isWebMock(vaultRoot: string): boolean {
  return Platform.OS === 'web' || vaultRoot.startsWith('web://');
}

// Mapeia EventoCalendar (vindo do calendarApi) para AgendaEvento
// (frontmatter canonico do .md). Os campos coincidem em significado;
// preenchemos pessoa, fonte e sincronizado_em a nivel da sincronizacao.
function eventoCalendarToAgenda(
  ev: EventoCalendar,
  pessoa: PessoaAutor,
  sincronizadoEm: string
): AgendaEvento | null {
  const proposto: AgendaEvento = {
    id: ev.id,
    pessoa,
    titulo: ev.titulo,
    inicio: ev.inicio,
    fim: ev.fim,
    fonte: 'google_calendar',
    sincronizado_em: sincronizadoEm,
  };
  if (typeof ev.local === 'string' && ev.local.length > 0) {
    proposto.local = ev.local;
  }
  const parsed = AgendaEventoSchema.safeParse(proposto);
  return parsed.success ? parsed.data : null;
}

// Volta o AgendaEvento (frontmatter do .md) para EventoCalendar (shape
// que app/agenda.tsx consome). Os campos coincidem; descartamos
// metadados internos (pessoa, fonte, sincronizado_em).
function agendaToEventoCalendar(ag: AgendaEvento): EventoCalendar {
  const out: EventoCalendar = {
    id: ag.id,
    titulo: ag.titulo,
    inicio: ag.inicio,
    fim: ag.fim,
  };
  if (typeof ag.local === 'string' && ag.local.length > 0) {
    out.local = ag.local;
  }
  return out;
}

// Persiste o snapshot completo de eventos para uma pessoa. Em mobile,
// delega para sincronizarSnapshotAgenda (escreve N .md, remove stale).
// Em web mock, fallback para Map em memoria preservando comportamento
// pre-M37.1.2 (Nivel A sem rede real).
export async function salvarCacheEventos(
  vaultRoot: string,
  pessoa: PessoaAutor,
  eventos: EventoCalendar[]
): Promise<void> {
  const agora = Date.now();
  const sincronizadoEm = new Date(agora).toISOString();

  if (isWebMock(vaultRoot)) {
    memoryCacheWeb.set(memoryCacheKey(pessoa), {
      eventos,
      geradoEm: agora,
    });
    return;
  }

  const eventosAg: AgendaEvento[] = [];
  for (const ev of eventos) {
    const ag = eventoCalendarToAgenda(ev, pessoa, sincronizadoEm);
    if (ag) eventosAg.push(ag);
  }
  await sincronizarSnapshotAgenda(vaultRoot, pessoa, eventosAg, sincronizadoEm);
}

export interface CacheLido {
  eventos: EventoCalendar[];
  geradoEm: number;
}

// Le o snapshot de eventos para uma pessoa. Em mobile, delega para
// listarEventosAgenda (le N .md, devolve lista). geradoEm e inferido
// a partir do sincronizado_em mais recente (Date.parse). Em web mock,
// le do Map em memoria. Retorna null se nao ha cache.
export async function lerCacheEventos(
  vaultRoot: string,
  pessoa: PessoaAutor
): Promise<CacheLido | null> {
  if (isWebMock(vaultRoot)) {
    const found = memoryCacheWeb.get(memoryCacheKey(pessoa));
    return found ?? null;
  }

  const lista = await listarEventosAgenda(vaultRoot, pessoa);
  if (lista.length === 0) return null;

  const eventos = lista.map(agendaToEventoCalendar);
  const sincronizadoMais = lista.reduce(
    (acc, ev) => (ev.sincronizado_em > acc ? ev.sincronizado_em : acc),
    lista[0].sincronizado_em
  );
  const geradoEm = Date.parse(sincronizadoMais);
  return {
    eventos,
    geradoEm: Number.isFinite(geradoEm) ? geradoEm : Date.now(),
  };
}

// Heuristica de TTL: cache fresco se geradoEm dentro da janela ttlMin.
// Mantida sem mudanca em M37.1.2 (mesma assinatura, mesma semantica).
export function cacheEstaFresco(
  geradoEm: number,
  ttlMin: number = TTL_MIN_DEFAULT
): boolean {
  const ttlMs = ttlMin * 60_000;
  return Date.now() - geradoEm < ttlMs;
}

// Util para testes: zera o cache em memoria web.
export function __resetCacheMemoriaWeb(): void {
  memoryCacheWeb.clear();
}
