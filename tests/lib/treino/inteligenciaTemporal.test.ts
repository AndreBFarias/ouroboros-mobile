// Testes do helper de inteligencia temporal de treino (R-ROT-1-D).
// Cobre:
//  - derivarHistoricoExecucoes: filtra por rotina_slug, descarta legado
//    sem o campo, respeita janela 30d, ordena asc.
//  - detectarPadraoHorarioRotina: limiar N=4, cluster +-60min,
//    concordancia >=80%, microcopy.
//  - calcularSugestaoAlarmeRotina: helper de conveniencia.
//  - estaSilenciado: silenciar_sugestao_ate futuro vs passado.
//  - calcularSilenciarAte: ISO offset +30d.
//
// Tests deterministicos via parametro `agora` fixo.
// Comentarios sem acento (convencao shell/CI).
import {
  calcularSilenciarAte,
  calcularSugestaoAlarmeRotina,
  derivarHistoricoExecucoes,
  detectarPadraoHorarioRotina,
  estaSilenciado,
  JANELA_DIAS,
  N_MINIMO,
  RAIO_CLUSTER_MIN,
  SILENCIO_DIAS,
} from '@/lib/treino/inteligenciaTemporal';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

const AGORA = new Date('2026-05-21T15:00:00-03:00');

// Helper para montar TreinoSessao minima. Default rotina_slug ja
// preenchido (canonico para R-ROT-1-D).
function fazerSessao(over: Partial<TreinoSessao> = {}): TreinoSessao {
  return {
    tipo: 'treino_sessao',
    data: '2026-05-21T18:00:00-03:00',
    autor: 'pessoa_a',
    rotina: 'rotina A',
    rotina_slug: 'rotina-a-peito',
    duracao_min: 45,
    exercicios: [
      { nome: 'Supino', series: 3, reps: 10 },
    ],
    ...over,
  };
}

// Constroi ISO datetime de execucao com hora local desejada. Subtrai
// `diasAtras` de AGORA e injeta hora/minuto. Retorna ISO bruto (Z) --
// o schema aceita Z ou +-HH:MM.
function isoEm(diasAtras: number, hora: number, minuto: number): string {
  const base = new Date(AGORA);
  base.setDate(base.getDate() - diasAtras);
  base.setHours(hora);
  base.setMinutes(minuto);
  base.setSeconds(0);
  base.setMilliseconds(0);
  return base.toISOString();
}

describe('derivarHistoricoExecucoes', () => {
  it('mantem apenas sessoes do slug-alvo dentro de 30 dias', () => {
    const sessoes: TreinoSessao[] = [
      fazerSessao({ data: isoEm(1, 18, 0) }),
      fazerSessao({ data: isoEm(5, 18, 5) }),
      fazerSessao({
        rotina_slug: 'rotina-b-costas',
        data: isoEm(2, 18, 0),
      }),
      fazerSessao({ data: isoEm(60, 18, 0) }), // fora janela 30d
    ];
    const out = derivarHistoricoExecucoes(sessoes, 'rotina-a-peito', AGORA);
    expect(out).toHaveLength(2);
  });

  it('descarta sessoes legadas sem rotina_slug', () => {
    const sessoes: TreinoSessao[] = [
      fazerSessao({ data: isoEm(1, 18, 0) }),
      // Sessao legada (pre R-SCHEMA-TREINO): rotina_slug undefined.
      fazerSessao({ rotina_slug: undefined, data: isoEm(2, 18, 0) }),
    ];
    const out = derivarHistoricoExecucoes(sessoes, 'rotina-a-peito', AGORA);
    expect(out).toHaveLength(1);
  });

  it('ordena resultados asc por timestamp', () => {
    const sessoes: TreinoSessao[] = [
      fazerSessao({ data: isoEm(1, 18, 0) }),
      fazerSessao({ data: isoEm(7, 18, 0) }),
      fazerSessao({ data: isoEm(3, 18, 0) }),
    ];
    const out = derivarHistoricoExecucoes(sessoes, 'rotina-a-peito', AGORA);
    const tempos = out.map((d) => d.getTime());
    expect(tempos[0]).toBeLessThan(tempos[1]);
    expect(tempos[1]).toBeLessThan(tempos[2]);
  });

  it('slug inexistente retorna []', () => {
    const sessoes: TreinoSessao[] = [
      fazerSessao({ data: isoEm(1, 18, 0) }),
    ];
    const out = derivarHistoricoExecucoes(sessoes, 'rotina-fantasma', AGORA);
    expect(out).toHaveLength(0);
  });

  it('janela configuravel para uso interno', () => {
    const sessoes: TreinoSessao[] = [
      fazerSessao({ data: isoEm(5, 18, 0) }),
      fazerSessao({ data: isoEm(15, 18, 0) }),
    ];
    const out = derivarHistoricoExecucoes(
      sessoes,
      'rotina-a-peito',
      AGORA,
      10
    );
    expect(out).toHaveLength(1);
  });

  it('janela canonica vale 30 dias', () => {
    expect(JANELA_DIAS).toBe(30);
  });
});

