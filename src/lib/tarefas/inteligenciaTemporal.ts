// Inteligencia temporal sobre marcacao de tarefas (R-ROT-1-B).
//
// Aprende padrao de horario do usuario: se a mesma tarefa (titulo
// normalizado) e marcada como feita 3 ou mais vezes em janela de 14
// dias com horarios proximos (cluster +-30min), sugere criar um alarme
// para o horario medio do cluster.
//
// Exemplo:
//   - "Tomar remedio" marcada 3x: 20:05, 19:55, 20:10 nos ultimos
//     14 dias -> cluster centrado em ~20:00 -> sugere alarme 20:00.
//
// Diferenca do helper de snooze (R-ROT-1-A):
//   - Snooze le array embutido no proprio alarme (historico_snoozes).
//   - Aqui o "historico" e DERIVADO da lista de tarefas com mesmo
//     titulo normalizado (slugify), filtradas por feito=true e com
//     feito_em valido. Cada tarefa e um arquivo separado no Vault.
//
// Decisoes:
//   - Janela de 14 dias (mais curta que snooze: padrao diario mais
//     denso, basta 2 semanas para detectar regularidade).
//   - Limiar de 3 marcacoes para evitar sugestao prematura.
//   - Cluster de +-30min em torno da mediana. Se >=80% das marcacoes
//     recentes caem nesse cluster, propoe a media (HH:MM).
//   - Sugestao silenciada por 30 dias quando o usuario rejeita
//     (campo silenciar_sugestao_ate em qualquer tarefa da familia).
//
// Helper puro: sem IO, sem React, sem clock externo (recebe `agora`).
// Permite teste deterministico via timestamps fixos.
//
// Comentarios sem acento (convencao shell/CI).
import { slugifyTitulo, type Tarefa } from '@/lib/schemas/tarefa';

// Janela canonica em dias para considerar marcacoes recentes.
export const JANELA_DIAS = 14;
// Numero minimo de marcacoes recentes para gerar sugestao.
export const N_MINIMO = 3;
// Fracao minima de concordancia (marcacoes dentro do cluster +-30min).
// 80% = tolera 1 outlier em 5 amostras (mesma constante de snooze).
export const FRACAO_CONCORDANCIA = 0.8;
// Raio do cluster em minutos. Marcacoes dentro de +-30min da mediana
// contam como concordantes.
export const RAIO_CLUSTER_MIN = 30;
// Periodo de silencio quando usuario rejeita a sugestao.
export const SILENCIO_DIAS = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

export interface SugestaoAlarmeTarefa {
  // True quando ha sinal estatistico suficiente para mostrar banner.
  sugerir: boolean;
  // Horario proposto em HH:MM 24h (presente apenas se sugerir).
  hora?: string;
  // Microcopy curto sobre o motivo. Ex: "Voce costuma marcar essa
  // tarefa por volta das 20:00."
  motivo?: string;
  // Numero de marcacoes recentes consideradas.
  total?: number;
  // Total de minutos pos meia-noite do horario sugerido (informativo,
  // util para ordenar varias sugestoes em uma mesma tela).
  minutosDia?: number;
}

// Normaliza titulo para identificar tarefas da mesma familia recorrente.
// Reusa slugifyTitulo (lowercase + ASCII + kebab) por consistencia: duas
// tarefas tituladas "Tomar remedio" e "tomar remedio!" colidem no mesmo
// slug-base e portanto pertencem a mesma familia.
export function normalizarTituloFamilia(titulo: string): string {
  return slugifyTitulo(titulo);
}

// Extrai horarios de marcacao (feito_em) de tarefas da mesma familia,
// dentro da janela canonica e ordenadas por timestamp asc. Filtros:
//   - meta.feito === true
//   - meta.feito_em parseavel como Date valida
//   - normalizarTituloFamilia(meta.titulo) === familia
//   - feito_em dentro da janela (>= agora - 14d)
//
// Retorna lista de Date para o caller fazer cluster sem se preocupar
// com strings. Vazio quando nenhuma tarefa qualifica.
export function derivarHistoricoMarcacoes(
  tarefas: readonly Tarefa[],
  familia: string,
  agora: Date = new Date(),
  janelaDias: number = JANELA_DIAS
): Date[] {
  const limite = agora.getTime() - janelaDias * DIA_MS;
  const datas: Date[] = [];
  for (const t of tarefas) {
    if (!t.feito || !t.feito_em) continue;
    if (normalizarTituloFamilia(t.titulo) !== familia) continue;
    const d = new Date(t.feito_em);
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
// silenciar_sugestao_ate de qualquer tarefa da familia. Caller passa
// a tarefa mais recente da familia (basta uma estar silenciada para
// suprimir o banner em todas). Idempotente em null/undefined.
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

// Avalia historico de marcacoes e decide se mostrar sugestao de alarme.
// Pure: deterministico quando recebe `agora` fixo. UI consome
// { sugerir, hora, motivo } diretamente; demais campos sao informativos.
//
// Algoritmo:
//   1. Filtra marcacoes recentes (caller ja fez via
//      derivarHistoricoMarcacoes; redundancia defensiva).
//   2. Se < N_MINIMO, sem sugestao.
//   3. Encontra cluster +-30min em torno da mediana.
//   4. Se cluster cobre >= 80% das marcacoes recentes, sugere.
//   5. Microcopy menciona "por volta das HH:MM".
export function calcularPadraoHorarioTarefa(
  marcacoes: readonly Date[],
  agora: Date = new Date()
): SugestaoAlarmeTarefa {
  // Re-filtra defensivamente pela janela (caller pode passar lista
  // bruta). Marcacoes fora ja foram descartadas em derivarHistoricoMarcacoes
  // mas filtramos aqui de novo para a funcao ser auto-suficiente.
  const limite = agora.getTime() - JANELA_DIAS * DIA_MS;
  const recentes = marcacoes.filter((d) => d.getTime() >= limite);
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
  const motivo = `Você costuma marcar essa tarefa por volta das ${hora}.`;
  return {
    sugerir: true,
    hora,
    motivo,
    total: recentes.length,
    minutosDia: cluster.centro,
  };
}

// Helper de conveniencia: combina derivarHistoricoMarcacoes +
// calcularPadraoHorarioTarefa em uma so chamada. UI passa a lista
// inteira de tarefas e o titulo-alvo; recebe a sugestao final.
// Silenciamento e responsabilidade do caller (passar
// estaSilenciado(meta.silenciar_sugestao_ate) antes de exibir banner).
export function calcularSugestaoAlarme(
  tarefas: readonly Tarefa[],
  tituloAlvo: string,
  agora: Date = new Date()
): SugestaoAlarmeTarefa {
  const familia = normalizarTituloFamilia(tituloAlvo);
  if (familia.length === 0) return { sugerir: false };
  const marcacoes = derivarHistoricoMarcacoes(tarefas, familia, agora);
  return calcularPadraoHorarioTarefa(marcacoes, agora);
}
