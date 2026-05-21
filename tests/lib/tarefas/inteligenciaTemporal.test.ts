// Testes do helper de inteligencia temporal de tarefas (R-ROT-1-B).
// Cobre:
//  - normalizarTituloFamilia: reusa slugify, agrupa variantes.
//  - derivarHistoricoMarcacoes: filtra por familia, feito, janela 14d.
//  - calcularPadraoHorarioTarefa: limiar N=3, cluster +-30min,
//    concordancia >=80%, microcopy.
//  - calcularSugestaoAlarme: helper de conveniencia (familia + cluster).
//  - estaSilenciado: silenciar_sugestao_ate futuro vs passado.
//  - calcularSilenciarAte: ISO offset +30d.
//
// Tests deterministicos via parametro `agora` fixo.
// Comentarios sem acento (convencao shell/CI).
import {
  calcularPadraoHorarioTarefa,
  calcularSilenciarAte,
  calcularSugestaoAlarme,
  derivarHistoricoMarcacoes,
  estaSilenciado,
  normalizarTituloFamilia,
  JANELA_DIAS,
  N_MINIMO,
  RAIO_CLUSTER_MIN,
  SILENCIO_DIAS,
} from '@/lib/tarefas/inteligenciaTemporal';
import type { Tarefa } from '@/lib/schemas/tarefa';

const AGORA = new Date('2026-05-21T15:00:00-03:00');

// Helper para montar tarefa minima. Default feito=true para o caso
// canonico (marcacao no historico).
function fazerTarefa(over: Partial<Tarefa> = {}): Tarefa {
  return {
    tipo: 'tarefa',
    data: '2026-05-21',
    autor: 'pessoa_a',
    titulo: 'Tomar remédio',
    feito: true,
    feito_em: null,
    categoria: 'saude',
    pessoa_destino: { tipo: 'mim' },
    alarme: null,
    silenciar_sugestao_ate: null,
    ...over,
  };
}

// Constroi ISO datetime feito_em com offset -03:00 (fuso default do
// projeto), a partir de Date no UTC. Para tornar o feito_em coincidir
// com hora local desejada, montamos a partir de iso direto.
function isoEm(diasAtras: number, hora: number, minuto: number): string {
  const base = new Date(AGORA);
  base.setDate(base.getDate() - diasAtras);
  base.setHours(hora);
  base.setMinutes(minuto);
  base.setSeconds(0);
  base.setMilliseconds(0);
  // toISOString gera Z; mantemos compativel com o padrao do projeto
  // (offset arbitrario, schema aceita Z ou +-HH:MM).
  return base.toISOString();
}

describe('normalizarTituloFamilia', () => {
  it('agrupa variantes do mesmo titulo no mesmo slug', () => {
    expect(normalizarTituloFamilia('Tomar remédio')).toBe('tomar-remedio');
    expect(normalizarTituloFamilia('tomar remedio')).toBe('tomar-remedio');
    expect(normalizarTituloFamilia('  Tomar Remédio!  ')).toBe('tomar-remedio');
  });

  it('fallback para titulo apenas simbolos', () => {
    expect(normalizarTituloFamilia('!!!')).toBe('tarefa');
  });
});

describe('derivarHistoricoMarcacoes', () => {
  it('mantem apenas tarefas da familia, feitas, dentro de 14 dias', () => {
    const tarefas: Tarefa[] = [
      fazerTarefa({ feito_em: isoEm(1, 20, 0) }),
      fazerTarefa({ feito_em: isoEm(5, 20, 0) }),
      fazerTarefa({
        titulo: 'Outra coisa',
        feito_em: isoEm(2, 20, 0),
      }),
      fazerTarefa({ feito: false, feito_em: null }),
      fazerTarefa({ feito_em: isoEm(20, 20, 0) }), // fora janela
    ];
    const out = derivarHistoricoMarcacoes(
      tarefas,
      'tomar-remedio',
      AGORA
    );
    expect(out).toHaveLength(2);
  });

  it('ordena resultados asc por timestamp', () => {
    const tarefas: Tarefa[] = [
      fazerTarefa({ feito_em: isoEm(1, 20, 0) }),
      fazerTarefa({ feito_em: isoEm(7, 20, 0) }),
      fazerTarefa({ feito_em: isoEm(3, 20, 0) }),
    ];
    const out = derivarHistoricoMarcacoes(
      tarefas,
      'tomar-remedio',
      AGORA
    );
    const tempos = out.map((d) => d.getTime());
    expect(tempos[0]).toBeLessThan(tempos[1]);
    expect(tempos[1]).toBeLessThan(tempos[2]);
  });

  it('descarta feito_em invalido sem quebrar', () => {
    const tarefas: Tarefa[] = [
      fazerTarefa({ feito_em: isoEm(1, 20, 0) }),
      fazerTarefa({ feito_em: 'lixo' }),
    ];
    const out = derivarHistoricoMarcacoes(
      tarefas,
      'tomar-remedio',
      AGORA
    );
    expect(out).toHaveLength(1);
  });

  it('familia vazia (slug inexistente) retorna []', () => {
    const tarefas: Tarefa[] = [
      fazerTarefa({ feito_em: isoEm(1, 20, 0) }),
    ];
    const out = derivarHistoricoMarcacoes(
      tarefas,
      'familia-inexistente',
      AGORA
    );
    expect(out).toHaveLength(0);
  });

  it('janela configuravel para uso interno', () => {
    const tarefas: Tarefa[] = [
      fazerTarefa({ feito_em: isoEm(3, 20, 0) }),
      fazerTarefa({ feito_em: isoEm(10, 20, 0) }),
    ];
    const out = derivarHistoricoMarcacoes(
      tarefas,
      'tomar-remedio',
      AGORA,
      5
    );
    expect(out).toHaveLength(1);
  });

  it('janela canonica vale 14 dias', () => {
    expect(JANELA_DIAS).toBe(14);
  });
});

