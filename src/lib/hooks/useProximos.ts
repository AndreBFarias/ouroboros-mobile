// Hook agregador "proximos" da Tela 01 v2 (M40). Combina duas
// fontes:
//  1. Alarmes pessoais (M16/M30) cujo proximo disparo cai nas
//     proximas 4h a partir de agora.
//  2. Tarefas (M17/M31) com alarme vinculado ativo e data_hora_iso
//     no dia de hoje (independente de feita ou pendente; a UI pode
//     decidir riscar feitas).
//
// Ordenado cronologicamente. Cada item carrega `tipo` para a UI
// rotular icone/cor.
//
// Sem julgamento, sem priorizacao automatica (ADR-0005). Apenas
// "o que esta vindo nas proximas horas".
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState, useCallback } from 'react';
import { listarAlarmes } from '@/lib/vault/alarmes';
import { listarTarefas } from '@/lib/vault/tarefas';
import type { Alarme } from '@/lib/schemas/alarme';
import type { Tarefa } from '@/lib/schemas/tarefa';
import { useVault } from '@/lib/stores/vault';

export type ProximoTipo = 'alarme' | 'tarefa';

export interface ItemProximo {
  tipo: ProximoTipo;
  // Identificador estavel para key em lista. Para alarmes e o slug.
  // Para tarefas e o path relativo.
  id: string;
  // Texto exibido (titulo do alarme ou da tarefa).
  titulo: string;
  // HH:MM 24h a exibir a esquerda.
  hora: string;
  // Instante absoluto ISO usado para ordenacao cronologica. Pode ser
  // hoje (alarme proximo) ou hoje em qualquer hora (tarefa do dia).
  iso: string;
  // Para tarefa: indica se ja foi feita (UI pode riscar).
  feita?: boolean;
}

