// Helpers puros para marcacao rapida de Rotina (R-SF-3,
// M-SAUDE-FISICA-MARCACAO-RAPIDA-MED).
//
// Caso primario: dono marca "Venvanse" em 1 tap. Cada tap registra
// timestamp ISO; agregamos por dia em arquivos
// markdown/rotina-marcacao-<slug>-<YYYY-MM-DD>.md.
//
// Este modulo concentra a logica pura (sem IO, sem React):
//  - appendMarcacao: garante ordenacao crescente, idempotencia por ts
//    e cap MAX_MARCACOES_DIA.
//  - calcularTimeline: ultimas 7 ocorrencias em ordem reversa para
//    exibicao na tela de detalhe (mais recente primeiro).
//  - calcularAderenciaSemanal: percentual 0..100 de dias com pelo
//    menos 1 marcacao na janela de 7 dias (default) a partir de uma
//    data ancora (default agora). Util pra microcopy "5 de 7 dias
//    (71%)".
//  - calcularSilenciarLembreteAte: instante final do dia local
//    (TZ -03:00 fixa, fuso canonico do projeto - alinhado com
//    paths.ts/formatDateYmd).
//  - estaLembreteSilenciado: helper de checagem com agora opcional
//    para tests deterministicos.
//
// Diferenca para R-ROT-1-A/B: aqui o silenciamento e por DIA (lembrete
// suprimido ate fim do dia local), nao por 30 dias. A semantica e
// "ja marquei hoje, nao precisa lembrar de novo hoje".
//
// Comentarios sem acento (convencao shell/CI).
import type { RotinaMarcacao } from '@/lib/schemas/rotina_marcacao';
import { MAX_MARCACOES_DIA } from '@/lib/schemas/rotina_marcacao';

const DIA_MS = 24 * 60 * 60 * 1000;

// Fuso fixo do projeto (Sao Paulo UTC-3 sem DST desde 2019). Alinhado
// com src/lib/vault/paths.ts. Importar de paths.ts criaria ciclo de
// dependencia (paths -> reader -> writer -> ...); duplicamos a
// constante aqui pela natureza pura deste modulo.
const TZ_OFFSET_MIN = -180;
const TZ_SHIFT_MS = TZ_OFFSET_MIN * 60_000;

function toSaoPauloUtc(d: Date): Date {
  return new Date(d.getTime() + TZ_SHIFT_MS);
}

// Janela canonica de aderencia semanal.
export const JANELA_ADERENCIA_DIAS = 7;
// Quantidade default de entradas exibidas na timeline.
export const TIMELINE_TAMANHO_DEFAULT = 7;

// =====================================================================
// Append idempotente
// =====================================================================

// Acrescenta um novo timestamp ISO a uma lista existente, mantendo
// ordenacao crescente e descartando duplicatas exatas (mesmo ts ja
// presente vira no-op). Respeita cap MAX_MARCACOES_DIA: quando
// ultrapassa, descarta as MAIS ANTIGAS para preservar o registro
// recente (FIFO).
//
// Decisao: comparacao por igualdade de string ISO (nao por instante
// numerico) e' suficiente porque writers serializam sempre com mesma
// resolucao (ate segundos). Se ha colisao real de instante, segundo
// tap de 1 segundo basta para criar nova entrada distinta.
export function appendMarcacao(
  marcacoesExistentes: readonly string[],
  novoTimestamp: string,
  cap: number = MAX_MARCACOES_DIA
): string[] {
  const setExistentes = new Set(marcacoesExistentes);
  if (setExistentes.has(novoTimestamp)) {
    // No-op: ja registrado. Retorna copia ordenada das existentes pra
    // garantir invariante (caller pode passar lista nao ordenada).
    return [...marcacoesExistentes].sort();
  }
  const proposto = [...marcacoesExistentes, novoTimestamp].sort();
  if (proposto.length <= cap) return proposto;
  // FIFO: descarta as mais antigas, mantem as `cap` mais recentes.
  return proposto.slice(proposto.length - cap);
}

// =====================================================================
// Timeline (ultimas N marcacoes em ordem reversa)
// =====================================================================