describe('calcularPadraoHorarioTarefa', () => {
  function mkDate(diasAtras: number, hora: number, minuto: number): Date {
    const d = new Date(AGORA);
    d.setDate(d.getDate() - diasAtras);
    d.setHours(hora);
    d.setMinutes(minuto);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  }

  it('nao sugere com menos de N_MINIMO marcacoes', () => {
    const marcacoes = [mkDate(1, 20, 0), mkDate(2, 20, 0)];
    const r = calcularPadraoHorarioTarefa(marcacoes, AGORA);
    expect(r.sugerir).toBe(false);
    expect(N_MINIMO).toBe(3);
  });

  it('sugere quando 3 marcacoes concordam em cluster apertado', () => {
    const marcacoes = [
      mkDate(1, 20, 5),
      mkDate(2, 19, 55),
      mkDate(3, 20, 10),
    ];
    const r = calcularPadraoHorarioTarefa(marcacoes, AGORA);
    expect(r.sugerir).toBe(true);
    // Mediana das 3 e ~20:05 (ordem: 19:55, 20:05, 20:10).
    expect(r.hora).toBe('20:05');
    expect(r.motivo).toBe(
      'Você costuma marcar essa tarefa por volta das 20:05.'
    );
    expect(r.total).toBe(3);
  });

  it('aceita 4 em 5 (80% concordancia) e ignora outlier distante', () => {
    const marcacoes = [
      mkDate(1, 20, 0),
      mkDate(2, 20, 5),
      mkDate(3, 19, 55),
      mkDate(4, 20, 10),
      mkDate(5, 8, 0), // outlier longe do cluster
    ];
    const r = calcularPadraoHorarioTarefa(marcacoes, AGORA);
    expect(r.sugerir).toBe(true);
    // Mediana global pega o cluster da noite porque tem mais peso.
    expect(r.hora?.startsWith('20')).toBe(true);
  });

  it('nao sugere quando marcacoes espalham (cluster < 80%)', () => {
    const marcacoes = [
      mkDate(1, 8, 0),
      mkDate(2, 14, 0),
      mkDate(3, 22, 0),
    ];
    const r = calcularPadraoHorarioTarefa(marcacoes, AGORA);
    expect(r.sugerir).toBe(false);
  });

  it('ignora marcacoes fora da janela de 14 dias', () => {
    const marcacoes = [
      mkDate(1, 20, 0),
      mkDate(20, 20, 0),
      mkDate(30, 20, 0),
    ];
    const r = calcularPadraoHorarioTarefa(marcacoes, AGORA);
    expect(r.sugerir).toBe(false);
  });

  it('raio do cluster vale 30 minutos', () => {
    expect(RAIO_CLUSTER_MIN).toBe(30);
  });

  it('marcacoes vazias retorna sugerir false', () => {
    const r = calcularPadraoHorarioTarefa([], AGORA);
    expect(r.sugerir).toBe(false);
  });
});

describe('calcularSugestaoAlarme (helper de conveniencia)', () => {
  it('cruza familia e cluster em uma chamada', () => {
    const tarefas: Tarefa[] = [
      fazerTarefa({ feito_em: isoEm(1, 20, 5) }),
      fazerTarefa({ feito_em: isoEm(2, 20, 0) }),
      fazerTarefa({ feito_em: isoEm(3, 19, 55) }),
      fazerTarefa({
        titulo: 'Outra',
        feito_em: isoEm(1, 8, 0),
      }),
    ];
    const r = calcularSugestaoAlarme(tarefas, 'Tomar remédio', AGORA);
    expect(r.sugerir).toBe(true);
    expect(r.hora?.startsWith('20')).toBe(true);
  });

  it('familia vazia (titulo so simbolos) nao sugere se nao bate slug', () => {
    const tarefas: Tarefa[] = [
      fazerTarefa({
        titulo: 'Tomar remédio',
        feito_em: isoEm(1, 20, 0),
      }),
    ];
    // titulo '!!!' vira slug 'tarefa', diferente de 'tomar-remedio'
    const r = calcularSugestaoAlarme(tarefas, '!!!', AGORA);
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