export interface ProximosData {
  itens: ItemProximo[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Janela de 4h em milissegundos.
const JANELA_MS = 4 * 60 * 60 * 1000;

// Constroi ISO datetime com offset -03:00 (fuso canonico do projeto)
// a partir de componentes de data hora. Usar offset fixo evita drift
// quando o ambiente jest roda em UTC mas os arquivos do Vault sempre
// trazem offset BRT.
function isoLocalBRT(
  ano: number,
  mes: number,
  dia: number,
  hh: number,
  mm: number
): string {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${ano}-${pad2(mes)}-${pad2(dia)}T${pad2(hh)}:${pad2(mm)}:00-03:00`;
}

// Devolve componentes locais de uma Date interpretada em -03:00,
// independente do TZ do host (jest roda UTC; produção roda BRT).
function partesLocaisBRT(d: Date): {
  ano: number;
  mes: number;
  dia: number;
  hh: number;
  mm: number;
  dow: number;
} {
  // Subtrai 3h em ms para representar relogio local de Sao Paulo
  // sem feriados/DST (BRT desde 2019 nao adota horario de verao).
  const local = new Date(d.getTime() + -180 * 60_000);
  return {
    ano: local.getUTCFullYear(),
    mes: local.getUTCMonth() + 1,
    dia: local.getUTCDate(),
    hh: local.getUTCHours(),
    mm: local.getUTCMinutes(),
    dow: local.getUTCDay(),
  };
}

// Calcula proximo disparo do alarme a partir de agora considerando
// recorrencia. Devolve ISO datetime BRT (-03:00) ou null quando nao
// ha disparo plausivel.
//
// Logica conservadora:
//  - 'unica'  : usa data_unica direto.
//  - 'diaria' : monta hoje as HH:MM no fuso BRT; se ja passou, amanha.
//  - 'semanal': pega o proximo dia da semana em dias_semana.
//  - 'mensal' : aproximacao identica a diaria mas com mes seguinte.
function proximoDisparo(alarme: Alarme, agora: Date): string | null {
  if (!alarme.ativo) return null;
  const [hh, mm] = alarme.horario.split(':').map((s) => parseInt(s, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  if (alarme.recorrencia === 'unica') {
    return alarme.data_unica ?? null;
  }

  if (alarme.recorrencia === 'diaria') {
    for (let offset = 0; offset < 2; offset++) {
      const base = new Date(agora.getTime() + offset * 24 * 60 * 60_000);
      const p = partesLocaisBRT(base);
      const candidatoIso = isoLocalBRT(p.ano, p.mes, p.dia, hh, mm);
      if (new Date(candidatoIso).getTime() >= agora.getTime()) {
        return candidatoIso;
      }
    }
    return null;
  }

  if (alarme.recorrencia === 'semanal') {
    if (alarme.dias_semana.length === 0) return null;
    for (let offset = 0; offset < 8; offset++) {
      const base = new Date(agora.getTime() + offset * 24 * 60 * 60_000);
      const p = partesLocaisBRT(base);
      if (!alarme.dias_semana.includes(p.dow)) continue;
      const candidatoIso = isoLocalBRT(p.ano, p.mes, p.dia, hh, mm);
      if (new Date(candidatoIso).getTime() >= agora.getTime()) {
        return candidatoIso;
      }
    }
    return null;
  }

  if (alarme.recorrencia === 'mensal') {
    for (let offset = 0; offset < 2; offset++) {
      const p = partesLocaisBRT(agora);
      const mesAlvo = p.mes + offset;
      const anoAlvo = p.ano + (mesAlvo > 12 ? 1 : 0);
      const mesNorm = ((mesAlvo - 1) % 12) + 1;
      const candidatoIso = isoLocalBRT(anoAlvo, mesNorm, p.dia, hh, mm);
      if (new Date(candidatoIso).getTime() >= agora.getTime()) {
        return candidatoIso;
      }
    }
    return null;
  }

  return null;
}

// Hora HH:MM extraida de ISO datetime local (assumimos offset BRT
// embutido). Para exibicao apenas.
function horaDeIso(iso: string): string {
  // ISO traz '...T14:30:00-03:00'. Pegamos chars 11..16.
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '--:--';
}

// YYYY-MM-DD da data atual em UTC-3 (alinhado com formatYmdLocal de
// useHoje).
function ymdHoje(agora: Date): string {
  const local = new Date(agora.getTime() + -180 * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Construtor puro (testavel sem mock de Vault). Recebe alarmes ja
// listados, tarefas ja listadas e timestamp de referencia, devolve
// itens ordenados.
export function construirProximos(
  alarmes: Alarme[],
  tarefas: { meta: Tarefa; rel: string }[],
  agora: Date
): ItemProximo[] {
  const itens: ItemProximo[] = [];
  const limiteSuperior = new Date(agora.getTime() + JANELA_MS);

  for (const alarme of alarmes) {
    const iso = proximoDisparo(alarme, agora);
    if (!iso) continue;
    const data = new Date(iso);
    if (data < agora) continue;
    if (data > limiteSuperior) continue;
    itens.push({
      tipo: 'alarme',
      id: alarme.slug,
      titulo: alarme.titulo,
      hora: horaDeIso(iso),
      iso,
    });
  }

  const ymd = ymdHoje(agora);
  for (const t of tarefas) {
    const alarme = t.meta.alarme;
    if (!alarme || !alarme.ativo || !alarme.data_hora_iso) continue;
    // So entra se o disparo cai hoje (mesmo ymd local).
    const data = new Date(alarme.data_hora_iso);
    const ymdAlarme = ymdHoje(data);
    if (ymdAlarme !== ymd) continue;
    itens.push({
      tipo: 'tarefa',
      id: t.rel,
      titulo: t.meta.titulo,
      hora: horaDeIso(alarme.data_hora_iso),
      iso: alarme.data_hora_iso,
      feita: t.meta.feito,
    });
  }

  itens.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
  return itens;
}

export function useProximos(): ProximosData {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [itens, setItens] = useState<ItemProximo[]>([]);
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

    (async () => {
      try {
        const [alarmes, tarefas] = await Promise.all([
          listarAlarmes(vaultRoot),
          listarTarefas(vaultRoot),
        ]);
        if (cancelled) return;
        setItens(construirProximos(alarmes, tarefas, new Date()));
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
  }, [vaultRoot, tick]);

  return { itens, loading, error, reload };
}

// Exporto helpers internos para testes unitarios sem Vault real.
export const __test__ = { proximoDisparo, horaDeIso, ymdHoje, JANELA_MS };
