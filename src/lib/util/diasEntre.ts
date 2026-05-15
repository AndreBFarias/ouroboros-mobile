// Função pura que calcula a diferenca de dias inteiros entre duas
// datas, em UTC, sem horas. Usada pelo modulo de contadores (M18) para
// derivar "dias atuais" a partir de início + agora.
//
// Convencao:
//  - O calculo ignora horas, minutos, segundos e timezone do Date
//    fornecido. Usamos o ano/mes/dia em UTC de cada Date e medimos a
//    diferenca em milissegundos / 86_400_000.
//  - Reset registrado as 23:59 conta como dia 0; novo dia comeca a
//    meia-noite UTC (proxy razoavel para meia-noite local em UTC-3
//    quando comparamos a data string YYYY-MM-DD que já foi gerada
//    com fuso aplicado).
//  - O resultado e int >= 0 quando b >= a; pode ser negativo quando
//    a > b (caller decide como tratar).
//
// Comentarios sem acento (convencao shell/CI).

const MS_POR_DIA = 86_400_000;

// Truncamento de Date para meia-noite UTC. Garante que duas datas
// sejam comparadas pelo seu YYYY-MM-DD (UTC) e não pelo timestamp
// completo. Isso evita off-by-one por DST ou fuso (problema comum
// quando se subtrai timestamps puros).
function truncarUtcDia(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Diferenca em dias inteiros entre b e a (b - a). Positivo quando b
// e posterior a a. Aceita Date ou string YYYY-MM-DD (parser interno
// converte para Date UTC a 00:00:00).
export function diasEntre(a: Date | string, b: Date | string): number {
  const da = a instanceof Date ? a : parseYmdUtc(a);
  const db = b instanceof Date ? b : parseYmdUtc(b);
  const diff = truncarUtcDia(db) - truncarUtcDia(da);
  return Math.round(diff / MS_POR_DIA);
}

// Parser auxiliar para string YYYY-MM-DD. Cria Date com horario
// fixo 00:00:00 UTC para casar com truncarUtcDia.
function parseYmdUtc(ymd: string): Date {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    throw new Error(`data invalida (esperado YYYY-MM-DD): ${ymd}`);
  }
  const ano = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10) - 1;
  const dia = parseInt(m[3], 10);
  return new Date(Date.UTC(ano, mes, dia, 0, 0, 0, 0));
}
