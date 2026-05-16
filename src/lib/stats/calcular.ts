// Calculador puro de stats agregadas (R-VAULT-CANONICAL-COMPLETE-B).
//
// Le listas brutas do Vault (humor, diario, eventos, marcos, contadores,
// tarefas) ja deserializadas e devolve um snapshot EstadoStatsAgregadas
// pronto para escrita em vault/_estado/stats-<periodo>-<deviceId>.md.
//
// Tudo aqui e funcao pura testavel em isolamento (sem I/O, sem
// global state). Caller (escreverStats) faz a leitura e injeta as
// listas.
//
// Por que separar de useRecap.ts/agregarRecap?
//  - useRecap entrega RecapData com frases truncadas para UI. Stats
//    sao numeros agregados sem texto. Acoplamento diferente.
//  - useRecap usa range arbitrario {de, ate}. Stats usa periodos
//    canonicos fixos ('7d'/'30d'/'90d'/'all').
//  - Resultado de Stats e gravado no Vault e consumido pelo sibling
//    Python; RecapData fica em memoria efemera.
//
// Top-5 determinismo:
//  - Sort por n desc; empate -> chave ASC (localeCompare PT-BR
//    sensitivity:'base'). Garante mesma ordem em qualquer device
//    sincronizado pelo Syncthing.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  EstadoStatsAgregadas,
  PeriodoStats,
  TopItem,
} from '@/lib/schemas/vault_estado';
import { ESTADO_SCHEMA_VERSION } from '@/lib/schemas/vault_estado';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';
import type { Marco } from '@/lib/schemas/marco';
import type { Contador } from '@/lib/schemas/contador';
import type { Tarefa } from '@/lib/schemas/tarefa';
import { diasEntre } from '@/lib/util/diasEntre';

