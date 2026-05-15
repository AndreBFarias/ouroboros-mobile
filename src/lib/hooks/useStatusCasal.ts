// Hook de status do casal para a Tela 01 v2 (M40). Le do Vault o
// humor mais recente de cada pessoa (pessoa_a e pessoa_b) e o
// instante da ultima atividade registrada (humor / diario / evento).
//
// Diferente de useHoje (que respeita pessoaAtiva + filtroEfetivo),
// este hook ignora qualquer filtro de pessoa: o objetivo e mostrar
// 2 cards lado a lado com o estado de cada um. Sem isso, o card da
// pessoa nao-ativa apareceria sempre vazio.
//
// Sem julgamento (ADR-0005): expoe dados, nao calcula "quem esta
// melhor". A UI consumidora apenas renderiza valores.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState, useCallback } from 'react';
import { listVaultFolder, readVaultFile } from '@/lib/vault';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { useVault } from '@/lib/stores/vault';

// Tipo da ultima atividade de uma pessoa. `tipo` permite a UI
// rotular "Última: 14:30 evento" / "Última: 09:15 humor".
export type UltimaAtividadeTipo = 'humor' | 'diario' | 'evento';

export interface UltimaAtividade {
  tipo: UltimaAtividadeTipo;
  iso: string; // ISO datetime do registro mais recente.
}

export interface StatusPessoa {
  pessoa: PessoaAutor;
  humor: HumorMeta | null;
  ultima: UltimaAtividade | null;
}

export interface StatusCasalData {
  pessoaA: StatusPessoa;
  pessoaB: StatusPessoa;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Helpers locais (paralelos aos de useHoje, sem dependencia cruzada
// para evitar acoplamento de filtros).
function uriBelongsToFolder(uri: string, folder: string): boolean {
  const decoded = decodeURIComponent(uri);
  return decoded.includes(`/${folder}/`) || decoded.endsWith(`/${folder}`);
}

function uriMatchesDatePrefix(uri: string, ymd: string): boolean {
  const decoded = decodeURIComponent(uri);
  const tail = decoded.split('/').pop() ?? decoded;
  return tail.startsWith(ymd);
}

async function listFolderByName(
  rootUri: string,
  folder: string,
  ext: string
): Promise<string[]> {
  const rootEntries = await listVaultFolder(rootUri);
  const matches: string[] = [];
  for (const entry of rootEntries) {
    if (uriBelongsToFolder(entry, folder)) {
      if (ext && entry.toLowerCase().endsWith(ext.toLowerCase())) {
        matches.push(entry);
      } else {
        const sub = await listVaultFolder(entry, ext);
        matches.push(...sub);
      }
    }
  }
  return matches;
}

function formatYmdLocal(date: Date): string {
  const local = new Date(date.getTime() + -180 * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function maisRecente(
  a: UltimaAtividade | null,
  b: UltimaAtividade
): UltimaAtividade {
  if (!a) return b;
  return a.iso >= b.iso ? a : b;
}

// Computa StatusPessoa para uma pessoa especifica a partir das
// listas ja lidas do dia. Mantem a logica isolada para teste futuro.
function calcularStatus(
  pessoa: PessoaAutor,
  humor: HumorMeta | null,
  diarios: DiarioEmocionalMeta[],
  eventos: EventoMeta[]
): StatusPessoa {
  let ultima: UltimaAtividade | null = null;
  if (humor && humor.autor === pessoa) {
    ultima = maisRecente(ultima, { tipo: 'humor', iso: humor.data });
  }
  for (const d of diarios) {
    if (d.autor !== pessoa) continue;
    ultima = maisRecente(ultima, { tipo: 'diario', iso: d.data });
  }
  for (const e of eventos) {
    if (e.autor !== pessoa) continue;
    ultima = maisRecente(ultima, { tipo: 'evento', iso: e.data });
  }
  return {
    pessoa,
    humor: humor && humor.autor === pessoa ? humor : null,
    ultima,
  };
}

export function useStatusCasal(ymdOverride?: string): StatusCasalData {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [pessoaA, setPessoaA] = useState<StatusPessoa>({
    pessoa: 'pessoa_a',
    humor: null,
    ultima: null,
  });
  const [pessoaB, setPessoaB] = useState<StatusPessoa>({
    pessoa: 'pessoa_b',
    humor: null,
    ultima: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState<number>(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!vaultRoot) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const ymd = ymdOverride ?? formatYmdLocal(new Date());

    (async () => {
      try {
        // Para cada pessoa: leitura independente do humor do dia
        // (arquivos daily/YYYY-MM-DD.md sao por dia, sem distincao de
        // autor no path; o autor vem do frontmatter). Hoje so existe
        // 1 humor por dia com autor unico, entao basta ler e separar.
        const dailyUris = await listFolderByName(vaultRoot, 'daily', '.md');
        const humorUri = dailyUris.find((u) => uriMatchesDatePrefix(u, ymd));
        const humorRead = humorUri
          ? await readVaultFile(humorUri, HumorSchema)
          : null;
        const humorMeta = humorRead ? humorRead.meta : null;

        const diarioUris = await listFolderByName(vaultRoot, 'diario', '.md');
        const diariosDoDia = diarioUris.filter((u) =>
          uriMatchesDatePrefix(u, ymd)
        );
        const diariosLidos: DiarioEmocionalMeta[] = [];
        for (const u of diariosDoDia) {
          const r = await readVaultFile(u, DiarioEmocionalSchema);
          if (r) diariosLidos.push(r.meta);
        }

        const eventosUris = await listFolderByName(vaultRoot, 'eventos', '.md');
        const eventosDoDia = eventosUris.filter((u) =>
          uriMatchesDatePrefix(u, ymd)
        );
        const eventosLidos: EventoMeta[] = [];
        for (const u of eventosDoDia) {
          const r = await readVaultFile(u, EventoSchema);
          if (r) eventosLidos.push(r.meta);
        }

        if (cancelled) return;

        setPessoaA(
          calcularStatus('pessoa_a', humorMeta, diariosLidos, eventosLidos)
        );
        setPessoaB(
          calcularStatus('pessoa_b', humorMeta, diariosLidos, eventosLidos)
        );
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vaultRoot, ymdOverride, tick]);

  return { pessoaA, pessoaB, loading, error, reload };
}

// Exportado para testes unitarios sem precisar mockar Vault.
export const __test__ = { calcularStatus, maisRecente };
