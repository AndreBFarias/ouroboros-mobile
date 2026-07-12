// Testes dos helpers puros do card Voces (R-HOME-4a):
//   - rotuloNivelHumor: escala travada 1-5 (mae §12).
//   - rotuloTempoDia: granularidade de dia em BRT (hoje/ontem/ha N dias).
//
// Comentarios sem acento (convencao shell/CI).
import { rotuloNivelHumor, rotuloTempoDia } from '@/lib/humor/rotuloHumor';

// Constroi um YYYY-MM-DD no fuso BRT com offset em dias a partir de uma
// base. Espelha o calculo interno do helper para gerar datas alvo
// deterministicas nos testes.
function ymdBrtOffset(base: Date, offsetDias: number): string {
  const local = new Date(
    base.getTime() + offsetDias * 86_400_000 + -180 * 60_000
  );
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('rotuloNivelHumor', () => {
  it('mapeia 1-5 para a escala travada (mae §12)', () => {
    expect(rotuloNivelHumor(1)).toBe('difícil');
    expect(rotuloNivelHumor(2)).toBe('devagar');
    expect(rotuloNivelHumor(3)).toBe('na média');
    expect(rotuloNivelHumor(4)).toBe('leve');
    expect(rotuloNivelHumor(5)).toBe('radiante');
  });

  it('clampa valores fora da faixa 1-5 para o extremo mais proximo', () => {
    expect(rotuloNivelHumor(0)).toBe('difícil');
    expect(rotuloNivelHumor(6)).toBe('radiante');
    expect(rotuloNivelHumor(-3)).toBe('difícil');
    expect(rotuloNivelHumor(99)).toBe('radiante');
  });

  it('nunca usa adjetivo que concorda com genero da pessoa', () => {
    // Guarda-corpo contra regressao (proibido "otima/calmo" -- mae §12).
    const proibidos = ['ótima', 'ótimo', 'calmo', 'calma', 'bem', 'muito bem'];
    for (let n = 1; n <= 5; n++) {
      expect(proibidos).not.toContain(rotuloNivelHumor(n));
    }
  });
});

describe('rotuloTempoDia', () => {
  // Data-base determinista: meio-dia BRT de 10/jul/2026.
  const hoje = new Date('2026-07-10T12:00:00-03:00');

  it('devolve "hoje" para a data do dia (offset 0)', () => {
    expect(rotuloTempoDia(ymdBrtOffset(hoje, 0), hoje)).toBe('hoje');
  });

  it('devolve "ontem" para offset -1', () => {
    expect(rotuloTempoDia(ymdBrtOffset(hoje, -1), hoje)).toBe('ontem');
  });

  it('devolve "ha N dias" para offset -3', () => {
    expect(rotuloTempoDia(ymdBrtOffset(hoje, -3), hoje)).toBe('há 3 dias');
  });

  it('clampa datas futuras (clock skew) para "hoje"', () => {
    expect(rotuloTempoDia(ymdBrtOffset(hoje, 1), hoje)).toBe('hoje');
  });

  it('respeita a fronteira de meia-noite BRT (nao 24h corridas)', () => {
    // Um registro de ontem 23:00 BRT visto hoje 01:00 BRT (delta 2h) e
    // "ontem", nao "hoje" -- diferenca e de calendario, nao de horas.
    const madrugada = new Date('2026-07-10T01:00:00-03:00');
    expect(rotuloTempoDia('2026-07-09', madrugada)).toBe('ontem');
    expect(rotuloTempoDia('2026-07-10', madrugada)).toBe('hoje');
  });
});