// Achata varias entradas de RotinaMarcacao em uma unica lista
// cronologica reversa (mais recente primeiro), util pra renderizar
// timeline no detalhe da rotina. Caller passa as N entradas mais
// recentes (geralmente as ultimas 7 dias); helper agrega e ordena.
//
// Tolera entradas com timestamps malformados: descarta silenciosamente
// (writer de leitura ja deveria rejeitar via zod, mas defesa em
// profundidade).
export function calcularTimeline(
  entradas: readonly RotinaMarcacao[],
  tamanho: number = TIMELINE_TAMANHO_DEFAULT
): string[] {
  const todas: string[] = [];
  for (const entrada of entradas) {
    for (const ts of entrada.marcacoes) {
      const ms = new Date(ts).getTime();
      if (Number.isNaN(ms)) continue;
      todas.push(ts);
    }
  }
  // Sort desc (mais recente primeiro) usando comparacao numerica para
  // ser robusto a fusos diferentes na mesma lista (caso usuario viaje
  // e celular troque TZ entre marcacoes).
  todas.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return todas.slice(0, tamanho);
}

// =====================================================================
// Aderencia semanal (% de dias com pelo menos 1 marcacao em 7 dias)
// =====================================================================

// Calcula o YYYY-MM-DD local de um timestamp ISO usando o fuso fixo
// do projeto. Reaproveita a logica de paths.ts (sem importar para
// evitar ciclo).
function ymdLocal(iso: string): string | null {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const local = toSaoPauloUtc(new Date(ms));
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface AderenciaSemanal {
  // Percentual 0..100 (arredondado).
  porcentagem: number;
  // Numero de dias com pelo menos 1 marcacao na janela.
  diasMarcados: number;
  // Tamanho da janela (default 7).
  janelaDias: number;
}

// Calcula aderencia: dos `janelaDias` dias mais recentes (incluindo
// hoje), em quantos houve >=1 marcacao. Util pra microcopy "5 de 7
// dias" + "71%".
//
// `agora` aceito para tests deterministicos. Janela inclui hoje e
// volta `janelaDias - 1` dias.
export function calcularAderenciaSemanal(
  entradas: readonly RotinaMarcacao[],
  agora: Date = new Date(),
  janelaDias: number = JANELA_ADERENCIA_DIAS
): AderenciaSemanal {
  // Set de YYYY-MM-DD com pelo menos 1 marcacao.
  const diasComMarcacao = new Set<string>();
  for (const entrada of entradas) {
    for (const ts of entrada.marcacoes) {
      const ymd = ymdLocal(ts);
      if (ymd) diasComMarcacao.add(ymd);
    }
  }

  // Gera lista canonica dos N dias da janela (hoje, ontem, ...).
  const limite = agora.getTime() - (janelaDias - 1) * DIA_MS;
  let diasMarcados = 0;
  for (let i = 0; i < janelaDias; i++) {
    const d = new Date(limite + i * DIA_MS);
    const ymd = ymdLocal(d.toISOString());
    if (ymd && diasComMarcacao.has(ymd)) diasMarcados++;
  }

  const porcentagem = Math.round((diasMarcados / janelaDias) * 100);
  return { porcentagem, diasMarcados, janelaDias };
}

// =====================================================================
// Silenciamento de lembrete (fim do dia local)
// =====================================================================

// Calcula o ISO datetime correspondente a 23:59:59 do dia LOCAL da
// referencia, no fuso do projeto (UTC-3). Quando a marcacao acontece
// antes do horario do alarme companion, este timestamp e o limite
// ate quando o lembrete deve ser suprimido (semantica: "ja marquei
// hoje, nao precisa relembrar").
//
// Implementacao: obtem componentes do dia local via toSaoPauloUtc, e
// formata a string ISO 8601 com offset -03:00 diretamente (sem
// roundtrip via Date.toISOString, que devolveria UTC). Isso garante
// que o output e estavel independente do TZ do host (CI roda em UTC,
// celular roda em -03:00, ambos produzem mesma string).
export function calcularSilenciarLembreteAte(
  referencia: Date = new Date()
): string {
  const local = toSaoPauloUtc(referencia);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}T23:59:59-03:00`;
}

// Verifica se o lembrete companion deve ser suprimido com base no
// campo silenciar_lembrete_ate da entrada de marcacao. `agora` aceito
// para tests deterministicos.
export function estaLembreteSilenciado(
  silenciarAte: string | null | undefined,
  agora: Date = new Date()
): boolean {
  if (!silenciarAte) return false;
  const t = new Date(silenciarAte).getTime();
  if (Number.isNaN(t)) return false;
  return agora.getTime() < t;
}
