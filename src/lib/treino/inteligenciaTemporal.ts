// Inteligencia temporal sobre execucao de treinos (R-ROT-1-D).
//
// Aprende padrao de horario do usuario sobre uma rotina especifica:
// se a mesma rotina (vinculada via rotina_slug do TreinoSessaoSchema)
// foi executada 4 ou mais vezes em janela de 30 dias com horarios
// proximos (cluster +-60min), sugere criar um alarme para o horario
// medio do cluster.
//
// Exemplo:
//   - rotina "rotina-a-peito" executada 4x nos ultimos 30 dias as
//     18:05, 17:55, 18:10, 18:20 -> cluster centrado em ~18:00 ->
//     sugere alarme 18:05.
//
// Diferenca dos helpers irmaos:
//   - Snooze (R-ROT-1-A): le array historico_snoozes embutido no
//     proprio alarme; sinaliza ajuste de horario do alarme existente.
//   - Tarefa (R-ROT-1-B): historico derivado de tarefas marcadas como
//     feitas com mesmo titulo-familia (slugify); janela 14d, N=3,
//     cluster +-30min.
//   - Treino (R-ROT-1-D): historico vem das TreinoSessao filtradas
//     por rotina_slug (vinculo canonico introduzido na parte 1
//     R-SCHEMA-TREINO-SESSAO-ROTINA-SLUG). Janela MAIS LONGA (30d)
//     porque treino tipicamente nao e diario; limiar MAIOR (N=4)
//     porque um padrao temporal de treino exige mais sinal para
//     evitar sugestao prematura; cluster MAIS ABERTO (+-60min)
//     porque rotinas de treino flexionam mais com a agenda real do
//     usuario (academia lotada, fim de expediente variavel).
//
// Decisoes:
//   - Janela de 30 dias (treino semanal/trissemanal precisa de mais
//     observacoes que uma tarefa diaria).
//   - Limiar de 4 execucoes para evitar sugestao prematura.
//   - Cluster de +-60min em torno da mediana. Se >=80% das execucoes
//     recentes caem nesse cluster, propoe a media (HH:MM).
//   - Sugestao silenciada por 30 dias quando o usuario rejeita
//     (campo silenciar_sugestao_ate na propria rotina).
//
// Helper puro: sem IO, sem React, sem clock externo (recebe `agora`).
// Permite teste deterministico via timestamps fixos.
//
// Comentarios sem acento (convencao shell/CI).
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

// Janela canonica em dias para considerar execucoes recentes.
export const JANELA_DIAS = 30;
// Numero minimo de execucoes recentes para gerar sugestao.
export const N_MINIMO = 4;
// Fracao minima de concordancia (execucoes dentro do cluster +-60min).
// 80% = tolera 1 outlier em 5 amostras (mesma constante de tarefa).
export const FRACAO_CONCORDANCIA = 0.8;
// Raio do cluster em minutos. Execucoes dentro de +-60min da mediana
// contam como concordantes. Mais aberto que tarefa (+-30min) porque
// treino flexiona mais com a agenda real.
export const RAIO_CLUSTER_MIN = 60;
// Periodo de silencio quando usuario rejeita a sugestao.
export const SILENCIO_DIAS = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

export interface SugestaoAlarmeRotina {
  // True quando ha sinal estatistico suficiente para mostrar banner.
  sugerir: boolean;
  // Horario proposto em HH:MM 24h (presente apenas se sugerir).
  hora?: string;
  // Microcopy curto sobre o motivo. Ex: "Voce costuma treinar essa
  // rotina por volta das 18:00."
  motivo?: string;
  // Numero de execucoes recentes consideradas.
  total?: number;
  // Total de minutos pos meia-noite do horario sugerido (informativo,
  // util para ordenar varias sugestoes em uma mesma tela).
  minutosDia?: number;
}

// Extrai horarios de execucao (campo data) de sessoes filtradas por
// rotina_slug, dentro da janela canonica e ordenadas por timestamp asc.
// Filtros:
//   - sessao.rotina_slug === slugAlvo (sessoes legadas sem o campo
//     sao descartadas)
//   - sessao.data parseavel como Date valida
//   - data dentro da janela (>= agora - 30d)
//
// Retorna lista de Date para o caller fazer cluster sem se preocupar
// com strings. Vazio quando nenhuma sessao qualifica. Caller pode
// passar lista bruta de TreinoSessao -- o filtro acontece aqui.
export function derivarHistoricoExecucoes(
  sessoes: readonly TreinoSessao[],
  slugAlvo: string,
  agora: Date = new Date(),
  janelaDias: number = JANELA_DIAS
): Date[] {
  const limite = agora.getTime() - janelaDias * DIA_MS;
  const datas: Date[] = [];
  for (const s of sessoes) {
    if (s.rotina_slug !== slugAlvo) continue;
    const d = new Date(s.data);
    const ms = d.getTime();
    if (Number.isNaN(ms)) continue;
    if (ms < limite) continue;
    datas.push(d);
  }
  datas.sort((a, b) => a.getTime() - b.getTime());
  return datas;
}

