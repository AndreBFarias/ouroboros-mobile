// Testes do helper de inteligencia temporal de snooze (R-ROT-1-A).
// Cobre:
//  - somarMinutos: aritmetica HH:MM + wraparound 24h.
//  - filtrarRecentes: janela de 30 dias, descarta entradas invalidas.
//  - estaSilenciado: silenciar_sugestao_ate no futuro vs passado.
//  - calcularSilenciarAte: gera ISO offset com +30d a partir de agora.
//  - calcularSugestaoSnooze: limiar N=3, concordancia >=80%, sinal
//    adiar/antecipar, microcopy singular/plural.
//
// Tests deterministicos via parametro `agora` fixo.
// Comentarios sem acento (convencao shell/CI).
import {
  calcularSilenciarAte,
  calcularSugestaoSnooze,
  estaSilenciado,
  filtrarRecentes,
  somarMinutos,
  JANELA_DIAS,
  N_MINIMO,
  SILENCIO_DIAS,
} from '@/lib/alarmes/inteligenciaSnooze';
import type { SnoozeHistoricoEntry } from '@/lib/schemas/alarme';

const AGORA = new Date('2026-05-21T10:00:00+00:00');

function entry(diasAtras: number, deltaMin: number): SnoozeHistoricoEntry {
  const ms = AGORA.getTime() - diasAtras * 24 * 60 * 60 * 1000;
  return {
    ts: new Date(ms).toISOString().replace('Z', '+00:00'),
    deltaMin,
  };
}

describe('somarMinutos', () => {
  it('soma minutos simples preservando 24h', () => {
    expect(somarMinutos('07:00', 15)).toBe('07:15');
    expect(somarMinutos('07:00', 60)).toBe('08:00');
  });

  it('aceita entrada sem zero a esquerda', () => {
    expect(somarMinutos('7:00', 15)).toBe('07:15');
  });

  it('faz wraparound em meia-noite', () => {
    expect(somarMinutos('23:50', 20)).toBe('00:10');
  });

  it('aceita delta negativo (antecipar)', () => {
    expect(somarMinutos('07:00', -15)).toBe('06:45');
  });

  it('retorna entrada original para formato invalido', () => {
    expect(somarMinutos('lixo', 15)).toBe('lixo');
  });
});

describe('filtrarRecentes', () => {
  it('mantem entradas dentro da janela de 30 dias', () => {
    const historico = [entry(5, 15), entry(29, 15), entry(45, 15)];
    expect(filtrarRecentes(historico, AGORA)).toHaveLength(2);
  });

  it('descarta ts invalido sem quebrar', () => {
    const historico = [
      entry(5, 15),
      { ts: 'lixo', deltaMin: 15 } as SnoozeHistoricoEntry,
    ];
    expect(filtrarRecentes(historico, AGORA)).toHaveLength(1);
  });

  it('janela configuravel para uso interno', () => {
    const historico = [entry(7, 15), entry(15, 15)];
    expect(filtrarRecentes(historico, AGORA, 10)).toHaveLength(1);
  });
});

describe('estaSilenciado', () => {
  it('false quando campo null', () => {
    expect(estaSilenciado(null, AGORA)).toBe(false);
    expect(estaSilenciado(undefined, AGORA)).toBe(false);
  });

  it('true quando data futura', () => {
    const futuro = new Date(AGORA.getTime() + 5 * 24 * 3600 * 1000)
      .toISOString()
      .replace('Z', '+00:00');
    expect(estaSilenciado(futuro, AGORA)).toBe(true);
  });

  it('false quando data passada', () => {
    const passado = new Date(AGORA.getTime() - 5 * 24 * 3600 * 1000)
      .toISOString()
      .replace('Z', '+00:00');
    expect(estaSilenciado(passado, AGORA)).toBe(false);
  });

  it('false para entrada nao parseavel', () => {
    expect(estaSilenciado('lixo', AGORA)).toBe(false);
  });
});

describe('calcularSilenciarAte', () => {
  it('gera ISO offset +30 dias por padrao', () => {
    const out = calcularSilenciarAte(AGORA);
    const t = new Date(out).getTime();
    const esperado = AGORA.getTime() + SILENCIO_DIAS * 24 * 3600 * 1000;
    expect(t).toBe(esperado);
    expect(out.endsWith('+00:00')).toBe(true);
  });
});

describe('calcularSugestaoSnooze', () => {
  it('nao sugere com menos de N_MINIMO entradas', () => {
    const historico = [entry(1, 15), entry(2, 15)];
    const r = calcularSugestaoSnooze(historico, '07:00', AGORA);
    expect(r.sugerir).toBe(false);
    expect(N_MINIMO).toBe(3);
  });

  it('sugere quando 3 snoozes recentes concordam 100% (+15min)', () => {
    const historico = [entry(1, 15), entry(2, 15), entry(3, 15)];
    const r = calcularSugestaoSnooze(historico, '07:00', AGORA);
    expect(r.sugerir).toBe(true);
    expect(r.novaHora).toBe('07:15');
    expect(r.motivo).toBe('Você costuma adiar 15 minutos.');
    expect(r.total).toBe(3);
    expect(r.deltaDominante).toBe(15);
  });

  it('aceita 4 em 5 (80% concordancia) e ignora outlier', () => {
    const historico = [
      entry(1, 10),
      entry(2, 10),
      entry(3, 10),
      entry(4, 10),
      entry(5, 30),
    ];
    const r = calcularSugestaoSnooze(historico, '06:00', AGORA);
    expect(r.sugerir).toBe(true);
    expect(r.novaHora).toBe('06:10');
    expect(r.deltaDominante).toBe(10);
  });

  it('nao sugere quando concordancia abaixo de 80%', () => {
    // 3 grupos diferentes: 5, 10, 15. Top tem 33% (1/3).
    const historico = [entry(1, 5), entry(2, 10), entry(3, 15)];
    const r = calcularSugestaoSnooze(historico, '07:00', AGORA);
    expect(r.sugerir).toBe(false);
  });

  it('ignora entradas fora da janela de 30 dias', () => {
    const historico = [
      entry(1, 15),
      entry(45, 15),
      entry(50, 15),
      entry(60, 15),
    ];
    const r = calcularSugestaoSnooze(historico, '07:00', AGORA);
    expect(r.sugerir).toBe(false);
    expect(JANELA_DIAS).toBe(30);
  });

  it('mensagem singular para 1 minuto', () => {
    const historico = [entry(1, 1), entry(2, 1), entry(3, 1)];
    const r = calcularSugestaoSnooze(historico, '07:00', AGORA);
    expect(r.motivo).toBe('Você costuma adiar 1 minuto.');
  });

  it('sinal antecipar quando delta negativo', () => {
    const historico = [entry(1, -10), entry(2, -10), entry(3, -10)];
    const r = calcularSugestaoSnooze(historico, '07:00', AGORA);
    expect(r.sugerir).toBe(true);
    expect(r.novaHora).toBe('06:50');
    expect(r.motivo).toBe('Você costuma antecipar 10 minutos.');
  });
});
