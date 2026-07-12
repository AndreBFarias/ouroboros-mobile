// Helper canonico de dia-local baseado em Intl.DateTimeFormat.
// R-INFRA-TIMEZONE-HELPER-CANONICO (2026-05-25).
//
// Extrai o padrao Intl-based validado originalmente em
// src/lib/health/puxadores/passos.ts (sprint R-INT-3-HC-PASSOS-
// TIMEZONE-INTL, commit 14ad117). Substitui o antigo offset fixo
// UTC-3 (TZ_OFFSET_MIN = -180) que era duplicado nos puxadores HC.
//
// Por que Intl em vez de offset fixo: o formatter consulta o offset
// VIGENTE do timezone alvo naquele instante especifico, resolvendo
// DST automaticamente. Um offset fixo quebra se o fuso adotar horario
// de verao (ou se o usuario estiver em outro pais). O default
// America/Sao_Paulo preserva o comportamento BRT anterior bit-a-bit
// (sem DST desde 2019, sempre -180min).
//
// Comentarios sem acento (convencao shell/CI).

// Timezone default para o calculo de dia local. Mantem paridade com o
// comportamento BRT anterior; parametrizavel para suportar outros
// fusos no futuro.
export const TZ_DEFAULT = 'America/Sao_Paulo';

// Calcula YYYY-MM-DD no timezone alvo para uma data. Usa o locale
// en-CA, que formata datas no padrao YYYY-MM-DD nativamente (sem split
// manual). Default America/Sao_Paulo preserva o BRT anterior e mantem
// paridade com formatDateYmd em paths.ts.
export function dataLocalYmd(d: Date, tz: string = TZ_DEFAULT): string {
  if (Number.isNaN(d.getTime())) {
    // Data invalida (defesa); retorna string vazia que sera filtrada
    // upstream pelo caller.
    return '';
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Extrai o offset do timezone alvo (em minutos relativos a UTC) no
// instante informado. Resolve DST automaticamente, pois consulta o
// offset vigente naquele instante especifico. Ex.: America/Sao_Paulo
// retorna -180; America/Los_Angeles retorna -420 (PDT) ou -480 (PST).
export function offsetMinutos(d: Date, tz: string = TZ_DEFAULT): number {
  // longOffset produz nomes como "GMT-03:00". Extrai sinal/hora/min.
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  }).formatToParts(d);
  const nome = partes.find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = nome.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0; // UTC (sem offset textual) ou formato inesperado.
  const sinal = m[1] === '-' ? -1 : 1;
  const horas = parseInt(m[2], 10);
  const mins = m[3] ? parseInt(m[3], 10) : 0;
  return sinal * (horas * 60 + mins);
}

// Calcula YYYY-MM-DD no timezone alvo a partir de um ISO datetime
// (UTC, com offset ou Z). Delega ao formatter Intl.
export function isoToDataLocalYmd(iso: string, tz: string = TZ_DEFAULT): string {
  return dataLocalYmd(new Date(iso), tz);
}

// Extrai os componentes de data-hora locais (ano/mes/dia/hora/min/seg)
// no timezone alvo via Intl.DateTimeFormat.formatToParts. hour12:false
// garante 00-23. Usa en-CA por consistencia, mas le os parts por type
// (independente do separador do locale). Centraliza o calculo usado
// pelas variantes Ymd-Hm e Ymd-Hms.
function partesDataHoraLocal(
  d: Date,
  tz: string,
): { y: string; mo: string; da: string; h: string; mi: string; s: string } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  // hour12:false pode emitir "24" para meia-noite em alguns engines;
  // normaliza para "00" preservando paridade com getUTCHours.
  let h = get('hour');
  if (h === '24') h = '00';
  return {
    y: get('year'),
    mo: get('month'),
    da: get('day'),
    h,
    mi: get('minute'),
    s: get('second'),
  };
}

// Formata um Date para YYYY-MM-DD-HHmm no timezone alvo. Default
// America/Sao_Paulo preserva o comportamento BRT anterior (formatDateYmdHm
// em paths.ts) bit-a-bit.
export function dataHoraLocalYmdHm(d: Date, tz: string = TZ_DEFAULT): string {
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const { y, mo, da, h, mi } = partesDataHoraLocal(d, tz);
  return `${y}-${mo}-${da}-${h}${mi}`;
}

// Formata um Date para YYYY-MM-DD-HHmmss no timezone alvo. Default
// America/Sao_Paulo preserva o comportamento BRT anterior
// (formatDateYmdHms em paths.ts) bit-a-bit.
export function dataHoraLocalYmdHms(d: Date, tz: string = TZ_DEFAULT): string {
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const { y, mo, da, h, mi, s } = partesDataHoraLocal(d, tz);
  return `${y}-${mo}-${da}-${h}${mi}${s}`;
}

// Inicio do dia local (00:00 no tz alvo) para uma data. Util para
// determinar onde a barreira "dia em curso" comeca. Estrategia: obtem
// o YMD local via Intl, calcula o offset vigente do tz no instante e
// constroi o instante UTC correspondente a meia-noite local.
export function startOfTodayLocal(now: Date, tz: string = TZ_DEFAULT): Date {
  const ymd = dataLocalYmd(now, tz);
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const off = offsetMinutos(now, tz);
  // Meia-noite local em UTC = Date.UTC(meia-noite local) menos offset.
  const midnightUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - off * 60_000;
  return new Date(midnightUtcMs);
}
