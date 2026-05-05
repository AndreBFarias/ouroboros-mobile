// Cache de eventos Calendar em arquivo no Vault. NAO usa SecureStore
// (vide A20 do BRIEF: limite ~2KB por valor; 30 dias de eventos
// estouram facilmente). Arquivo aparece no desktop via Syncthing,
// bonus de introspeccao.
//
// Path canonico: <vaultRoot>/media/cache/agenda-<pessoa>.json.
// Pasta media/cache nao esta na lista SUBPASTAS_CANONICAS de M22
// (so 'media/scanner', 'media/fotos' etc.) — criamos sob demanda
// via makeDirectoryAsync com intermediates: true.
//
// Em web (mock OAuth dev), vaultRoot pode ser 'web://mock-vault/...'
// — fallback para in-memory por sessao via Map.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { EventoCalendar } from '@/lib/services/calendarApi';

interface CachePayload {
  schema_version: 1;
  geradoEm: number;
  ttlMin: number;
  eventos: EventoCalendar[];
}

const TTL_MIN_DEFAULT = 60;

// Map em memoria para fallback web. Em mobile real, nao usado.
const memoryCacheWeb = new Map<string, CachePayload>();

function joinPath(root: string, rel: string): string {
  const r = root.endsWith('/') ? root.slice(0, -1) : root;
  const s = rel.startsWith('/') ? rel.slice(1) : rel;
  return `${r}/${s}`;
}

function cachePathFor(pessoa: PessoaAutor): string {
  return `media/cache/agenda-${pessoa}.json`;
}

function isWebMock(vaultRoot: string): boolean {
  return Platform.OS === 'web' || vaultRoot.startsWith('web://');
}

// Garante que <vaultRoot>/media/cache/ existe. Idempotente.
async function garantirPastaCache(vaultRoot: string): Promise<void> {
  const dir = joinPath(vaultRoot, 'media/cache');
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // ja existe ou SAF interpretou — segue para writeAsString que
    // dara erro real se houver problema.
  }
}

export async function salvarCacheEventos(
  vaultRoot: string,
  pessoa: PessoaAutor,
  eventos: EventoCalendar[]
): Promise<void> {
  const payload: CachePayload = {
    schema_version: 1,
    geradoEm: Date.now(),
    ttlMin: TTL_MIN_DEFAULT,
    eventos,
  };
  if (isWebMock(vaultRoot)) {
    memoryCacheWeb.set(cachePathFor(pessoa), payload);
    return;
  }
  await garantirPastaCache(vaultRoot);
  const uri = joinPath(vaultRoot, cachePathFor(pessoa));
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export interface CacheLido {
  eventos: EventoCalendar[];
  geradoEm: number;
}

export async function lerCacheEventos(
  vaultRoot: string,
  pessoa: PessoaAutor
): Promise<CacheLido | null> {
  if (isWebMock(vaultRoot)) {
    const found = memoryCacheWeb.get(cachePathFor(pessoa));
    if (!found) return null;
    return { eventos: found.eventos, geradoEm: found.geradoEm };
  }
  const uri = joinPath(vaultRoot, cachePathFor(pessoa));
  try {
    const raw = await FileSystem.readAsStringAsync(uri);
    const json = JSON.parse(raw) as Partial<CachePayload>;
    if (
      typeof json !== 'object' ||
      json === null ||
      !Array.isArray(json.eventos) ||
      typeof json.geradoEm !== 'number'
    ) {
      return null;
    }
    return { eventos: json.eventos as EventoCalendar[], geradoEm: json.geradoEm };
  } catch {
    return null;
  }
}

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
