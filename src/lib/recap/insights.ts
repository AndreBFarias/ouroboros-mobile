// R-INT-3-HC-INSIGHT-SEMANAL (2026-05-25) -- Insight comparativo de
// saude para o topo do Recap. Compara a soma de passos dos ultimos 7
// dias contra os 7 dias anteriores e, SOMENTE quando houve aumento
// relevante, devolve uma frase factual e sobria.
//
// ADR-0005 (regra de tom do projeto): zero comparativo negativo, zero
// gamificacao, zero exclamacao. Por isso o insight e' POSITIVE ONLY:
// se o delta for <= 0 ou abaixo do limiar, a funcao retorna null e
// nenhum card e renderizado. Nunca geramos "voce caminhou menos".
//
// Reaproveita o reader canonico listarPassos (mesma fonte do
// calcularSaudeRecap). A janela e derivada de `ate` diretamente (nao
// do PeriodoChave do Recap): o insight e sempre semana-atual vs
// semana-anterior, independente do periodo selecionado na tela.
//
// Guarda contra base ruim: exige um minimo de dias com registro em
// CADA janela (MIN_DIAS). Comparar uma semana cheia contra uma semana
// quase vazia inflaria o percentual artificialmente.
//
// Comentarios sem acento (convencao shell/CI).
// Strings de UI (texto) em PT-BR com acentuacao completa.
import { listarPassos } from '@/lib/vault/passos';

export interface InsightSaude {
  // Unico tipo nesta v1. Mantido como discriminante para futuros
  // insights (sono, treinos) sem quebrar o consumidor.
  tipo: 'passos';
  // Delta percentual positivo arredondado (ex: 18 = +18%).
  deltaPct: number;
  // Frase pronta para render, ja formatada em PT-BR.
  texto: string;
}

// Limiar minimo de aumento para gerar insight. Abaixo disso o ganho e
// ruido (variacao normal de rotina) e nao vale destacar.
const LIMIAR_PCT = 5;

// Minimo de dias com registro de passos em CADA janela para o insight
// ser confiavel. Com menos que isto a comparacao tem base fraca.
const MIN_DIAS = 3;

const DIA_MS = 86_400_000;

// Converte um instante para chave de dia YYYY-MM-DD no fuso de São
// Paulo (UTC-3 fixo), alinhado com a forma como o writer de passos
// grava a `data`. Mesma estrategia de saude.ts (diaLocalYmd) para que
// a comparacao com a string do frontmatter nao sofra shift de fuso.
function diaLocalYmd(d: Date): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Soma os passos cujos dias (YYYY-MM-DD) caem em [deYmd, ateYmd] e
// conta quantos dias distintos com registro existem na janela.
function agregarJanela(
  passos: { data: string; total: number }[],
  deYmd: string,
  ateYmd: string
): { soma: number; dias: number } {
  let soma = 0;
  let dias = 0;
  for (const p of passos) {
    if (p.data >= deYmd && p.data <= ateYmd) {
      soma += p.total;
      dias += 1;
    }
  }
  return { soma, dias };
}

// Calcula o insight de saude (passos) comparando a janela atual (7
// dias terminando em `ate`) com a janela anterior (os 7 dias que a
// precedem). Retorna o InsightSaude apenas quando:
//   - ambas as janelas tem >= MIN_DIAS de registro, E
//   - a soma atual > soma anterior, E
//   - o delta percentual >= LIMIAR_PCT.
// Em qualquer outro caso retorna null (nada renderiza). POSITIVE ONLY.
export async function calcularInsightSaude(
  vaultRoot: string,
  ate: Date
): Promise<InsightSaude | null> {
  const todos = await listarPassos(vaultRoot);
  if (todos.length === 0) return null;

  // Janela atual: [ate-6, ate]. Janela anterior: [ate-13, ate-7].
  const atualAteYmd = diaLocalYmd(ate);
  const atualDeYmd = diaLocalYmd(new Date(ate.getTime() - 6 * DIA_MS));
  const antAteYmd = diaLocalYmd(new Date(ate.getTime() - 7 * DIA_MS));
  const antDeYmd = diaLocalYmd(new Date(ate.getTime() - 13 * DIA_MS));

  const atual = agregarJanela(todos, atualDeYmd, atualAteYmd);
  const anterior = agregarJanela(todos, antDeYmd, antAteYmd);

  // Base ruim: alguma janela sem dados suficientes. Sem isto, uma
  // semana cheia contra uma quase vazia inflaria o percentual.
  if (atual.dias < MIN_DIAS || anterior.dias < MIN_DIAS) return null;

  // Evita divisao por zero (defensivo; com MIN_DIAS>=3 a soma anterior
  // ja deveria ser > 0, mas registros com total 0 sao possiveis).
  if (anterior.soma <= 0) return null;

  // POSITIVE ONLY: so seguimos se houve aumento.
  if (atual.soma <= anterior.soma) return null;

  const deltaPct = Math.round(
    ((atual.soma - anterior.soma) / anterior.soma) * 100
  );
  if (deltaPct < LIMIAR_PCT) return null;

  return {
    tipo: 'passos',
    deltaPct,
    texto: `Você caminhou ${deltaPct}% mais que a semana passada.`,
  };
}
