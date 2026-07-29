// Testes da funcao pura diasEntre (M18). Cobertura inclui Date e
// string YYYY-MM-DD, fronteira de meia-noite, datas iguais, ordem
// invertida e ano bissexto.
//
// AUDIT-P1-2-DIASENTRE-FUSO (2026-07-28): a funcao passou a comparar
// o DIA CIVIL LOCAL (America/Sao_Paulo) dos dois lados; antes truncava
// os Date pelos campos UTC. Dois casos deste arquivo cravavam a
// semantica UTC e foram re-baselinados (marcados abaixo); os demais 10
// dao o mesmo resultado nas duas convencoes. A janela do defeito
// (21:00-23:59 BRT, quando o dia UTC ja virou e o local nao) ganhou
// bloco proprio no fim do arquivo.
//
// Comentarios sem acento (convencao shell/CI).
import { diasEntre } from '@/lib/util/diasEntre';

describe('diasEntre', () => {
  it('retorna 0 quando datas sao iguais', () => {
    const a = new Date('2026-04-29T10:00:00Z');
    const b = new Date('2026-04-29T20:00:00Z');
    expect(diasEntre(a, b)).toBe(0);
  });

  it('retorna 1 quando b e o dia seguinte de a (UTC)', () => {
    const a = new Date('2026-04-28T10:00:00Z');
    const b = new Date('2026-04-29T10:00:00Z');
    expect(diasEntre(a, b)).toBe(1);
  });

  it('retorna 28 entre 04-01 e 04-29', () => {
    const a = new Date('2026-04-01T00:00:00Z');
    const b = new Date('2026-04-29T00:00:00Z');
    expect(diasEntre(a, b)).toBe(28);
  });

  it('retorna negativo quando a > b', () => {
    const a = new Date('2026-04-30T00:00:00Z');
    const b = new Date('2026-04-29T00:00:00Z');
    expect(diasEntre(a, b)).toBe(-1);
  });

  it('aceita string YYYY-MM-DD', () => {
    expect(diasEntre('2026-04-01', '2026-04-29')).toBe(28);
  });

  // RE-BASELINE AUDIT-P1-2 (era 28 sob a convencao UTC). O Date e
  // 2026-04-28 21:00 BRT, ou seja, dia civil local 04-28: a distancia
  // ate 04-01 e 27 dias, nao 28. Este par (YMD-local do Vault contra um
  // Date na janela da noite) e exatamente a forma do defeito que
  // inflava o recorde do contador.
  it('aceita mistura Date + string (Date reduzido ao dia civil local)', () => {
    const b = new Date('2026-04-29T00:00:00Z');
    expect(diasEntre('2026-04-01', b)).toBe(27);
  });

  it('reset as 23:59 ainda conta como dia 0 (mesmo dia UTC)', () => {
    const a = new Date('2026-04-29T23:59:00Z');
    const b = new Date('2026-04-29T23:59:30Z');
    expect(diasEntre(a, b)).toBe(0);
  });

  // RE-BASELINE AUDIT-P1-2 (era 1 sob a convencao UTC, com o nome
  // 'atravessa meia-noite UTC corretamente'). Em BRT os dois instantes
  // sao 20:59 e 21:01 do MESMO dia 29/04: a meia-noite UTC nao vira o
  // dia do usuario, quem vira e a meia-noite local.
  it('nao vira o dia na meia-noite UTC (mesmo dia local)', () => {
    const a = new Date('2026-04-29T23:59:00Z');
    const b = new Date('2026-04-30T00:01:00Z');
    expect(diasEntre(a, b)).toBe(0);
  });

  it('atravessa virada de mes', () => {
    expect(diasEntre('2026-04-30', '2026-05-01')).toBe(1);
  });

  it('atravessa virada de ano', () => {
    expect(diasEntre('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('considera ano bissexto (29 dias em fevereiro 2024)', () => {
    expect(diasEntre('2024-02-01', '2024-03-01')).toBe(29);
  });

  it('considera ano nao-bissexto (28 dias em fevereiro 2026)', () => {
    expect(diasEntre('2026-02-01', '2026-03-01')).toBe(28);
  });

  it('rejeita string mal-formatada', () => {
    expect(() => diasEntre('abc', '2026-04-29')).toThrow(/data invalida/);
    expect(() => diasEntre('2026-04-29', '2026/04/30')).toThrow(
      /data invalida/
    );
  });

  it('cobre periodo de 365 dias', () => {
    expect(diasEntre('2025-01-01', '2026-01-01')).toBe(365);
  });
});

// AUDIT-P1-2-DIASENTRE-FUSO: janela 21:00-23:59 BRT, onde o dia UTC ja
// virou e o dia local nao. Era a janela que a suite nunca cobriu e onde
// o contador mostrava +1 dia -- numero que registrarReset gravava em
// `recorde` de forma permanente (Math.max nunca decresce).
describe('diasEntre - janela 21:00-23:59 BRT', () => {
  it('cenario do defeito: 20/07 + 22:30 BRT do 27/07 = 7 dias, nao 8', () => {
    // 2026-07-28T01:30Z = 2026-07-27 22:30 BRT.
    const agora = new Date('2026-07-28T01:30:00Z');
    expect(diasEntre('2026-07-20', agora)).toBe(7);
  });

  it('23:59 BRT ainda e o dia de inicio (0 dias)', () => {
    // 2026-07-28T02:59Z = 2026-07-27 23:59 BRT.
    const agora = new Date('2026-07-28T02:59:00Z');
    expect(diasEntre('2026-07-27', agora)).toBe(0);
  });

  it('o dia vira na meia-noite local, nao na UTC', () => {
    // 23:59:59 BRT do 27/07 -> 00:00:01 BRT do 28/07.
    const antes = new Date('2026-07-28T02:59:59Z');
    const depois = new Date('2026-07-28T03:00:01Z');
    expect(diasEntre(antes, depois)).toBe(1);
  });

  it('21:00 BRT (borda de entrada na janela) nao adianta o dia', () => {
    // 2026-07-28T00:00Z = 2026-07-27 21:00 BRT.
    const agora = new Date('2026-07-28T00:00:00Z');
    expect(diasEntre('2026-07-27', agora)).toBe(0);
    expect(diasEntre('2026-07-26', agora)).toBe(1);
  });

  it('20:59 BRT (fora da janela) ja era correto e continua igual', () => {
    // 2026-07-27T23:59Z = 2026-07-27 20:59 BRT.
    const agora = new Date('2026-07-27T23:59:00Z');
    expect(diasEntre('2026-07-20', agora)).toBe(7);
  });
});