// Converte Date para minutos pos meia-noite (0..1439) no fuso local.
// Usa hour/minute de getHours/getMinutes para alinhar com a percepcao
// do usuario no celular (nao precisa offset explicito; runtime resolve).
function minutosDoDia(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// Calcula a mediana de uma lista de numeros pre-ordenada. Lista vazia
// retorna 0 (caller deve checar length antes de chamar).
function medianaOrdenada(valores: readonly number[]): number {
  const n = valores.length;
  if (n === 0) return 0;
  const meio = Math.floor(n / 2);
  if (n % 2 === 1) return valores[meio];
  return Math.round((valores[meio - 1] + valores[meio]) / 2);
}

// Encontra o cluster mais denso em torno da mediana. Retorna a mediana
// dos itens dentro do cluster e o numero de itens incluidos. Estrategia:
//   1. Ordena minutos do dia asc.
//   2. Pega mediana global como ancora.
//   3. Filtra itens em [mediana - raio, mediana + raio].
//   4. Recalcula mediana so com os filtrados (mais estavel contra
//      outliers extremos).
//
// Caso degenerado (lista vazia): retorna { centro: 0, count: 0 }.
function acharCluster(
  minutos: readonly number[],
  raio: number = RAIO_CLUSTER_MIN
): { centro: number; count: number } {
  if (minutos.length === 0) return { centro: 0, count: 0 };
  const ordenados = [...minutos].sort((a, b) => a - b);
  const ancora = medianaOrdenada(ordenados);
  const dentro = ordenados.filter((m) => Math.abs(m - ancora) <= raio);
  const centro = medianaOrdenada(dentro);
  return { centro, count: dentro.length };
}

// Converte minutos pos meia-noite em HH:MM 24h.
function formatarHora(minutos: number): string {
  const total = ((minutos % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Verifica se a sugestao deve ser silenciada com base no campo
// silenciar_sugestao_ate da rotina. Idempotente em null/undefined.
// Mesma assinatura de estaSilenciado de tarefa/alarme (intencional:
// futuro refactor pode promover a um helper compartilhado).
export function estaSilenciado(
  silenciarAte: string | null | undefined,
  agora: Date = new Date()
): boolean {
  if (!silenciarAte) return false;
  const t = new Date(silenciarAte).getTime();
  if (Number.isNaN(t)) return false;
  return agora.getTime() < t;
}

// Calcula a data ate quando silenciar (ISO com offset). Usado pelo
// writer quando usuario rejeita a sugestao via banner.
export function calcularSilenciarAte(
  agora: Date = new Date(),
  silencioDias: number = SILENCIO_DIAS
): string {
  const futuro = new Date(agora.getTime() + silencioDias * DIA_MS);
  return futuro.toISOString().replace('Z', '+00:00');
}

// Avalia historico de execucoes e decide se mostrar sugestao de alarme.
// Pure: deterministico quando recebe `agora` fixo. UI consome
// { sugerir, hora, motivo } diretamente; demais campos sao informativos.
//
// Algoritmo:
//   1. Filtra execucoes recentes (caller ja fez via
//      derivarHistoricoExecucoes; redundancia defensiva).
//   2. Se < N_MINIMO, sem sugestao.
//   3. Encontra cluster +-60min em torno da mediana.
//   4. Se cluster cobre >= 80% das execucoes recentes, sugere.
//   5. Microcopy menciona "por volta das HH:MM".
export function detectarPadraoHorarioRotina(
  execucoes: readonly Date[],
  agora: Date = new Date()
): SugestaoAlarmeRotina {
  // Re-filtra defensivamente pela janela (caller pode passar lista
  // bruta). Execucoes fora ja foram descartadas em
  // derivarHistoricoExecucoes mas filtramos aqui de novo para a funcao
  // ser auto-suficiente.
  const limite = agora.getTime() - JANELA_DIAS * DIA_MS;
  const recentes = execucoes.filter((d) => d.getTime() >= limite);
  if (recentes.length < N_MINIMO) {
    return { sugerir: false };
  }
  const minutos = recentes.map(minutosDoDia);
  const cluster = acharCluster(minutos);
  if (cluster.count === 0) return { sugerir: false };
  const fracao = cluster.count / recentes.length;
  if (fracao < FRACAO_CONCORDANCIA) {
    return { sugerir: false };
  }
  const hora = formatarHora(cluster.centro);
  const motivo = `Você costuma treinar essa rotina por volta das ${hora}.`;
  return {
    sugerir: true,
    hora,
    motivo,
    total: recentes.length,
    minutosDia: cluster.centro,
  };
}

// Helper de conveniencia: combina derivarHistoricoExecucoes +
// detectarPadraoHorarioRotina em uma so chamada. UI passa a lista
// inteira de sessoes e o slug-alvo; recebe a sugestao final.
// Silenciamento e responsabilidade do caller (passar
// estaSilenciado(rotina.silenciar_sugestao_ate) antes de exibir banner).
export function calcularSugestaoAlarmeRotina(
  sessoes: readonly TreinoSessao[],
  slugAlvo: string,
  agora: Date = new Date()
): SugestaoAlarmeRotina {
  if (slugAlvo.length === 0) return { sugerir: false };
  const execucoes = derivarHistoricoExecucoes(sessoes, slugAlvo, agora);
  return detectarPadraoHorarioRotina(execucoes, agora);
}
