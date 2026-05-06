// Boot helper M37.1.2: migra o cache de agenda do JSON unico
// (media/cache/agenda-<pessoa>.json, formato M37.1) para .md
// individual em agenda/<pessoa>/<YYYY-MM-DD>-<eventId>.md (formato
// M37.1.2 alinhado ao ADR-0019).
//
// Idempotente: rodar 2x nao duplica nem regrava. Apos sucesso da
// migracao de cada pessoa, deleta o JSON original; ao final marca a
// flag useSessao.flags.cacheAgendaMigrado para skip rapido em boots
// futuros.
//
// Em web no-op (sem SAF real, sem Vault canonico). Plugado em
// BOOT_HOOKS via reagendamento.ts a partir de M37.1.2.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { EventoCalendar } from '@/lib/services/calendarApi';
import {
  AgendaEventoSchema,
  sincronizarSnapshotAgenda,
  type AgendaEvento,
} from '@/lib/vault/agenda';
import { useSessao } from '@/lib/stores/sessao';

const PESSOAS: PessoaAutor[] = ['pessoa_a', 'pessoa_b'];

interface CachePayloadLegado {
  schema_version?: number;
  geradoEm?: number;
  ttlMin?: number;
  eventos?: EventoCalendar[];
}

function joinPath(root: string, rel: string): string {
  const r = root.endsWith('/') ? root.slice(0, -1) : root;
  const s = rel.startsWith('/') ? rel.slice(1) : rel;
  return `${r}/${s}`;
}

function cacheJsonRel(pessoa: PessoaAutor): string {
  return `media/cache/agenda-${pessoa}.json`;
}

// Le o JSON legado se existir; retorna null se ausente ou malformado.
async function lerCacheJsonLegado(
  vaultRoot: string,
  pessoa: PessoaAutor
): Promise<CachePayloadLegado | null> {
  const uri = joinPath(vaultRoot, cacheJsonRel(pessoa));
  try {
    const raw = await FileSystem.readAsStringAsync(uri);
    const json = JSON.parse(raw) as CachePayloadLegado;
    if (
      typeof json !== 'object' ||
      json === null ||
      !Array.isArray(json.eventos) ||
      typeof json.geradoEm !== 'number'
    ) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

// Mapeia EventoCalendar para AgendaEvento; descarta itens invalidos
// (defesa contra cache legado corrompido).
function mapEventos(
  eventos: EventoCalendar[],
  pessoa: PessoaAutor,
  sincronizadoEm: string
): AgendaEvento[] {
  const saida: AgendaEvento[] = [];
  for (const ev of eventos) {
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
    if (parsed.success) saida.push(parsed.data);
  }
  return saida;
}

// Migra o cache de uma pessoa: le JSON legado, expande em N .md,
// deleta JSON. Idempotente: ausencia do JSON e no-op silencioso.
async function migrarPessoa(
  vaultRoot: string,
  pessoa: PessoaAutor
): Promise<void> {
  const legado = await lerCacheJsonLegado(vaultRoot, pessoa);
  if (legado === null) return;

  const eventos = Array.isArray(legado.eventos) ? legado.eventos : [];
  const ts = new Date(legado.geradoEm ?? Date.now()).toISOString();
  const eventosAg = mapEventos(eventos, pessoa, ts);

  // Mesmo se a lista estiver vazia, escrevemos o snapshot vazio (no-op
  // em sincronizarSnapshotAgenda) e deletamos o JSON.
  await sincronizarSnapshotAgenda(vaultRoot, pessoa, eventosAg, ts);

  // Deleta o JSON legado. Tolera falha (Syncthing concorrente, sem
  // permissao OEM) — o pior caso e re-tentar no proximo boot.
  const uri = joinPath(vaultRoot, cacheJsonRel(pessoa));
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort.
  }
}

// Entry point do boot hook. Idempotente. Marca a flag uma vez no
// useSessao apos sucesso (mesmo padrao M30 do canalV1Deletado).
export async function migrarCacheAgendaJsonParaMd(
  vaultRoot: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  const flagAtiva = useSessao.getState().flags.cacheAgendaMigrado;
  if (flagAtiva) return;

  for (const pessoa of PESSOAS) {
    try {
      await migrarPessoa(vaultRoot, pessoa);
    } catch {
      // Falha em uma pessoa nao impede a outra; flag so sobe se loop
      // chegou ao fim.
    }
  }

  useSessao.getState().marcarFlagBoot('cacheAgendaMigrado');
}
