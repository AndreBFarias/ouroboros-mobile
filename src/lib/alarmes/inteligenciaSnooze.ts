// Inteligencia temporal sobre snooze de alarmes (R-ROT-1-A).
//
// Aprende padrao de snooze do usuario: se ele acionar "Soneca" 3 vezes
// ou mais nos ultimos 30 dias com mesma intencao temporal (delta
// semelhante), sugere mover o horario do alarme.
//
// Exemplo:
//   - Alarme 07:00 com 3 snoozes recentes (+15min cada) -> sugere 07:15.
//
// Decisoes:
//   - Janela de 30 dias (entradas mais antigas sao ignoradas, nao
//     truncadas - o writer canonico trunca por tamanho).
//   - Limiar de 3 entradas para evitar sugestao prematura.
//   - Concordancia >=80%: dos N snoozes recentes, pelo menos 80% devem
//     ter o mesmo deltaMin (mediana). Tolera ruido (1 outlier em 5,
//     2 em 10).
//   - Sugestao silenciada por 30 dias quando o usuario rejeita.
//
// Helper puro: sem IO, sem React, sem clock externo (recebe `agora`).
// Permite teste deterministico via timestamps fixos.
//
// Comentarios sem acento (convencao shell/CI).
import type { SnoozeHistoricoEntry } from '@/lib/schemas/alarme';

// Janela canonica em dias para considerar snoozes recentes.
export const JANELA_DIAS = 30;
// Numero minimo de snoozes recentes para gerar sugestao.
export const N_MINIMO = 3;
// Fracao minima de concordancia (mesmo deltaMin) entre snoozes
// recentes. 80% = tolera 1 outlier em 5 amostras.
export const FRACAO_CONCORDANCIA = 0.8;
// Periodo de silencio quando usuario rejeita a sugestao.
export const SILENCIO_DIAS = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

export interface SugestaoSnooze {
  // True quando ha sinal estatistico suficiente para mostrar banner.
  sugerir: boolean;
  // Novo horario proposto em HH:MM 24h (presente apenas se sugerir).
  novaHora?: string;
  // Microcopy curto sobre o motivo (ex: "Voce costuma adiar 15 min").
  motivo?: string;
  // Numero de snoozes recentes considerados.
  total?: number;
  // Delta dominante em minutos (mediana das amostras concordantes).
  deltaDominante?: number;
}

// Filtra entradas dentro da janela canonica (30 dias por padrao). Aceita
// `agora` opcional para teste deterministico; producao usa now() atual.
export function filtrarRecentes(
  historico: readonly SnoozeHistoricoEntry[],
  agora: Date = new Date(),
  janelaDias: number = JANELA_DIAS
): SnoozeHistoricoEntry[] {
  const limite = agora.getTime() - janelaDias * DIA_MS;
  return historico.filter((entry) => {
    const t = new Date(entry.ts).getTime();
    if (Number.isNaN(t)) return false;
    return t >= limite;
  });
}

// Apura quantas vezes cada deltaMin aparece. Retorna mapa ordenado pelo
// numero de ocorrencias (desc).
function contarDeltas(
  entries: readonly SnoozeHistoricoEntry[]
): Array<{ delta: number; count: number }> {
  const mapa = new Map<number, number>();
  for (const e of entries) {
    mapa.set(e.deltaMin, (mapa.get(e.deltaMin) ?? 0) + 1);
  }
  return Array.from(mapa.entries())
    .map(([delta, count]) => ({ delta, count }))
    .sort((a, b) => b.count - a.count);
}

// Soma minutos a um horario HH:MM e devolve novo HH:MM 24h.
// Wraparound automatico (ex: 23:50 + 20 = 00:10). Retorna a string
// original se entrada invalida.
export function somarMinutos(horaBase: string, deltaMin: number): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(horaBase);
  if (!match) return horaBase;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return horaBase;
  const totalMin = (h * 60 + m + deltaMin + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Verifica se a sugestao deve ser silenciada com base no campo
// silenciar_sugestao_ate do alarme.
export function estaSilenciado(
  silenciarAte: string | null | undefined,
  agora: Date = new Date()
): boolean {
  if (!silenciarAte) return false;
  const t = new Date(silenciarAte).getTime();
  if (Number.isNaN(t)) return false;
  return agora.getTime() < t;
}

// Calcula a data ate quando silenciar (ISO com Z). Usado pelo writer
// quando usuario rejeita a sugestao via banner.
export function calcularSilenciarAte(
  agora: Date = new Date(),
  silencioDias: number = SILENCIO_DIAS
): string {
  const futuro = new Date(agora.getTime() + silencioDias * DIA_MS);
  return futuro.toISOString().replace('Z', '+00:00');
}

// Avalia historico e decide se mostrar sugestao. Pure: deterministico
// quando recebe `agora` fixo. UI consome { sugerir, novaHora, motivo }
// diretamente; demais campos sao informativos.
export function calcularSugestaoSnooze(
  historico: readonly SnoozeHistoricoEntry[],
  horaBase: string,
  agora: Date = new Date()
): SugestaoSnooze {
  const recentes = filtrarRecentes(historico, agora);
  if (recentes.length < N_MINIMO) {
    return { sugerir: false };
  }
  const ranking = contarDeltas(recentes);
  if (ranking.length === 0) return { sugerir: false };
  const top = ranking[0];
  const fracao = top.count / recentes.length;
  if (fracao < FRACAO_CONCORDANCIA) {
    return { sugerir: false };
  }
  const novaHora = somarMinutos(horaBase, top.delta);
  const sinal = top.delta > 0 ? 'adiar' : 'antecipar';
  const minutos = Math.abs(top.delta);
  const palavraMin = minutos === 1 ? 'minuto' : 'minutos';
  const motivo = `Você costuma ${sinal} ${minutos} ${palavraMin}.`;
  return {
    sugerir: true,
    novaHora,
    motivo,
    total: recentes.length,
    deltaDominante: top.delta,
  };
}
