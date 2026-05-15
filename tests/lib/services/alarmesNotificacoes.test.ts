// Testes do wrapper de expo-notifications para alarmes pessoais (M16).
// Cobre:
//  - parseHorario aceita HH:MM e HH:MM sem zero a esquerda.
//  - agendarAlarme cria 1 schedule por dia da semana com identifier
//    canonico ouroboros.alarme.<slug>.d<N>.
//  - agendarAlarme retorna estourou=true quando ultrapassaria 64.
//  - cancelarAlarme cancela todos os schedules do prefixo do slug.
//  - agendarSnooze cria one-shot com identifier .snooze.
//  - cancelarSnooze cancela schedule do .snooze.
//  - reagendarAlarmes cancela tudo do prefixo e agenda apenas ativos.
//  - listarAgendados filtra por prefixo canonico.
//
// Comentarios sem acento (convencao shell/CI).
import {
  agendarAlarme,
  agendarSnooze,
  cancelarAlarme,
  cancelarSnooze,
  contarSchedulesAlarmes,
  listarAgendados,
  parseHorario,
  reagendarAlarmes,
} from '@/lib/services/alarmesNotificacoes';
import * as Notifications from 'expo-notifications';
import { LIMITE_SCHEDULES, type Alarme } from '@/lib/schemas/alarme';

const memInterna = (
  Notifications as unknown as { __memory: Map<string, unknown> }
).__memory;

function fixture(over: Partial<Alarme> = {}): Alarme {
  return {
    tipo: 'alarme',
    slug: 'medicacao-manha',
    titulo: 'Medicação da manhã',
    horario: '08:30',
    dias_semana: [1, 2, 3, 4, 5],
    // M30: default 'semanal' explicito para satisfazer output type do
    // zod parse (recorrencia required apos default ser aplicado).
    recorrencia: 'semanal',
    tag: 'medicacao',
    som: 'gentle',
    ativo: true,
    snooze_minutos: 5,
    criado_em: '2026-04-29T10:00:00-03:00',
    ultimo_disparo: null,
    notification_ids: [],
    snooze_id: null,
    ...over,
  };
}

beforeEach(() => {
  memInterna.clear();
  jest.clearAllMocks();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
});

describe('parseHorario', () => {
  it('aceita 08:30', () => {
    expect(parseHorario('08:30')).toEqual({ hour: 8, minute: 30 });
  });

  it('aceita 8:30 sem zero a esquerda', () => {
    expect(parseHorario('8:30')).toEqual({ hour: 8, minute: 30 });
  });

  it('rejeita 25:00', () => {
    expect(parseHorario('25:00')).toBeNull();
  });

  it('rejeita 09:60', () => {
    expect(parseHorario('09:60')).toBeNull();
  });

  it('rejeita string vazia', () => {
    expect(parseHorario('')).toBeNull();
  });
});

describe('agendarAlarme', () => {
  it('cria 1 schedule por dia da semana com identifier canonico', async () => {
    const a = fixture({ slug: 'teste', dias_semana: [1, 3, 5] });
    const res = await agendarAlarme(a);
    expect(res.estourou).toBe(false);
    expect(res.ids).toHaveLength(3);
    expect(res.ids).toEqual([
      'ouroboros.alarme.teste.d1',
      'ouroboros.alarme.teste.d3',
      'ouroboros.alarme.teste.d5',
    ]);
    expect(memInterna.size).toBe(3);
  });

  it('cancela schedules previos do mesmo slug antes', async () => {
    const a = fixture({ slug: 'reagendado', dias_semana: [1] });
    await agendarAlarme(a);
    await agendarAlarme(a);
    // Mesmo apos 2 chamadas, so 1 schedule por dia (cancelado e re-criado).
    expect(memInterna.size).toBe(1);
  });

  it('retorna estourou=true quando ultrapassa cap', async () => {
    // Preenche memoria ate beira do cap.
    for (let i = 0; i < LIMITE_SCHEDULES; i++) {
      memInterna.set(`ouroboros.alarme.fake-${i}.d0`, {
        identifier: `ouroboros.alarme.fake-${i}.d0`,
      });
    }
    const a = fixture({ slug: 'novo', dias_semana: [0] });
    const res = await agendarAlarme(a);
    expect(res.estourou).toBe(true);
    expect(res.ids).toEqual([]);
  });

  it('retorna ids=[] quando permissao negada', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    });
    const a = fixture();
    const res = await agendarAlarme(a);
    expect(res.ids).toEqual([]);
    expect(res.estourou).toBe(false);
  });

  it('rejeita alarme com schema invalido sem chamar agendamento', async () => {
    const inv = fixture({ horario: 'abc' });
    const res = await agendarAlarme(inv);
    expect(res.ids).toEqual([]);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('passa weekday convertido (0=domingo -> 1)', async () => {
    const a = fixture({ slug: 'dom', dias_semana: [0] });
    await agendarAlarme(a);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'ouroboros.alarme.dom.d0',
        trigger: expect.objectContaining({ weekday: 1 }),
      })
    );
  });

  it('inclui categoria e canal no schedule', async () => {
    const a = fixture({ slug: 'cat', dias_semana: [2] });
    await agendarAlarme(a);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          categoryIdentifier: 'alarme',
          title: 'Medicação da manhã',
          body: '',
          sound: 'gentle.wav',
        }),
        trigger: expect.objectContaining({
          channelId: 'ouroboros-default-v2',
        }),
      })
    );
  });
});

