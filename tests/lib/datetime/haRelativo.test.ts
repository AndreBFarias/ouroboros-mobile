// Testes do helper PT-BR de tempo relativo haRelativo.
// R-INT-3-HC-SYNC-PAINEL (2026-05-26).
//
// Cobre os 4 thresholds (agora mesmo / min / horas / dias), singular vs
// plural de "dia", entrada negativa (relogio adiantado), e o parser ISO
// tolerante (null/invalido -> null).
//
// Comentarios sem acento (convencao shell/CI).

import {
  haRelativoDeMs,
  haRelativoDeIso,
} from '@/lib/datetime/haRelativo';

const MIN = 60 * 1000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

describe('haRelativoDeMs', () => {
  it('delta < 1 min -> "agora mesmo"', () => {
    expect(haRelativoDeMs(0)).toBe('agora mesmo');
    expect(haRelativoDeMs(59 * 1000)).toBe('agora mesmo');
  });

  it('delta negativo (relogio adiantado) -> "agora mesmo"', () => {
    expect(haRelativoDeMs(-5000)).toBe('agora mesmo');
  });

  it('delta em minutos -> "há N min"', () => {
    expect(haRelativoDeMs(MIN)).toBe('há 1 min');
    expect(haRelativoDeMs(5 * MIN)).toBe('há 5 min');
    expect(haRelativoDeMs(59 * MIN)).toBe('há 59 min');
  });

  it('delta em horas -> "há Nh"', () => {
    expect(haRelativoDeMs(HORA)).toBe('há 1h');
    expect(haRelativoDeMs(3 * HORA)).toBe('há 3h');
    expect(haRelativoDeMs(23 * HORA)).toBe('há 23h');
  });

  it('delta em dias: singular vs plural', () => {
    expect(haRelativoDeMs(DIA)).toBe('há 1 dia');
    expect(haRelativoDeMs(2 * DIA)).toBe('há 2 dias');
    expect(haRelativoDeMs(30 * DIA)).toBe('há 30 dias');
  });

  it('entrada nao-finita (NaN/Infinity) -> "agora mesmo" (defensivo)', () => {
    expect(haRelativoDeMs(NaN)).toBe('agora mesmo');
    expect(haRelativoDeMs(Infinity)).toBe('agora mesmo');
  });
});

describe('haRelativoDeIso', () => {
  const agora = new Date('2026-05-26T12:00:00.000Z').getTime();

  it('ISO null/undefined/vazio -> null (caller decide copy de "nunca")', () => {
    expect(haRelativoDeIso(null, agora)).toBeNull();
    expect(haRelativoDeIso(undefined, agora)).toBeNull();
    expect(haRelativoDeIso('', agora)).toBeNull();
  });

  it('ISO invalido -> null', () => {
    expect(haRelativoDeIso('nao-e-data', agora)).toBeNull();
  });

  it('ISO valido recente -> frase relativa correta', () => {
    const tresHorasAtras = new Date(agora - 3 * HORA).toISOString();
    expect(haRelativoDeIso(tresHorasAtras, agora)).toBe('há 3h');

    const doisDiasAtras = new Date(agora - 2 * DIA).toISOString();
    expect(haRelativoDeIso(doisDiasAtras, agora)).toBe('há 2 dias');
  });

  it('ISO no futuro -> "agora mesmo" (delta negativo)', () => {
    const futuro = new Date(agora + 5 * MIN).toISOString();
    expect(haRelativoDeIso(futuro, agora)).toBe('agora mesmo');
  });
});
