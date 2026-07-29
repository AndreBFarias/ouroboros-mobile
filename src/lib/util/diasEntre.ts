// Função pura que calcula a diferenca de dias inteiros entre duas
// datas, comparando o DIA CIVIL LOCAL de cada lado (fuso do app,
// TZ_DEFAULT = America/Sao_Paulo). Usada pelo modulo de contadores
// (M18) para derivar "dias atuais" a partir de início + agora.
//
// Convencao (AUDIT-P1-2-DIASENTRE-FUSO, 2026-07-28):
//  - String YYYY-MM-DD entra inalterada: ela ja E um dia civil local.
//    Todo produtor de YMD no projeto passa por formatDateYmd ->
//    dataLocalYmd (R-INFRA-TIMEZONE-HELPER-CANONICO), entao converter
//    de novo seria erro.
//  - Date e reduzido ao seu YYYY-MM-DD local via dataLocalYmd (Intl),
//    o mesmo padrao canonico de marcosAuto.ts. ANTES o truncamento era
//    pelos campos UTC do Date: das 21:00 as 23:59 BRT o dia UTC ja
//    tinha virado e a funcao devolvia +1 dia. Esse off-by-one entrava
//    no `recorde` do contador dentro de registrarReset e, como recorde
//    nunca decresce (Math.max), a inflacao ficava gravada para sempre.
//  - O calculo ignora horas, minutos e segundos: so o dia civil conta.
//    Reset registrado as 23:59 BRT conta como dia 0; o dia novo comeca
//    a meia-noite LOCAL.
//  - O resultado e int >= 0 quando b >= a; pode ser negativo quando
//    a > b (caller decide como tratar).
//  - Date invalido produz NaN (contrato preservado); string mal
//    formatada lanca.
//
// Comentarios sem acento (convencao shell/CI).
import { dataLocalYmd } from '@/lib/datetime/local';

const MS_POR_DIA = 86_400_000;

// Reduz a entrada ao ms de meia-noite UTC do YYYY-MM-DD que representa
// o dia civil local. Date passa por dataLocalYmd (Intl, resolve DST);
// string YMD ja e o dia civil e so precisa ser parseada. O ancoramento
// final em Date.UTC e apenas aritmetico (mesma base dos dois lados),
// entao a subtracao continua imune a DST.
function truncarDiaCivil(v: Date | string): number {
  if (v instanceof Date) {
    const ymd = dataLocalYmd(v);
    // Date invalido: dataLocalYmd devolve ''. Propaga NaN em vez de
    // lancar, preservando o contrato anterior (Date invalido -> NaN).
    if (ymd === '') return NaN;
    return parseYmdUtc(ymd).getTime();
  }
  return parseYmdUtc(v).getTime();
}

// Diferenca em dias inteiros entre b e a (b - a). Positivo quando b
// e posterior a a. Aceita Date ou string YYYY-MM-DD.
export function diasEntre(a: Date | string, b: Date | string): number {
  const da = truncarDiaCivil(a);
  const db = truncarDiaCivil(b);
  return Math.round((db - da) / MS_POR_DIA);
}

// Parser auxiliar para string YYYY-MM-DD. Cria Date com horario
// fixo 00:00:00 UTC (ancora aritmetica comum aos dois lados).
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
