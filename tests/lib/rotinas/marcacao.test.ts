// Testes dos helpers puros de marcacao de rotina (R-SF-3). Cobre:
//  - appendMarcacao: idempotencia, ordenacao crescente, cap FIFO.
//  - calcularTimeline: ordem reversa, tamanho limite, descarta TS
//    invalido.
//  - calcularAderenciaSemanal: %, contagem de dias, janela
//    configuravel.
//  - calcularSilenciarLembreteAte: fim do dia local TZ -03:00.
//  - estaLembreteSilenciado: futuro vs passado vs null.
//
// Tests deterministicos via parametro `agora` fixo (sem mock global).
//
// Comentarios sem acento (convencao shell/CI).
import {
  appendMarcacao,
  calcularAderenciaSemanal,
  calcularSilenciarLembreteAte,
  calcularTimeline,
  estaLembreteSilenciado,
  JANELA_ADERENCIA_DIAS,
  TIMELINE_TAMANHO_DEFAULT,
} from '@/lib/rotinas/marcacao';
import type { RotinaMarcacao } from '@/lib/schemas/rotina_marcacao';
import { MAX_MARCACOES_DIA } from '@/lib/schemas/rotina_marcacao';

// 21/maio/2026 12:00 UTC == 09:00 horario de Sao Paulo (UTC-3).
const AGORA = new Date('2026-05-21T12:00:00+00:00');

function isoAgora(deltaSeg: number = 0): string {
  const ms = AGORA.getTime() + deltaSeg * 1000;
  return new Date(ms).toISOString().replace('Z', '-03:00');
}

function entrada(
  diasAtras: number,
  marcacoes: readonly string[]
): RotinaMarcacao {
  const ms = AGORA.getTime() - diasAtras * 24 * 60 * 60 * 1000;
  const ymd = new Date(ms + -180 * 60_000).toISOString().slice(0, 10);
  return {
    tipo: 'rotina_marcacao',
    rotina_slug: 'venvanse',
    data: ymd,
    autor: 'pessoa_a',
    marcacoes: [...marcacoes],
    silenciar_lembrete_ate: null,
  };
}

describe('appendMarcacao', () => {
  it('adiciona novo timestamp e ordena crescente', () => {
    const ts1 = '2026-05-21T08:30:00-03:00';
    const ts2 = '2026-05-21T12:15:00-03:00';
    const ts3 = '2026-05-21T20:00:00-03:00';
    expect(appendMarcacao([ts1, ts3], ts2)).toEqual([ts1, ts2, ts3]);
  });

  it('idempotente quando timestamp ja presente (no-op com sort)', () => {
    const ts1 = '2026-05-21T08:30:00-03:00';
    const ts2 = '2026-05-21T20:00:00-03:00';
    expect(appendMarcacao([ts2, ts1], ts1)).toEqual([ts1, ts2]);
  });

  it('FIFO ao exceder cap (mantem mais recentes)', () => {
    const base = Array.from({ length: 5 }, (_, i) =>
      new Date(AGORA.getTime() + i * 1000)
        .toISOString()
        .replace('Z', '-03:00')
    );
    const novo = new Date(AGORA.getTime() + 10 * 1000)
      .toISOString()
      .replace('Z', '-03:00');
    const resultado = appendMarcacao(base, novo, 3);
    expect(resultado).toHaveLength(3);
    // Deve ter descartado os 3 mais antigos.
    expect(resultado[2]).toBe(novo);
  });

  it('respeita cap default MAX_MARCACOES_DIA', () => {
    // Smoke: cap real e 50; nao geramos 50 entradas, so sanity check
    // que o tipo bate.
    expect(MAX_MARCACOES_DIA).toBe(50);
  });
});

describe('calcularTimeline', () => {
  it('agrega varias entradas em ordem reversa', () => {
    const entradas: RotinaMarcacao[] = [
      entrada(2, ['2026-05-19T08:00:00-03:00']),
      entrada(0, [
        '2026-05-21T08:30:00-03:00',
        '2026-05-21T20:00:00-03:00',
      ]),
      entrada(1, ['2026-05-20T09:15:00-03:00']),
    ];
    const timeline = calcularTimeline(entradas, 10);
    expect(timeline).toEqual([
      '2026-05-21T20:00:00-03:00',
      '2026-05-21T08:30:00-03:00',
      '2026-05-20T09:15:00-03:00',
      '2026-05-19T08:00:00-03:00',
    ]);
  });

  it('respeita tamanho limite', () => {
    const entradas: RotinaMarcacao[] = [
      entrada(0, [
        '2026-05-21T08:00:00-03:00',
        '2026-05-21T12:00:00-03:00',
        '2026-05-21T20:00:00-03:00',
      ]),
    ];
    expect(calcularTimeline(entradas, 2)).toHaveLength(2);
  });

  it('aplica TIMELINE_TAMANHO_DEFAULT quando omitido', () => {
    expect(TIMELINE_TAMANHO_DEFAULT).toBe(7);
    const muitas = Array.from({ length: 20 }, (_, i) =>
      new Date(AGORA.getTime() - i * 60_000)
        .toISOString()
        .replace('Z', '-03:00')
    );
    const entradas: RotinaMarcacao[] = [entrada(0, muitas)];
    expect(calcularTimeline(entradas)).toHaveLength(7);
  });

  it('descarta ts invalido sem quebrar', () => {
    const entradas: RotinaMarcacao[] = [
      entrada(0, ['2026-05-21T08:00:00-03:00', 'lixo']),
    ];
    expect(calcularTimeline(entradas)).toHaveLength(1);
  });

  it('retorna [] quando nenhuma marcacao', () => {
    expect(calcularTimeline([])).toEqual([]);
  });
});

