// Helpers puros de rotulo do card Voces (R-HOME-4a). Sem I/O, sem React
// -- testaveis isolados.
//
// Duas responsabilidades:
//   1. rotuloNivelHumor(n): mapeia o slider de humor 1-5 para um rotulo
//      PT-BR poetico e INVARIAVEL de genero. O app nao guarda genero da
//      pessoa; adjetivo que concorda ("otima"/"calmo") daria concordancia
//      errada. Escala travada pelo dono (R-HOME-4 spec-mae §12,
//      2026-07-10): 1 dificil / 2 devagar / 3 na media / 4 leve /
//      5 radiante.
//   2. rotuloTempoDia(dataYmd, hoje): granularidade de DIA (o HumorSchema
//      so grava data YYYY-MM-DD, sem hora -- mae §12). Devolve 'hoje',
//      'ontem' ou 'ha N dias' comparando datas de calendario no fuso BRT
//      (-03:00), espelhando o padrao de formatYmdLocal em useHoje.ts.
//
// Acentuacao completa nas strings de UI (regra invariante 1.4); o texto
// retornado vai direto para <Text>. Comentarios sem acento (convencao
// shell/CI).

// Offset fixo do fuso BRT (-03:00) em minutos. Espelha useHoje.ts:170.
const BRT_OFFSET_MIN = -180;

// Escala travada (mae §12). Indice 0..4 = humor 1..5.
const ROTULOS_NIVEL_HUMOR = [
  'difícil', // 1
  'devagar', // 2
  'na média', // 3
  'leve', // 4
  'radiante', // 5
] as const;

// Mapeia o inteiro de humor (1-5) para o rotulo poetico invariavel.
// Fora da faixa: clampa para o extremo mais proximo (defensivo -- o
// schema ja valida 1-5, mas o helper e puro e nao deve estourar).
export function rotuloNivelHumor(n: number): string {
  const idx = Math.round(n);
  if (idx <= 1) return ROTULOS_NIVEL_HUMOR[0];
  if (idx >= 5) return ROTULOS_NIVEL_HUMOR[4];
  return ROTULOS_NIVEL_HUMOR[idx - 1];
}

// Converte uma Date para YYYY-MM-DD no fuso BRT. Mesmo calculo de
// formatYmdLocal (useHoje.ts) -- desloca -180 min e le componentes UTC.
function ymdBrt(date: Date): string {
  const local = new Date(date.getTime() + BRT_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Milissegundos da meia-noite UTC de um YYYY-MM-DD. Usar UTC evita
// drift de horario de verao ao diferenciar datas de calendario.
function meiaNoiteUtcMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map((p) => Number(p));
  return Date.UTC(y, m - 1, d);
}

// Diferenca em dias de calendario entre dataYmd e o dia de `hoje`
// (ambos em BRT). Devolve rotulo PT-BR de dia:
//   diff <= 0 -> 'hoje'   (mesmo dia ou data futura por clock skew)
//   diff == 1 -> 'ontem'
//   diff >= 2 -> 'ha N dias'
export function rotuloTempoDia(dataYmd: string, hoje: Date): string {
  const hojeYmd = ymdBrt(hoje);
  const diff = Math.round(
    (meiaNoiteUtcMs(hojeYmd) - meiaNoiteUtcMs(dataYmd)) / 86_400_000
  );
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'ontem';
  return `há ${diff} dias`;
}
