// Hook agregador do Recap (M36). Le todo o Vault dentro de um periodo
// {de, ate} e devolve 5 listas: conquistas, crises, evolucoes,
// tarefas concluidas (detalhe) e numeros agregados.
//
// Tom esperancoso (ADR-0005, sem gamificacao): nenhum campo de
// pontuacao, nenhuma celebracao no schema. Frases sao construidas na
// camada de UI usando vocabulario neutro.
//
// Filtro de tarefas no periodo: feito === true && feito_em in [de, ate].
// Pendentes sao ignoradas (Recap e retrospectiva, nao to-do).
//
// Sem cache: cada abertura le tudo. Vault pequeno (semanas) e
// instantaneo; ano pode levar 1-3s e o caller mostra OuroborosLoader.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useMemo, useState } from 'react';
import { useVault } from '@/lib/stores/vault';
import { listarHumor } from '@/lib/vault/humor';
import { listarDiarios } from '@/lib/vault/diario';
import { listarEventos } from '@/lib/vault/eventos';
import { listarMarcos } from '@/lib/vault/marcos';
import { listarContadores } from '@/lib/vault/contadores';
import { listarTreinos } from '@/lib/vault/treinos';
import { listarTarefas } from '@/lib/vault/tarefas';
import { diasEntre } from '@/lib/util/diasEntre';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';
import type { Marco } from '@/lib/schemas/marco';
import type { Contador } from '@/lib/schemas/contador';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';
import type { Tarefa } from '@/lib/schemas/tarefa';
import {
  TAREFA_CATEGORIA_LABELS,
  type TarefaCategoria,
} from '@/lib/schemas/tarefa';

// Periodos canonicos do recap. 'personalizado' exige caller fornecer
// {de, ate} explicitos (resolverPeriodo entao identidade).
export type PeriodoChave = 'semana' | 'mes' | 'ano' | 'personalizado';

export interface PeriodoRange {
  de: Date;
  ate: Date;
}

// Calcula range de datas {de, ate} a partir de uma chave canonica.
// Para 'personalizado' o caller passa o range diretamente; resolver
// nesse caso seria identidade (nao usado aqui).
//
// Convencoes:
//  - semana: ultimos 7 dias completos (hoje inclusive).
//  - mes: ultimos 30 dias completos (hoje inclusive).
//  - ano: ultimos 365 dias completos (hoje inclusive).
//
// Decisao M36: ranges relativos a "agora" e nao calendario civil
// (semana ISO, mes calendario). Mais previsivel para retrospectiva
// curta ("ultimos 7 dias") do que "esta semana corrente que comecou
// na segunda".
export function resolverPeriodo(
  chave: PeriodoChave,
  agora: Date = new Date(),
  custom?: PeriodoRange
): PeriodoRange {
  if (chave === 'personalizado') {
    if (!custom) {
      throw new Error("periodo 'personalizado' exige range custom");
    }
    return custom;
  }
  const ate = agora;
  const de = new Date(agora);
  const dias = chave === 'semana' ? 7 : chave === 'mes' ? 30 : 365;
  de.setDate(de.getDate() - dias + 1);
  de.setHours(0, 0, 0, 0);
  return { de, ate };
}

// Item generico de conquista no Recap. Origem identifica o tipo de
// dado para a UI escolher icone (vitoria=heart, marco=trophy,
// contador=hash, tarefa=check).
export interface ConquistaItem {
  id: string;
  origem:
    | 'diario_vitoria'
    | 'evento_positivo'
    | 'marco'
    | 'contador_sequencia'
    | 'tarefa_concluida';
  data: string;
  frase: string;
}

// Item de crise (origem trigger ou evento negativo).
export interface CriseItem {
  id: string;
  origem: 'diario_trigger' | 'evento_negativo';
  data: string;
  intensidade: number;
  frase: string;
}

// Item de reflexao (modo contemplativo do diario emocional, G2/G2.1).
// Sem polaridade — nao entra em conquistas nem crises.
export interface ReflexaoItem {
  id: string;
  data: string;
  intensidade: number;
  frase: string;
}

// Item de evolucao positiva mensuravel.
export interface EvolucaoItem {
  id: string;
  rotulo: string;
  detalhe: string;
}

// Detalhe de tarefa concluida no periodo.
export interface TarefaConcluidaItem {
  id: string;
  titulo: string;
  categoria: TarefaCategoria;
  feito_em: string;
}

