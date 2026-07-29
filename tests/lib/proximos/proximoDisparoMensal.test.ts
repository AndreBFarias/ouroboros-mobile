// AUDIT-P1-7 item 1: alarme mensal no card "Proximos" da Tela Hoje.
//
// proximoDisparo() derivava o dia do mes de partesLocaisBRT(agora).dia
// -- o dia de HOJE -- em vez do dia configurado em data_unica. Efeito:
// um alarme mensal do dia 5 era anunciado na Home em todos os dias do
// mes, enquanto a notificacao real (alarmesNotificacoes.ts, case
// 'mensal') tocava certo, so no dia 5. Home e agendador discordavam
// sobre o mesmo campo.
//
// Estes testes cravam a concordancia: o dia sai de data_unica com
// getDate(), default 1, exatamente como o agendador nativo faz.
//
// Comentarios sem acento (convencao shell/CI).
import { __test__ } from '@/lib/hooks/useProximos';
import type { Alarme } from '@/lib/schemas/alarme';

const { proximoDisparo } = __test__;

function alarmeMensal(over: Partial<Alarme> = {}): Alarme {
  return {
    tipo: 'alarme',
    slug: 'pagar-aluguel',
    titulo: 'Pagar aluguel',
    horario: '09:00',
    dias_semana: [],
    recorrencia: 'mensal',
    data_unica: '2026-08-05T09:00:00-03:00',
    tag: 'outro',
    som: 'gentle',
    ativo: true,
    snooze_minutos: 5,
    criado_em: '2026-07-01T10:00:00-03:00',
    ultimo_disparo: null,
    notification_ids: [],
    snooze_id: null,
    historico_snoozes: [],
    silenciar_sugestao_ate: null,
    ...over,
  };
}

describe('proximoDisparo — recorrencia mensal (AUDIT-P1-7)', () => {
  it('dia 5 visto do dia 12 aponta para o dia 5 do mes seguinte', () => {
    const iso = proximoDisparo(
      alarmeMensal(),
      new Date('2026-08-12T10:00:00-03:00')
    );
    expect(iso).toBe('2026-09-05T09:00:00-03:00');
  });

  it('dia 5 visto do dia 3 aponta para o dia 5 deste mes', () => {
    const iso = proximoDisparo(
      alarmeMensal(),
      new Date('2026-08-03T10:00:00-03:00')
    );
    expect(iso).toBe('2026-08-05T09:00:00-03:00');
  });

  // Regressao direta do bug: com p.dia o candidato caia sempre em HOJE,
  // e a Home listava o alarme mensal todo santo dia do mes.
  it('nao aponta para hoje quando hoje nao e o dia configurado', () => {
    const iso = proximoDisparo(
      alarmeMensal(),
      new Date('2026-08-12T08:00:00-03:00')
    );
    expect(iso).not.toBeNull();
    expect(iso).not.toContain('2026-08-12');
  });

  it('sem data_unica cai no dia 1, mesmo default do agendador nativo', () => {
    const alarme = alarmeMensal();
    delete (alarme as { data_unica?: string }).data_unica;
    const iso = proximoDisparo(alarme, new Date('2026-08-12T10:00:00-03:00'));
    expect(iso).toBe('2026-09-01T09:00:00-03:00');
  });

  it('data_unica invalida cai no dia 1 (mesmo criterio do agendador)', () => {
    const iso = proximoDisparo(
      alarmeMensal({ data_unica: 'nao-e-data' as unknown as string }),
      new Date('2026-08-12T10:00:00-03:00')
    );
    expect(iso).toBe('2026-09-01T09:00:00-03:00');
  });

  // Mes curto: dia 31 nao existe em fevereiro, entao o mes corrente e
  // pulado. Nao da para depender de Date rejeitar a data: verificado em
  // runtime que `new Date('2026-02-31T09:00:00-03:00')` escorrega para
  // 3 de marco em vez de virar Invalid Date -- sem a checagem explicita
  // o card exibiria a string de um dia que nao existe.
  it('dia 31 em fevereiro pula para o mes seguinte valido', () => {
    const iso = proximoDisparo(
      alarmeMensal({ data_unica: '2026-01-31T09:00:00-03:00' }),
      new Date('2026-02-10T10:00:00-03:00')
    );
    expect(iso).toBe('2026-03-31T09:00:00-03:00');
  });

  it('vira o ano: dia 5 visto de 12/dez aponta para 5/jan seguinte', () => {
    const iso = proximoDisparo(
      alarmeMensal(),
      new Date('2026-12-12T10:00:00-03:00')
    );
    expect(iso).toBe('2027-01-05T09:00:00-03:00');
  });

  it('alarme inativo continua sem disparo', () => {
    const iso = proximoDisparo(
      alarmeMensal({ ativo: false }),
      new Date('2026-08-03T10:00:00-03:00')
    );
    expect(iso).toBeNull();
  });
});