describe('cancelarAlarme', () => {
  it('cancela todos os schedules do prefixo do slug', async () => {
    const a = fixture({ slug: 'multi', dias_semana: [1, 3, 5] });
    await agendarAlarme(a);
    expect(memInterna.size).toBe(3);
    await cancelarAlarme('multi');
    expect(memInterna.size).toBe(0);
  });

  it('nao toca schedules de outros slugs', async () => {
    await agendarAlarme(fixture({ slug: 'a', dias_semana: [1] }));
    await agendarAlarme(fixture({ slug: 'b', dias_semana: [2] }));
    await cancelarAlarme('a');
    expect(memInterna.size).toBe(1);
    const remanescente = Array.from(memInterna.keys())[0];
    expect(remanescente).toBe('ouroboros.alarme.b.d2');
  });
});

describe('agendarSnooze / cancelarSnooze', () => {
  it('cria one-shot com identifier .snooze', async () => {
    const id = await agendarSnooze('teste', 5);
    expect(id).toBe('ouroboros.alarme.teste.snooze');
    expect(memInterna.has('ouroboros.alarme.teste.snooze')).toBe(true);
  });

  it('cancela snooze previo antes de agendar novo', async () => {
    await agendarSnooze('teste', 5);
    await agendarSnooze('teste', 10);
    // Mesmo apos 2 chamadas, so 1 snooze ativo.
    const ids = Array.from(memInterna.keys()).filter((k) =>
      k.startsWith('ouroboros.alarme.teste.snooze')
    );
    expect(ids).toHaveLength(1);
  });

  it('rejeita minutos fora de 1-60', async () => {
    expect(await agendarSnooze('teste', 0)).toBeNull();
    expect(await agendarSnooze('teste', 61)).toBeNull();
  });

  it('cancelarSnooze remove schedule do .snooze', async () => {
    await agendarSnooze('teste', 5);
    await cancelarSnooze('teste');
    expect(memInterna.has('ouroboros.alarme.teste.snooze')).toBe(false);
  });

  it('passa categoria e canal no snooze', async () => {
    await agendarSnooze('cat-snooze', 5);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          categoryIdentifier: 'alarme',
          sound: false,
          title: 'Soneca',
        }),
        trigger: expect.objectContaining({
          channelId: 'ouroboros-default-v2',
          repeats: false,
        }),
      })
    );
  });
});

describe('contarSchedulesAlarmes', () => {
  it('conta apenas schedules do prefixo canonico', async () => {
    await agendarAlarme(fixture({ slug: 'a', dias_semana: [1] }));
    await agendarAlarme(fixture({ slug: 'b', dias_semana: [1, 2] }));
    // Mistura outro identifier para verificar filtro.
    memInterna.set('outra.feature.x', { identifier: 'outra.feature.x' });
    expect(await contarSchedulesAlarmes()).toBe(3);
  });
});

describe('listarAgendados', () => {
  it('retorna so identifiers do prefixo', async () => {
    await agendarAlarme(fixture({ slug: 'foo', dias_semana: [1] }));
    memInterna.set('ouroboros.lembrete.medicacao', {
      identifier: 'ouroboros.lembrete.medicacao',
    });
    const lista = await listarAgendados();
    expect(lista).toContain('ouroboros.alarme.foo.d1');
    expect(lista).not.toContain('ouroboros.lembrete.medicacao');
  });
});