// Numeros agregados (grid 2x3 da seção Numeros).
export interface NumerosRecap {
  registros: number;
  treinos: number;
  fotos: number;
  eventos_positivos: number;
  eventos_negativos: number;
  tarefas_concluidas: number;
}

export interface RecapData {
  conquistas: ConquistaItem[];
  crises: CriseItem[];
  reflexoes: ReflexaoItem[];
  evolucoes: EvolucaoItem[];
  tarefasConcluidas: TarefaConcluidaItem[];
  numeros: NumerosRecap;
}

export interface UseRecapResult {
  data: RecapData | null;
  loading: boolean;
}

// Predicado helper: ISO datetime ou data YYYY-MM-DD esta dentro do
// range. Trata data simples como meio-dia local para evitar drift
// de fuso (humor diario nao tem hora).
function dentroDoPeriodo(isoOuYmd: string, de: Date, ate: Date): boolean {
  const date = isoOuYmd.includes('T')
    ? new Date(isoOuYmd)
    : new Date(`${isoOuYmd}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= de.getTime() && date.getTime() <= ate.getTime();
}

// Conta fotos contidas em diarios e eventos do periodo. Heuristica:
// midia.tipo === 'foto'. Frases (tipo='frase') e audios nao contam.
function contarFotos(
  diarios: DiarioEmocionalMeta[],
  eventos: EventoMeta[]
): number {
  let total = 0;
  for (const d of diarios) {
    for (const m of d.midia) {
      if (m.tipo === 'foto') total += 1;
    }
  }
  for (const e of eventos) {
    for (const m of e.midia) {
      if (m.tipo === 'foto') total += 1;
    }
  }
  return total;
}

// Constroi frase neutra para tarefa concluida usada em ConquistaItem.
function fraseTarefa(t: Tarefa): string {
  const cat = TAREFA_CATEGORIA_LABELS[t.categoria] ?? 'Outro';
  return `${t.titulo} — ${cat.toLowerCase()}`;
}

// Trunca uma frase preservando palavras inteiras quando possivel.
function truncar(texto: string, max: number): string {
  const limpo = texto.trim().replace(/\s+/g, ' ');
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max);
  const espaco = corte.lastIndexOf(' ');
  return espaco > max * 0.5 ? `${corte.slice(0, espaco)}...` : `${corte}...`;
}

// Funcao pura testavel: agrega RecapData a partir das listas brutas
// e do range. Caller (hook ou teste) e responsavel por carregar as
// listas via helpers do vault.
export function agregarRecap(input: {
  humor: HumorMeta[];
  diarios: DiarioEmocionalMeta[];
  eventos: EventoMeta[];
  marcos: Marco[];
  contadores: Contador[];
  treinos: TreinoSessao[];
  tarefas: { meta: Tarefa; rel: string }[];
  de: Date;
  ate: Date;
  agora?: Date;
}): RecapData {
  const {
    humor,
    diarios,
    eventos,
    marcos,
    contadores,
    treinos,
    tarefas,
    de,
    ate,
  } = input;
  const agora = input.agora ?? new Date();

  // Filtros por periodo.
  const humorFiltrado = humor.filter((h) => dentroDoPeriodo(h.data, de, ate));
  const diariosFiltrados = diarios.filter((d) =>
    dentroDoPeriodo(d.data, de, ate)
  );
  const eventosFiltrados = eventos.filter((e) =>
    dentroDoPeriodo(e.data, de, ate)
  );
  const marcosFiltrados = marcos.filter((m) =>
    dentroDoPeriodo(m.data, de, ate)
  );
  const treinosFiltrados = treinos.filter((t) =>
    dentroDoPeriodo(t.data, de, ate)
  );
  const tarefasFiltradas = tarefas.filter(
    ({ meta }) =>
      meta.feito && meta.feito_em && dentroDoPeriodo(meta.feito_em, de, ate)
  );

  // Conquistas: conquistas do diario + eventos positivos + marcos +
  // contadores em sequencia (>=7 dias atuais) + tarefas concluidas.
  // R0: modo canonico 'conquista' (legado 'vitoria' aceito em leitura
  // do Vault via z.preprocess; campo `origem` mantem id estavel
  // 'diario_vitoria' para nao quebrar consumidores existentes —
  // refator do id e sprint separada na Onda R).
  const conquistas: ConquistaItem[] = [];
  for (const d of diariosFiltrados) {
    if (d.modo === 'conquista') {
      conquistas.push({
        id: `diario_vitoria:${d.data}:${d.autor}`,
        origem: 'diario_vitoria',
        data: d.data,
        frase: truncar(d.texto || 'Conquista sem descrição.', 120),
      });
    }
  }
  for (const e of eventosFiltrados) {
    if (e.modo === 'positivo') {
      const rotulo = [e.categoria, e.bairro, e.lugar]
        .filter(Boolean)
        .join(' — ');
      conquistas.push({
        id: `evento_positivo:${e.data}:${e.autor}`,
        origem: 'evento_positivo',
        data: e.data,
        frase: truncar(rotulo || 'Momento registrado.', 120),
      });
    }
  }
  for (const m of marcosFiltrados) {
    conquistas.push({
      id: `marco:${m.data}:${m.autor}`,
      origem: 'marco',
      data: m.data,
      frase: truncar(m.descricao, 120),
    });
  }
  // Contadores: nao tem campo de data filtravel; usamos os ativos hoje
  // com sequencia >=7 dias (ADR-0005 nao celebra; mostramos so
  // continuidade objetiva). Se sequencia atual < 7, ignora.
  for (const c of contadores) {
    const dias = diasEntre(c.inicio, agora);
    if (dias >= 7) {
      conquistas.push({
        id: `contador:${c.slug}`,
        origem: 'contador_sequencia',
        data: c.inicio,
        frase: `${c.titulo} — ${dias} dias em sequência.`,
      });
    }
  }
  for (const { meta } of tarefasFiltradas) {
    conquistas.push({
      id: `tarefa:${meta.data}:${meta.titulo}`,
      origem: 'tarefa_concluida',
      data: meta.feito_em ?? meta.data,
      frase: truncar(fraseTarefa(meta), 120),
    });
  }
  conquistas.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  // Crises: gatilhos do diario (todos) + eventos negativos.
  // Ordenacao por intensidade desc; empate vira data desc.
  // R0: modo canonico 'gatilho' (legado 'trigger' aceito em leitura
  // do Vault via z.preprocess; campo `origem` mantem id estavel
  // 'diario_trigger' para preservar contrato cross-platform).
  const crises: CriseItem[] = [];
  for (const d of diariosFiltrados) {
    if (d.modo === 'gatilho') {
      crises.push({
        id: `diario_trigger:${d.data}:${d.autor}`,
        origem: 'diario_trigger',
        data: d.data,
        intensidade: d.intensidade,
        frase: truncar(d.texto || 'Momento difícil registrado.', 120),
      });
    }
  }
  for (const e of eventosFiltrados) {
    if (e.modo === 'negativo') {
      const rotulo = [e.categoria, e.bairro, e.lugar]
        .filter(Boolean)
        .join(' — ');
      crises.push({
        id: `evento_negativo:${e.data}:${e.autor}`,
        origem: 'evento_negativo',
        data: e.data,
        intensidade: e.intensidade,
        frase: truncar(rotulo || 'Evento difícil registrado.', 120),
      });
    }
  }
  crises.sort((a, b) => {
    if (a.intensidade !== b.intensidade) return b.intensidade - a.intensidade;
    return a.data < b.data ? 1 : -1;
  });

  // Reflexoes (G2.1): modo 'reflexao' do diario emocional. Lista
  // paralela a conquistas/crises, sem polaridade. Ordenacao por data
  // desc (mais recente primeiro).
  const reflexoes: ReflexaoItem[] = [];
  for (const d of diariosFiltrados) {
    if (d.modo === 'reflexao') {
      reflexoes.push({
        id: `diario_reflexao:${d.data}:${d.autor}`,
        data: d.data,
        intensidade: d.intensidade,
        frase: truncar(d.texto || 'Reflexão sem descrição.', 120),
      });
    }
  }
  reflexoes.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  // Evolucoes: delta humor (media), treinos no periodo, contadores em
  // alta (sequencia >= 30 dias).
  const evolucoes: EvolucaoItem[] = [];
  if (humorFiltrado.length >= 2) {
    const media =
      humorFiltrado.reduce((acc, h) => acc + h.humor, 0) / humorFiltrado.length;
    evolucoes.push({
      id: 'evolucao:humor_medio',
      rotulo: 'Humor médio no período',
      detalhe: `${media.toFixed(1)} de 5 — em ${humorFiltrado.length} registros.`,
    });
  }
  if (treinosFiltrados.length > 0) {
    const minutos = treinosFiltrados.reduce((acc, t) => acc + t.duracao_min, 0);
    evolucoes.push({
      id: 'evolucao:treinos',
      rotulo: 'Treinos concluídos',
      detalhe: `${treinosFiltrados.length} sessões — ${minutos} minutos no total.`,
    });
  }
  for (const c of contadores) {
    const dias = diasEntre(c.inicio, agora);
    if (dias >= 30) {
      evolucoes.push({
        id: `evolucao:contador:${c.slug}`,
        rotulo: c.titulo,
        detalhe: `${dias} dias em sequência (recorde: ${c.recorde}).`,
      });
    }
  }

  // Tarefas concluidas (detalhe). Ordenacao por feito_em desc.
  const tarefasConcluidas: TarefaConcluidaItem[] = tarefasFiltradas.map(
    ({ meta }) => ({
      id: `tarefa:${meta.feito_em}:${meta.titulo}`,
      titulo: meta.titulo,
      categoria: meta.categoria,
      feito_em: meta.feito_em as string,
    })
  );
  tarefasConcluidas.sort((a, b) => (a.feito_em < b.feito_em ? 1 : -1));

  // Numeros agregados.
  const eventosPositivos = eventosFiltrados.filter(
    (e) => e.modo === 'positivo'
  ).length;
  const eventosNegativos = eventosFiltrados.filter(
    (e) => e.modo === 'negativo'
  ).length;
  const fotos = contarFotos(diariosFiltrados, eventosFiltrados);
  const totalRegistros =
    humorFiltrado.length +
    diariosFiltrados.length +
    eventosFiltrados.length +
    marcosFiltrados.length +
    treinosFiltrados.length +
    tarefasFiltradas.length;

  const numeros: NumerosRecap = {
    registros: totalRegistros,
    treinos: treinosFiltrados.length,
    fotos,
    eventos_positivos: eventosPositivos,
    eventos_negativos: eventosNegativos,
    tarefas_concluidas: tarefasFiltradas.length,
  };

  return {
    conquistas,
    crises,
    reflexoes,
    evolucoes,
    tarefasConcluidas,
    numeros,
  };
}

// Hook publico do Recap. Recebe range explicito {de, ate}; caller
// resolve via resolverPeriodo() ou date pickers (Personalizado).
//
// useEffect dispara fetch quando vaultRoot ou range muda. O state
// loading vira false depois que todas as listas resolverem (Promise.all).
export function useRecap(range: PeriodoRange): UseRecapResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Usamos getTime() para evitar re-renders desnecessarios quando o
  // caller passa um Date novo com mesmo timestamp.
  const deMs = range.de.getTime();
  const ateMs = range.ate.getTime();

  useEffect(() => {
    if (!vaultRoot) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelado = false;
    setLoading(true);

    (async () => {
      try {
        const [humor, diarios, eventos, marcos, contadores, treinos, tarefas] =
          await Promise.all([
            listarHumor(vaultRoot),
            listarDiarios(vaultRoot),
            listarEventos(vaultRoot),
            listarMarcos(vaultRoot),
            listarContadores(vaultRoot),
            listarTreinos(vaultRoot),
            listarTarefas(vaultRoot),
          ]);
        if (cancelado) return;
        const agregado = agregarRecap({
          humor,
          diarios,
          eventos,
          marcos,
          contadores,
          treinos,
          tarefas,
          de: new Date(deMs),
          ate: new Date(ateMs),
        });
        setData(agregado);
      } catch {
        // Falha de leitura: devolve dataset vazio para a UI mostrar
        // empty state sem crashar.
        if (!cancelado) {
          setData({
            conquistas: [],
            crises: [],
            reflexoes: [],
            evolucoes: [],
            tarefasConcluidas: [],
            numeros: {
              registros: 0,
              treinos: 0,
              fotos: 0,
              eventos_positivos: 0,
              eventos_negativos: 0,
              tarefas_concluidas: 0,
            },
          });
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [vaultRoot, deMs, ateMs]);

  return useMemo(() => ({ data, loading }), [data, loading]);
}