describe('calcularAderenciaSemanal', () => {
  it('100% quando 7 de 7 dias tem marcacao', () => {
    const entradas: RotinaMarcacao[] = [];
    for (let i = 0; i < 7; i++) {
      entradas.push(entrada(i, [isoAgora(-i * 24 * 60 * 60)]));
    }
    const r = calcularAderenciaSemanal(entradas, AGORA);
    expect(r.diasMarcados).toBe(7);
    expect(r.porcentagem).toBe(100);
    expect(r.janelaDias).toBe(7);
  });

  it('5 de 7 dias = 71%', () => {
    const entradas: RotinaMarcacao[] = [];
    for (const i of [0, 1, 2, 4, 5]) {
      entradas.push(entrada(i, [isoAgora(-i * 24 * 60 * 60)]));
    }
    const r = calcularAderenciaSemanal(entradas, AGORA);
    expect(r.diasMarcados).toBe(5);
    expect(r.porcentagem).toBe(71);
  });

  it('0% quando lista vazia', () => {
    const r = calcularAderenciaSemanal([], AGORA);
    expect(r.diasMarcados).toBe(0);
    expect(r.porcentagem).toBe(0);
  });

  it('multiplas marcacoes no mesmo dia contam 1 vez', () => {
    const entradas: RotinaMarcacao[] = [
      entrada(0, [
        isoAgora(),
        isoAgora(3600),
        isoAgora(7200),
      ]),
    ];
    const r = calcularAderenciaSemanal(entradas, AGORA);
    expect(r.diasMarcados).toBe(1);
  });

  it('janela configuravel para uso interno', () => {
    const entradas: RotinaMarcacao[] = [];
    for (let i = 0; i < 7; i++) {
      entradas.push(entrada(i, [isoAgora(-i * 24 * 60 * 60)]));
    }
    const r = calcularAderenciaSemanal(entradas, AGORA, 3);
    expect(r.janelaDias).toBe(3);
    expect(r.diasMarcados).toBe(3);
    expect(r.porcentagem).toBe(100);
  });

  it('JANELA_ADERENCIA_DIAS canonica e 7', () => {
    expect(JANELA_ADERENCIA_DIAS).toBe(7);
  });

  it('ignora marcacoes fora da janela', () => {
    const entradas: RotinaMarcacao[] = [
      entrada(0, [isoAgora()]),
      // Fora da janela de 7 dias:
      entrada(15, [
        new Date(AGORA.getTime() - 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace('Z', '-03:00'),
      ]),
    ];
    const r = calcularAderenciaSemanal(entradas, AGORA);
    expect(r.diasMarcados).toBe(1);
  });
});

describe('calcularSilenciarLembreteAte', () => {
  it('retorna fim do dia local em ISO -03:00', () => {
    // 21/maio/2026 12:00 UTC == 09:00 SP. Fim do dia local SP =
    // 23:59:59 -03:00 == 02:59:59 do dia seguinte UTC.
    const ate = calcularSilenciarLembreteAte(AGORA);
    expect(ate).toBe('2026-05-21T23:59:59-03:00');
  });

  it('aceita referencia em segundos diferentes do mesmo dia', () => {
    const manha = new Date('2026-05-21T11:00:00+00:00');
    const tarde = new Date('2026-05-21T22:00:00+00:00');
    expect(calcularSilenciarLembreteAte(manha)).toBe(
      '2026-05-21T23:59:59-03:00'
    );
    // 22:00 UTC == 19:00 SP do mesmo dia.
    expect(calcularSilenciarLembreteAte(tarde)).toBe(
      '2026-05-21T23:59:59-03:00'
    );
  });

  it('vira para o proximo dia local em torno de meia-noite UTC', () => {
    // 22/maio 02:30 UTC == 21/maio 23:30 SP. Fim do dia local ainda
    // e' 21/maio 23:59:59 -03:00.
    const limiar = new Date('2026-05-22T02:30:00+00:00');
    expect(calcularSilenciarLembreteAte(limiar)).toBe(
      '2026-05-21T23:59:59-03:00'
    );
  });
});

describe('estaLembreteSilenciado', () => {
  it('false quando campo null ou undefined', () => {
    expect(estaLembreteSilenciado(null, AGORA)).toBe(false);
    expect(estaLembreteSilenciado(undefined, AGORA)).toBe(false);
  });

  it('true quando ate esta no futuro', () => {
    // Constroi ISO com offset Z (UTC explicito) pra comparacao
    // direta sem confusao com -03:00.
    const futuro = new Date(AGORA.getTime() + 60 * 1000).toISOString();
    expect(estaLembreteSilenciado(futuro, AGORA)).toBe(true);
  });

  it('false quando ate ja passou', () => {
    const passado = new Date(AGORA.getTime() - 60 * 1000).toISOString();
    expect(estaLembreteSilenciado(passado, AGORA)).toBe(false);
  });

  it('false quando string invalida', () => {
    expect(estaLembreteSilenciado('lixo', AGORA)).toBe(false);
  });
});