describe('detectarPadraoHorarioRotina', () => {
  function mkDate(diasAtras: number, hora: number, minuto: number): Date {
    const d = new Date(AGORA);
    d.setDate(d.getDate() - diasAtras);
    d.setHours(hora);
    d.setMinutes(minuto);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  }

  it('nao sugere com menos de N_MINIMO execucoes', () => {
    const execs = [mkDate(1, 18, 0), mkDate(3, 18, 0), mkDate(5, 18, 0)];
    const r = detectarPadraoHorarioRotina(execs, AGORA);
    expect(r.sugerir).toBe(false);
    expect(N_MINIMO).toBe(4);
  });

  it('sugere quando 4 execucoes concordam em cluster apertado', () => {
    const execs = [
      mkDate(1, 18, 5),
      mkDate(4, 17, 55),
      mkDate(7, 18, 10),
      mkDate(10, 18, 20),
    ];
    const r = detectarPadraoHorarioRotina(execs, AGORA);
    expect(r.sugerir).toBe(true);
    // Mediana das 4 (17:55, 18:05, 18:10, 18:20) ~ media(18:05+18:10)
    // = 18:08 arredondado.
    expect(r.hora?.startsWith('18')).toBe(true);
    expect(r.motivo?.startsWith('Você costuma treinar essa rotina')).toBe(
      true
    );
    expect(r.total).toBe(4);
  });

  it('aceita 4 em 5 (80% concordancia) e ignora outlier distante', () => {
    const execs = [
      mkDate(1, 18, 0),
      mkDate(3, 18, 5),
      mkDate(5, 17, 55),
      mkDate(7, 18, 10),
      mkDate(9, 8, 0), // outlier longe do cluster
    ];
    const r = detectarPadraoHorarioRotina(execs, AGORA);
    expect(r.sugerir).toBe(true);
    expect(r.hora?.startsWith('18')).toBe(true);
  });

  it('nao sugere quando execucoes espalham (cluster < 80%)', () => {
    // 4 execucoes em horarios bem diferentes: cluster nao cobre 80%.
    const execs = [
      mkDate(1, 8, 0),
      mkDate(3, 14, 0),
      mkDate(5, 18, 0),
      mkDate(7, 22, 0),
    ];
    const r = detectarPadraoHorarioRotina(execs, AGORA);
    expect(r.sugerir).toBe(false);
  });

  it('ignora execucoes fora da janela de 30 dias', () => {
    const execs = [
      mkDate(1, 18, 0),
      mkDate(40, 18, 0),
      mkDate(60, 18, 0),
    ];
    const r = detectarPadraoHorarioRotina(execs, AGORA);
    expect(r.sugerir).toBe(false);
  });

  it('raio do cluster vale 60 minutos', () => {
    expect(RAIO_CLUSTER_MIN).toBe(60);
  });

  it('execucoes vazias retorna sugerir false', () => {
    const r = detectarPadraoHorarioRotina([], AGORA);
    expect(r.sugerir).toBe(false);
  });

  it('cluster aberto +-60min agrupa horarios em janela ampla de treino', () => {
    // 17:30, 18:00, 18:30, 19:00 -- mediana 18:15; todos dentro de +-60.
    // Diferenca chave vs tarefa (+-30min): treino flexiona mais com
    // agenda real (academia lotada, fim de expediente variavel).
    const execs = [
      mkDate(1, 17, 30),
      mkDate(3, 18, 0),
      mkDate(5, 18, 30),
      mkDate(7, 19, 0),
    ];
    const r = detectarPadraoHorarioRotina(execs, AGORA);
    expect(r.sugerir).toBe(true);
    expect(r.total).toBe(4);
  });
});

describe('calcularSugestaoAlarmeRotina (helper de conveniencia)', () => {
  it('cruza filtro por slug e cluster em uma chamada', () => {
    const sessoes: TreinoSessao[] = [
      fazerSessao({ data: isoEm(1, 18, 5) }),
      fazerSessao({ data: isoEm(3, 18, 0) }),
      fazerSessao({ data: isoEm(5, 17, 55) }),
      fazerSessao({ data: isoEm(7, 18, 10) }),
      fazerSessao({
        rotina_slug: 'rotina-b-costas',
        data: isoEm(1, 8, 0),
      }),
    ];
    const r = calcularSugestaoAlarmeRotina(sessoes, 'rotina-a-peito', AGORA);
    expect(r.sugerir).toBe(true);
    expect(r.hora?.startsWith('18')).toBe(true);
  });

  it('slug vazio nao sugere', () => {
    const sessoes: TreinoSessao[] = [fazerSessao({ data: isoEm(1, 18, 0) })];
    const r = calcularSugestaoAlarmeRotina(sessoes, '', AGORA);
    expect(r.sugerir).toBe(false);
  });

  it('lista vazia de sessoes nao sugere', () => {
    const r = calcularSugestaoAlarmeRotina([], 'rotina-a-peito', AGORA);
    expect(r.sugerir).toBe(false);
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

  it('respeita parametro silencioDias', () => {
    const out = calcularSilenciarAte(AGORA, 7);
    const t = new Date(out).getTime();
    const esperado = AGORA.getTime() + 7 * 24 * 3600 * 1000;
    expect(t).toBe(esperado);
  });
});
