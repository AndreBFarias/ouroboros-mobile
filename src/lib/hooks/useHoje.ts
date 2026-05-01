// Hook de dados da Tela 01 (hoje). Le do Vault, em ordem:
//   1. daily/YYYY-MM-DD.md         (humor do dia)
//   2. inbox/mente/diario/YYYY-MM-DD-*.md  (diarios emocionais)
//   3. eventos/YYYY-MM-DD-*.md     (eventos)
//
// Filtra automaticamente pela pessoa ativa (autor === pessoaAtiva)
// quando filtro não e 'ambos'. Devolve loading/error simples.
//
// Estrategia SAF: lista o conteudo da pasta-pai (vaultRoot) usando
// readDirectoryAsync. Como SAF retorna URIs completos opacos, o que
// importa e que cada URI termine com o sufixo do path canonico (ex:
// '...%2Fdaily%2F2026-04-29.md'). O matching e por sufixo decodificado.
import { useEffect, useState, useCallback } from 'react';
import { listVaultFolder, readVaultFile } from '@/lib/vault';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';

export interface HojeData {
  humor: HumorMeta | null;
  diarios: DiarioEmocionalMeta[];
  eventos: EventoMeta[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Decodifica e checa se o URI termina com a pasta canonica (em
// qualquer encoding razoavel: '/daily', '%2Fdaily', etc).
function uriBelongsToFolder(uri: string, folder: string): boolean {
  const decoded = decodeURIComponent(uri);
  return decoded.includes(`/${folder}/`) || decoded.endsWith(`/${folder}`);
}

// Filtra URIs cujo nome de arquivo (ultima parte decodificada)
// comeca com o prefixo de data ymd.
function uriMatchesDatePrefix(uri: string, ymd: string): boolean {
  const decoded = decodeURIComponent(uri);
  const tail = decoded.split('/').pop() ?? decoded;
  return tail.startsWith(ymd);
}

// Resolve: dado o root SAF e um nome de pasta (ex: 'daily'),
// devolve uma "lista plausivel" de URIs descendentes. SAF não tem
// API simples de "abrir subpasta por nome"; o caminho mais robusto
// e listar a raiz e filtrar pelos URIs que decodificados contenham
// '/<folder>/'. Esta função retorna best-effort.
async function listFolderByName(
  rootUri: string,
  folder: string,
  ext: string
): Promise<string[]> {
  // 1. Tenta listar direto a raiz: SAF retorna entradas no nível
  //    superior; subpastas aparecem como URIs de tree separadas.
  const rootEntries = await listVaultFolder(rootUri);
  const matches: string[] = [];

  // Procura uma sub-arvore cujo URI bata com a pasta alvo. Algumas
  // implementacoes SAF retornam '.../tree/.../document/...%2Ffolder'.
  for (const entry of rootEntries) {
    if (uriBelongsToFolder(entry, folder)) {
      // Pode ser tanto a propria pasta quanto um arquivo dentro
      if (ext && entry.toLowerCase().endsWith(ext.toLowerCase())) {
        matches.push(entry);
      } else {
        // Tenta listar como subpasta
        const sub = await listVaultFolder(entry, ext);
        matches.push(...sub);
      }
    }
  }
  return matches;
}

// Hook principal. Reage a mudancas de pessoaAtiva e vaultRoot. O ymd
// (data alvo) eh calculado UMA VEZ por render do hook, NÃO via prop
// 'now: Date' que criaria nova referência a cada render e quebraria
// o useEffect com loop infinito (re-fetch perpetuo). Caller que quiser
// data customizada passa string YYYY-MM-DD via parametro 'ymdOverride'.
export function useHoje(ymdOverride?: string): HojeData {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const filtro = usePessoa((s) => s.filtroPessoa);

  const [humor, setHumor] = useState<HumorMeta | null>(null);
  const [diarios, setDiarios] = useState<DiarioEmocionalMeta[]>([]);
  const [eventos, setEventos] = useState<EventoMeta[]>([]);
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

    // Calcula ymd dentro do effect: estavel entre re-renders, so muda
    // quando reload() forca nova execucao via tick.
    const ymd = ymdOverride ?? formatYmdLocal(new Date());

    (async () => {
      try {
        // Humor do dia
        const dailyUris = await listFolderByName(vaultRoot, 'daily', '.md');
        const humorUri = dailyUris.find((u) => uriMatchesDatePrefix(u, ymd));
        const humorRead = humorUri
          ? await readVaultFile(humorUri, HumorSchema)
          : null;

        // Diarios emocionais do dia
        const diarioUris = await listFolderByName(
          vaultRoot,
          'diario',
          '.md'
        );
        const diariosDoDia = diarioUris.filter((u) =>
          uriMatchesDatePrefix(u, ymd)
        );
        const diariosLidos: DiarioEmocionalMeta[] = [];
        for (const u of diariosDoDia) {
          const r = await readVaultFile(u, DiarioEmocionalSchema);
          if (r) diariosLidos.push(r.meta);
        }

        // Eventos do dia
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

        // Filtro de pessoa: 'ambos' não filtra; autor específico filtra.
        const filtraPessoa = filtro !== 'ambos';
        const matchAutor = (autor: 'pessoa_a' | 'pessoa_b'): boolean =>
          filtraPessoa ? autor === pessoaAtiva : true;

        setHumor(
          humorRead && matchAutor(humorRead.meta.autor) ? humorRead.meta : null
        );
        setDiarios(diariosLidos.filter((d) => matchAutor(d.autor)));
        setEventos(eventosLidos.filter((e) => matchAutor(e.autor)));
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
  }, [vaultRoot, pessoaAtiva, filtro, ymdOverride, tick]);

  return { humor, diarios, eventos, loading, error, reload };
}

// Helper local sem dependencia do paths.ts (evita ciclos em tests).
function formatYmdLocal(date: Date): string {
  const local = new Date(date.getTime() + -180 * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
