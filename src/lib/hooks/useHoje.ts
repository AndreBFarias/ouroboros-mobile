// Hook de dados da Tela 01 (hoje). Le do Vault, em ordem:
//   1. markdown/humor-YYYY-MM-DD.md         (humor do dia)
//   2. markdown/diario-YYYY-MM-DD-*-*.md    (diarios emocionais)
//   3. markdown/evento-YYYY-MM-DD-*.md      (eventos)
//
// V4.0.2 (2026-05-08): migra de leitura legacy daily/inbox/eventos/
// (pre-H2) para layout-por-tipo via listarHumor/listarDiarios/
// listarEventos canonicos. Sem isso, apos migrarVaultLayoutPorTipo
// (boot hook) os arquivos saiam de daily/ e Hoje screen ficava vazio.
//
// Filtra automaticamente pela pessoa ativa (autor === pessoaAtiva)
// quando filtro não e 'ambos'. Devolve loading/error simples.
import { useEffect, useState, useCallback } from 'react';
import { formatDateYmd, listarDiarios, listarEventos, listarHumor } from '@/lib/vault';
import { type HumorMeta } from '@/lib/schemas/humor';
import { type DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import { type EventoMeta } from '@/lib/schemas/evento';
import type { Para } from '@/lib/schemas/para';
import { usePessoa } from '@/lib/stores/pessoa';
import { useFiltroPessoaEfetivo } from '@/lib/stores/filtroEfetivo';
import { useVault } from '@/lib/stores/vault';

// Filtro `para` (M33/M40). Categorias visiveis na agregacao:
//  - 'todos'        : sem filtro (default).
//  - 'mim'          : apenas registros com para.tipo === 'mim'.
//  - 'pessoa_a' /
//    'pessoa_b'     : registros para essa pessoa especifica
//                     (para.tipo === 'outra' && para.pessoa === X).
//  - 'casal'        : apenas registros do casal (para.tipo === 'casal').
export type FiltroPara =
  | 'todos'
  | 'mim'
  | 'pessoa_a'
  | 'pessoa_b'
  | 'casal';

export interface HojeData {
  humor: HumorMeta | null;
  diarios: DiarioEmocionalMeta[];
  eventos: EventoMeta[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Helper local: aplica filtro `para` sobre um meta com campo `para`.
// Quando filtroPara === 'todos' aceita tudo. Humor nao tem campo
// `para`, usa-se apenas para diarios e eventos.
function matchPara(para: Para, filtro: FiltroPara): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'mim') return para.tipo === 'mim';
  if (filtro === 'casal') return para.tipo === 'casal';
  // pessoa_a / pessoa_b: tem que ser para.tipo === 'outra' apontando.
  return para.tipo === 'outra' && para.pessoa === filtro;
}

// V4.0.2: helpers de leitura legacy removidos. useHoje agora usa
// listarHumor/listarDiarios/listarEventos canonicos do vault index.

export interface UseHojeOptions {
  // YYYY-MM-DD para forcar data alvo (default: hoje em UTC-3).
  ymdOverride?: string;
  // Filtro `para` (M33/M40). Default 'todos' preserva semantica
  // M01-M39 (sem filtro por destinatario emocional).
  filtroPara?: FiltroPara;
}

// Hook principal. Reage a mudancas de pessoaAtiva e vaultRoot. O ymd
// (data alvo) eh calculado UMA VEZ por render do hook, NÃO via prop
// 'now: Date' que criaria nova referência a cada render e quebraria
// o useEffect com loop infinito (re-fetch perpetuo). Caller que quiser
// data customizada passa string YYYY-MM-DD via options.ymdOverride.
//
// M40: aceita opcoes em forma de objeto para evoluir sem breaking
// change na assinatura. Manter compat com chamada antiga useHoje() e
// useHoje('2026-04-29') via overload.
export function useHoje(arg?: string | UseHojeOptions): HojeData {
  const opts: UseHojeOptions =
    typeof arg === 'string' ? { ymdOverride: arg } : arg ?? {};
  const ymdOverride = opts.ymdOverride;
  const filtroPara: FiltroPara = opts.filtroPara ?? 'todos';
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  // Filtro efetivo respeita pessoa.vaultCompartilhado.
  const filtro = useFiltroPessoaEfetivo();

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
        // V4.0.2: usa helpers canonicos do layout-por-tipo. listarHumor
        // ja filtra por prefixo 'humor-' em markdown/; idem listarDiarios
        // (prefixo 'diario-') e listarEventos (prefixo 'evento-').
        const [humoresTodos, diariosTodos, eventosTodos] = await Promise.all([
          listarHumor(vaultRoot),
          listarDiarios(vaultRoot),
          listarEventos(vaultRoot),
        ]);

        // Filtra por data alvo. HumorSchema.data = YYYY-MM-DD direto;
        // DiarioEmocional.data e EventoMeta.data sao ISO 8601 (precisa
        // converter para YYYY-MM-DD em UTC-3).
        const humorRead = humoresTodos.find((h) => h.data === ymd) ?? null;
        const diariosDoDia = diariosTodos.filter(
          (d) => formatDateYmd(new Date(d.data)) === ymd
        );
        const eventosDoDia = eventosTodos.filter(
          (e) => formatDateYmd(new Date(e.data)) === ymd
        );

        if (cancelled) return;

        // Filtro de pessoa: 'ambos' não filtra; autor específico filtra.
        const filtraPessoa = filtro !== 'ambos';
        const matchAutor = (autor: 'pessoa_a' | 'pessoa_b'): boolean =>
          filtraPessoa ? autor === pessoaAtiva : true;

        // Aplica filtros em cascata: primeiro autor (pessoa ativa),
        // depois `para` (destinatario emocional, M33). Humor nao tem
        // campo `para`, so respeita autor.
        setHumor(
          humorRead && matchAutor(humorRead.autor) ? humorRead : null
        );
        setDiarios(
          diariosDoDia
            .filter((d) => matchAutor(d.autor))
            .filter((d) => matchPara(d.para, filtroPara))
        );
        setEventos(
          eventosDoDia
            .filter((e) => matchAutor(e.autor))
            .filter((e) => matchPara(e.para, filtroPara))
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
  }, [vaultRoot, pessoaAtiva, filtro, ymdOverride, filtroPara, tick]);

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
