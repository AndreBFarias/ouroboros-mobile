// Helpers puros pra Q17.d. Recebem listas de RegistroExternoHC e
// devolvem agregados prontos pra UI. Isolados do modulo nativo e do
// hook pra serem testaveis sem mock pesado.
//
// Comentarios sem acento (convencao shell/CI).
import type { RegistroExternoHC } from './sync';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface ResumoPassos {
  totalSemanaAtual: number;
  totalSemanaAnterior: number;
  deltaAbsoluto: number;
}

export interface ResumoPeso {
  ultimoKg: number;
  ultimaData: string;
  deltaKg: number | null;
}

export interface ResumoTreinos {
  ultimos30dias: number;
  lista: { uuid: string; rotulo: string; inicio: string; duracaoMin: number }[];
}

// Soma passos das ultimas 7 janelas de 24h e das 7 anteriores. Os
// registros HC sao sempre intervalos com count; agrupamos por dia do
// `inicio` em UTC pra estabilidade (proxy aceitavel — usuario que muda
// fuso 5x na semana e' edge case).
export function resumirPassos(
  registros: RegistroExternoHC[],
  hoje: Date = new Date()
): ResumoPassos {
  const limiteSemanaAtual = hoje.getTime() - 7 * MS_POR_DIA;
  const limiteSemanaAnterior = hoje.getTime() - 14 * MS_POR_DIA;
  let totalSemanaAtual = 0;
  let totalSemanaAnterior = 0;
  for (const r of registros) {
    if (r.tipo !== 'steps' || typeof r.valor !== 'number') continue;
    const t = Date.parse(r.inicio);
    if (Number.isNaN(t)) continue;
    if (t >= limiteSemanaAtual) {
      totalSemanaAtual += r.valor;
    } else if (t >= limiteSemanaAnterior) {
      totalSemanaAnterior += r.valor;
    }
  }
  return {
    totalSemanaAtual,
    totalSemanaAnterior,
    deltaAbsoluto: totalSemanaAtual - totalSemanaAnterior,
  };
}

// Ordena weights por timestamp e devolve o ultimo + delta vs anterior.
// deltaKg null quando so existe uma leitura.
export function resumirPeso(registros: RegistroExternoHC[]): ResumoPeso | null {
  const pesos = registros
    .filter((r) => r.tipo === 'weight' && typeof r.valor === 'number')
    .map((r) => ({
      kg: r.valor as number,
      data: r.inicio,
      t: Date.parse(r.inicio),
    }))
    .filter((p) => !Number.isNaN(p.t))
    .sort((a, b) => b.t - a.t);
  if (pesos.length === 0) return null;
  const ultimo = pesos[0];
  const anterior = pesos[1];
  return {
    ultimoKg: ultimo.kg,
    ultimaData: ultimo.data,
    deltaKg: anterior ? Number((ultimo.kg - anterior.kg).toFixed(1)) : null,
  };
}

// Conta sessoes ExerciseSession dos ultimos 30 dias e prepara lista
// amigavel pro sheet expandido. duracaoMin arredondado pra inteiro.
export function resumirTreinos(
  registros: RegistroExternoHC[],
  hoje: Date = new Date()
): ResumoTreinos {
  const limite = hoje.getTime() - 30 * MS_POR_DIA;
  const lista: ResumoTreinos['lista'] = [];
  for (const r of registros) {
    if (r.tipo !== 'exercise') continue;
    const tInicio = Date.parse(r.inicio);
    const tFim = Date.parse(r.fim);
    if (Number.isNaN(tInicio) || Number.isNaN(tFim)) continue;
    if (tInicio < limite) continue;
    const duracaoMin = Math.max(1, Math.round((tFim - tInicio) / 60_000));
    lista.push({
      uuid: r.uuid,
      rotulo: r.rotulo,
      inicio: r.inicio,
      duracaoMin,
    });
  }
  lista.sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
  return { ultimos30dias: lista.length, lista };
}