// Predicado helper: ISO datetime ou data YYYY-MM-DD esta dentro do
// recorte [agora - dias, agora]. Trata data simples como meio-dia
// local para evitar drift de fuso.
function dentroUltimosDias(isoOuYmd: string, dias: number, agora: Date): boolean {
  const date = isoOuYmd.includes('T')
    ? new Date(isoOuYmd)
    : new Date(`${isoOuYmd}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return false;
  const ms = agora.getTime() - date.getTime();
  const diasDecorridos = ms / 86_400_000;
  return diasDecorridos >= 0 && diasDecorridos <= dias;
}

// Media simples com 2 casas decimais. Devolve null quando lista vazia
// (significa "nao ha registro no periodo", sibling deve renderizar
// como dado ausente, nao zero).
function mediaHumor(humor: HumorMeta[]): number | null {
  if (humor.length === 0) return null;
  const soma = humor.reduce((acc, h) => acc + h.humor, 0);
  return Math.round((soma / humor.length) * 100) / 100;
}

// Filtra humor pelos ultimos N dias.
function filtrarHumor(
  humor: HumorMeta[],
  dias: number,
  agora: Date
): HumorMeta[] {
  return humor.filter((h) => dentroUltimosDias(h.data, dias, agora));
}

// Ordenacao estavel para topN: n desc; empate -> chave ASC.
// localeCompare PT-BR sensitivity:'base' iguala maiusculo/minusculo e
// acento, garantindo ordem unica para a mesma lista entre devices.
function ordenarTop(items: TopItem[]): TopItem[] {
  return items.slice().sort((a, b) => {
    if (a.n !== b.n) return b.n - a.n;
    return a.chave.localeCompare(b.chave, 'pt-BR', { sensitivity: 'base' });
  });
}

// Conta ocorrencias em record. Helper reduz duplicacao entre top
// gatilhos e top conquistas.
function contagemPorChave(chaves: string[]): Record<string, number> {
  const conta: Record<string, number> = {};
  for (const c of chaves) {
    conta[c] = (conta[c] ?? 0) + 1;
  }
  return conta;
}

// Converte record em lista de TopItem ordenada e cortada em 5.
function topNDe(record: Record<string, number>, n: number = 5): TopItem[] {
  const items: TopItem[] = Object.entries(record).map(([chave, count]) => ({
    chave,
    n: count,
  }));
  return ordenarTop(items).slice(0, n);
}

// Conta diario por modo dentro do periodo.
function contarDiariosPorModo(
  diarios: DiarioEmocionalMeta[],
  dias: number | null,
  agora: Date
): { gatilho: number; conquista: number; reflexao: number } {
  const filtrados =
    dias === null
      ? diarios
      : diarios.filter((d) => dentroUltimosDias(d.data, dias, agora));
  let gatilho = 0;
  let conquista = 0;
  let reflexao = 0;
  for (const d of filtrados) {
    if (d.modo === 'gatilho') gatilho += 1;
    else if (d.modo === 'conquista') conquista += 1;
    else if (d.modo === 'reflexao') reflexao += 1;
  }
  return { gatilho, conquista, reflexao };
}

// Conta eventos por modo no periodo.
function contarEventosPorModo(
  eventos: EventoMeta[],
  dias: number | null,
  agora: Date
): { positivo: number; negativo: number } {
  const filtrados =
    dias === null
      ? eventos
      : eventos.filter((e) => dentroUltimosDias(e.data, dias, agora));
  let positivo = 0;
  let negativo = 0;
  for (const e of filtrados) {
    if (e.modo === 'positivo') positivo += 1;
    else if (e.modo === 'negativo') negativo += 1;
  }
  return { positivo, negativo };
}

// Numero de dias do periodo. 'all' = null (sem filtro temporal).
export function diasDoPeriodo(periodo: PeriodoStats): number | null {
  if (periodo === '7d') return 7;
  if (periodo === '30d') return 30;
  if (periodo === '90d') return 90;
  return null;
}

// Input do calculador. Caller (escreverStats) injeta listas ja lidas
// do Vault. Testes podem passar fixtures sinteticas.
export interface CalcularInput {
  humor: HumorMeta[];
  diarios: DiarioEmocionalMeta[];
  eventos: EventoMeta[];
  marcos: Marco[];
  contadores: Contador[];
  tarefas: { meta: Tarefa; rel: string }[];
  periodo: PeriodoStats;
  agora?: Date;
}

// Funcao publica. Pura: nao toca I/O, nao depende de Date.now (usa
// agora injetado). Determina:
//
//  1. humorMedio para os 4 horizontes (7d/30d/90d/all).
//  2. countPorTipo dentro do periodo solicitado.
//  3. streaksAtuais para todos os contadores com dias >= 1.
//  4. topGatilhosUltimos90d (emocoes de diario_gatilho nos ultimos
//     90 dias, top 5).
//  5. topConquistas (origens de conquista no periodo solicitado,
//     top 5).
//  6. ultimaAtualizacao = agora.toISOString().
//  7. atualizadoEm = agora.toISOString() (carimbo canonico do schema).
export function calcularStatsAgregadas(
  input: CalcularInput
): EstadoStatsAgregadas {
  const agora = input.agora ?? new Date();
  const dias = diasDoPeriodo(input.periodo);

  // ===== Medias de humor para os 4 horizontes =====
  // Cada horizonte tem sua propria media. countPorTipo so usa o
  // periodo solicitado, mas humorMedio* expoe os 4 sempre (sibling
  // Python pode plotar trend sem ter que reler).
  const humor7d = filtrarHumor(input.humor, 7, agora);
  const humor30d = filtrarHumor(input.humor, 30, agora);
  const humor90d = filtrarHumor(input.humor, 90, agora);
  const humorAll = input.humor;

  const humorMedio7d = mediaHumor(humor7d);
  const humorMedio30d = mediaHumor(humor30d);
  const humorMedio90d = mediaHumor(humor90d);
  const humorMedioAll = mediaHumor(humorAll);

  // ===== countPorTipo (no periodo solicitado) =====
  // Chaves canonicas declaradas no contrato (vault_estado.ts):
  //   'humor', 'diario_gatilho', 'diario_conquista', 'diario_reflexao',
  //   'marco', 'evento_positivo', 'evento_negativo', 'contador',
  //   'tarefa_concluida'.
  const humorFiltrado =
    dias === null ? input.humor : filtrarHumor(input.humor, dias, agora);
  const diarioCount = contarDiariosPorModo(input.diarios, dias, agora);
  const eventoCount = contarEventosPorModo(input.eventos, dias, agora);
  const marcosFiltrados =
    dias === null
      ? input.marcos
      : input.marcos.filter((m) => dentroUltimosDias(m.data, dias, agora));
  const tarefasFiltradas =
    dias === null
      ? input.tarefas.filter(({ meta }) => meta.feito === true)
      : input.tarefas.filter(
          ({ meta }) =>
            meta.feito === true &&
            meta.feito_em != null &&
            dentroUltimosDias(meta.feito_em, dias, agora)
        );

  const countPorTipo: Record<string, number> = {
    humor: humorFiltrado.length,
    diario_gatilho: diarioCount.gatilho,
    diario_conquista: diarioCount.conquista,
    diario_reflexao: diarioCount.reflexao,
    marco: marcosFiltrados.length,
    evento_positivo: eventoCount.positivo,
    evento_negativo: eventoCount.negativo,
    contador: input.contadores.length,
    tarefa_concluida: tarefasFiltradas.length,
  };

  // ===== streaksAtuais =====
  // Slug -> diasEntre(inicio, agora). So inclui contadores com dias
  // >= 1 (contador novo ainda nao "tem" streak). Sort por slug ASC
  // para determinismo no .md (record key order em JS preserva
  // insertion order pos-ES2015).
  const streaksOrdenados = input.contadores
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug, 'pt-BR', { sensitivity: 'base' }));
  const streaksAtuais: Record<string, number> = {};
  for (const c of streaksOrdenados) {
    const d = diasEntre(c.inicio, agora);
    if (d >= 1) {
      streaksAtuais[c.slug] = d;
    }
  }

  // ===== topGatilhosUltimos90d =====
  // Recorte fixo de 90 dias para ter base estatistica razoavel mesmo
  // quando o periodo solicitado e '7d'. Top 5 chaves por frequencia
  // de emocao em diario.modo='gatilho'.
  const diariosUltimos90 = input.diarios.filter((d) =>
    dentroUltimosDias(d.data, 90, agora)
  );
  const emocoesGatilho: string[] = [];
  for (const d of diariosUltimos90) {
    if (d.modo === 'gatilho') {
      for (const e of d.emocoes) {
        emocoesGatilho.push(e);
      }
    }
  }
  const topGatilhosUltimos90d = topNDe(contagemPorChave(emocoesGatilho), 5);

  // ===== topConquistas =====
  // Origens canonicas (mesmo vocabulario de useRecap.ConquistaItem):
  //   'diario_vitoria' (modo='conquista' do diario emocional)
  //   'evento_positivo'
  //   'marco'
  //   'tarefa_concluida'
  // Conta no periodo solicitado.
  const origensConquista: string[] = [];
  const diariosFiltradosPeriodo =
    dias === null
      ? input.diarios
      : input.diarios.filter((d) => dentroUltimosDias(d.data, dias, agora));
  const eventosFiltradosPeriodo =
    dias === null
      ? input.eventos
      : input.eventos.filter((e) => dentroUltimosDias(e.data, dias, agora));
  for (const d of diariosFiltradosPeriodo) {
    if (d.modo === 'conquista') origensConquista.push('diario_vitoria');
  }
  for (const e of eventosFiltradosPeriodo) {
    if (e.modo === 'positivo') origensConquista.push('evento_positivo');
  }
  for (const _m of marcosFiltrados) {
    origensConquista.push('marco');
  }
  for (const _t of tarefasFiltradas) {
    origensConquista.push('tarefa_concluida');
  }
  const topConquistas = topNDe(contagemPorChave(origensConquista), 5);

  const iso = agora.toISOString();
  return {
    version: ESTADO_SCHEMA_VERSION,
    periodo: input.periodo,
    humorMedio7d,
    humorMedio30d,
    humorMedio90d,
    humorMedioAll,
    countPorTipo,
    streaksAtuais,
    topGatilhosUltimos90d,
    topConquistas,
    ultimaAtualizacao: iso,
    atualizadoEm: iso,
  };
}