// M30: testes das 4 recorrencias canonicas. Cobertura:
//  - 'unica':   trigger DATE com data_unica, identifier .once.
//  - 'diaria':  trigger DAILY com hour/minute, identifier .daily.
//  - 'semanal': trigger WEEKLY (legacy v1, ja coberto em testes acima).
//  - 'mensal':  trigger MONTHLY com day/hour/minute, identifier .monthly.
describe('agendarAlarme — recorrencias v2 (M30)', () => {
  it('unica: cria 1 schedule DATE com identifier .once', async () => {
    const a = fixture({
      slug: 'consulta',
      recorrencia: 'unica',
      data_unica: '2026-12-25T15:30:00-03:00',
      dias_semana: [],
    });
    const res = await agendarAlarme(a);
    expect(res.estourou).toBe(false);
    expect(res.ids).toEqual(['ouroboros.alarme.consulta.once']);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'ouroboros.alarme.consulta.once',
        trigger: expect.objectContaining({
          type: 'date',
          channelId: 'ouroboros-default-v2',
        }),
      })
    );
  });

  it('diaria: cria 1 schedule DAILY com identifier .daily', async () => {
    const a = fixture({
      slug: 'medicacao-diaria',
      recorrencia: 'diaria',
      dias_semana: [],
    });
    const res = await agendarAlarme(a);
    expect(res.estourou).toBe(false);
    expect(res.ids).toEqual(['ouroboros.alarme.medicacao-diaria.daily']);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'ouroboros.alarme.medicacao-diaria.daily',
        trigger: expect.objectContaining({
          type: 'daily',
          hour: 8,
          minute: 30,
          channelId: 'ouroboros-default-v2',
        }),
      })
    );
  });

  it('semanal: comportamento v1 preservado (1 schedule por dia)', async () => {
    const a = fixture({
      slug: 'sem',
      recorrencia: 'semanal',
      dias_semana: [1, 3],
    });
    const res = await agendarAlarme(a);
    expect(res.ids).toEqual([
      'ouroboros.alarme.sem.d1',
      'ouroboros.alarme.sem.d3',
    ]);
  });

  it('mensal: cria 1 schedule MONTHLY com day derivado de data_unica', async () => {
    const a = fixture({
      slug: 'aluguel',
      recorrencia: 'mensal',
      data_unica: '2026-05-15T10:00:00-03:00',
      dias_semana: [],
    });
    const res = await agendarAlarme(a);
    expect(res.estourou).toBe(false);
    expect(res.ids).toEqual(['ouroboros.alarme.aluguel.monthly']);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'ouroboros.alarme.aluguel.monthly',
        trigger: expect.objectContaining({
          type: 'monthly',
          day: 15,
          hour: 8,
          minute: 30,
          channelId: 'ouroboros-default-v2',
        }),
      })
    );
  });

  it('mensal sem data_unica: usa day=1 como default conservador', async () => {
    const a = fixture({
      slug: 'mensal-default',
      recorrencia: 'mensal',
      dias_semana: [],
    });
    const res = await agendarAlarme(a);
    expect(res.ids).toEqual(['ouroboros.alarme.mensal-default.monthly']);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ type: 'monthly', day: 1 }),
      })
    );
  });

  it('cap: nao-semanal conta apenas 1 schedule novo', async () => {
    // Preenche memoria ate beira menos 1 do cap.
    for (let i = 0; i < LIMITE_SCHEDULES; i++) {
      memInterna.set(`ouroboros.alarme.fake-${i}.daily`, {
        identifier: `ouroboros.alarme.fake-${i}.daily`,
      });
    }
    const a = fixture({
      slug: 'novo-diario',
      recorrencia: 'diaria',
      dias_semana: [],
    });
    const res = await agendarAlarme(a);
    expect(res.estourou).toBe(true);
    expect(res.ids).toEqual([]);
  });

  it('unica sem data_unica: rejeita schema (cross-field) e nao agenda', async () => {
    const a = fixture({
      slug: 'unica-sem-data',
      recorrencia: 'unica',
      dias_semana: [],
      // data_unica intencionalmente ausente
    });
    const res = await agendarAlarme(a);
    expect(res.ids).toEqual([]);
    // Nao deve ter chamado scheduleNotificationAsync para este alarme
    // (parsed.success === false retorna cedo).
    const chamadas = (
      Notifications.scheduleNotificationAsync as jest.Mock
    ).mock.calls.filter((c) =>
      String(c[0]?.identifier ?? '').includes('unica-sem-data')
    );
    expect(chamadas).toHaveLength(0);
  });
});

describe('reagendarAlarmes', () => {
  it('cancela tudo do prefixo e re-cria apenas ativos', async () => {
    // Schedules antigos de outra encarnacao do app.
    memInterna.set('ouroboros.alarme.legado.d1', {
      identifier: 'ouroboros.alarme.legado.d1',
    });
    memInterna.set('ouroboros.lembrete.medicacao', {
      identifier: 'ouroboros.lembrete.medicacao',
    });

    const carregar = jest
      .fn()
      .mockResolvedValue([
        fixture({ slug: 'ativo', dias_semana: [1, 2], ativo: true }),
        fixture({ slug: 'inativo', dias_semana: [3], ativo: false }),
      ]);

    await reagendarAlarmes(carregar);

    // Legado removido (era prefixo nosso); inativo nao re-criado;
    // ativo re-criado com 2 ids; lembrete preservado (prefixo distinto).
    const ids = Array.from(memInterna.keys()).sort();
    expect(ids).toEqual([
      'ouroboros.alarme.ativo.d1',
      'ouroboros.alarme.ativo.d2',
      'ouroboros.lembrete.medicacao',
    ]);
  });

  it('com lista vazia, apenas limpa', async () => {
    memInterna.set('ouroboros.alarme.x.d0', {
      identifier: 'ouroboros.alarme.x.d0',
    });
    const carregar = jest.fn().mockResolvedValue([]);
    await reagendarAlarmes(carregar);
    expect(memInterna.has('ouroboros.alarme.x.d0')).toBe(false);
  });
});
