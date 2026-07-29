// Testes do handler de resposta de notificacoes de alarme (R-ROT-1-A).
// Cobre:
//  - Soneca dispara registrarSnooze + agendarSnooze com snooze_minutos
//    do alarme persistido.
//  - Desligar cancela snooze pendente.
//  - vaultRoot null -> no-op.
//  - actionId desconhecido -> no-op.
//  - slug ausente -> no-op.
//  - registrarSnooze pode falhar sem bloquear agendarSnooze (snooze e
//    mais critico que aprender historico).
//
// Comentarios sem acento (convencao shell/CI).
import type { Alarme } from '@/lib/schemas/alarme';

const mockLerAlarme = jest.fn<Promise<Alarme | null>, [string, string]>();
const mockRegistrarSnooze = jest.fn<Promise<void>, [string, string, number]>();
const mockAgendarSnooze = jest.fn<Promise<string | null>, [string, number]>();
const mockCancelarSnooze = jest.fn<Promise<void>, [string]>();
// AUDIT-P1-7 item 2b: o Desligar de um alarme 'unica' agora persiste
// ativo:false + ultimo_disparo.
const mockEscreverAlarme = jest.fn<
  Promise<{ uri: string; rel: string }>,
  [string, Alarme, string?]
>();

jest.mock('@/lib/vault/alarmes', () => ({
  __esModule: true,
  lerAlarme: (...args: [string, string]) => mockLerAlarme(...args),
  registrarSnooze: (...args: [string, string, number]) =>
    mockRegistrarSnooze(...args),
  escreverAlarme: (...args: [string, Alarme, string?]) =>
    mockEscreverAlarme(...args),
}));

jest.mock('@/lib/services/alarmesNotificacoes', () => ({
  __esModule: true,
  agendarSnooze: (...args: [string, number]) => mockAgendarSnooze(...args),
  cancelarSnooze: (...args: [string]) => mockCancelarSnooze(...args),
  pedirPermissao: jest.fn(() => Promise.resolve(true)),
}));

import { tratarRespostaNotificacao } from '@/lib/services/notificationResponseListener';
import {
  SONECA_ACTION_ID,
  DESLIGAR_ACTION_ID,
} from '@/lib/services/notificationActions';

const VAULT_ROOT = 'content://test/vault';

function alarmeFixture(over: Partial<Alarme> = {}): Alarme {
  return {
    tipo: 'alarme',
    slug: 'medicacao-manha',
    titulo: 'Medicação',
    horario: '07:00',
    dias_semana: [1],
    recorrencia: 'semanal',
    tag: 'medicacao',
    som: 'gentle',
    ativo: true,
    snooze_minutos: 12,
    criado_em: '2026-04-29T10:00:00-03:00',
    ultimo_disparo: null,
    notification_ids: [],
    snooze_id: null,
    historico_snoozes: [],
    silenciar_sugestao_ate: null,
    ...over,
  };
}

// SEM_SLUG e usado para distinguir "default" de "ausencia explicita"
// (TypeScript default parameter sobrescreve undefined).
const SEM_SLUG = Symbol('sem-slug');
function respFixture(
  actionId: string,
  slug: string | typeof SEM_SLUG = 'medicacao-manha'
) {
  const data = slug === SEM_SLUG ? null : { slug };
  return {
    actionIdentifier: actionId,
    notification: {
      request: {
        content: { data },
      },
    },
  };
}

describe('tratarRespostaNotificacao', () => {
  beforeEach(() => {
    mockLerAlarme.mockReset();
    mockRegistrarSnooze.mockReset();
    mockAgendarSnooze.mockReset();
    mockCancelarSnooze.mockReset();
    mockEscreverAlarme.mockReset();
    mockEscreverAlarme.mockResolvedValue({ uri: 'uri', rel: 'rel' });
  });

  it('Soneca registra historico e agenda snooze com snooze_minutos do alarme', async () => {
    mockLerAlarme.mockResolvedValue(alarmeFixture({ snooze_minutos: 12 }));
    mockRegistrarSnooze.mockResolvedValue();
    mockAgendarSnooze.mockResolvedValue('id-snooze');

    await tratarRespostaNotificacao(respFixture(SONECA_ACTION_ID), VAULT_ROOT);

    expect(mockLerAlarme).toHaveBeenCalledWith(VAULT_ROOT, 'medicacao-manha');
    expect(mockRegistrarSnooze).toHaveBeenCalledWith(
      VAULT_ROOT,
      'medicacao-manha',
      12
    );
    expect(mockAgendarSnooze).toHaveBeenCalledWith('medicacao-manha', 12);
    expect(mockCancelarSnooze).not.toHaveBeenCalled();
  });

  it('Soneca prossegue com agendarSnooze mesmo se registrarSnooze falhar', async () => {
    mockLerAlarme.mockResolvedValue(alarmeFixture({ snooze_minutos: 8 }));
    mockRegistrarSnooze.mockRejectedValue(new Error('IO failed'));
    mockAgendarSnooze.mockResolvedValue('id-snooze');

    await tratarRespostaNotificacao(respFixture(SONECA_ACTION_ID), VAULT_ROOT);

    expect(mockAgendarSnooze).toHaveBeenCalledWith('medicacao-manha', 8);
  });

  it('Soneca no-op quando alarme nao existe', async () => {
    mockLerAlarme.mockResolvedValue(null);

    await tratarRespostaNotificacao(respFixture(SONECA_ACTION_ID), VAULT_ROOT);

    expect(mockRegistrarSnooze).not.toHaveBeenCalled();
    expect(mockAgendarSnooze).not.toHaveBeenCalled();
  });

  it('Desligar cancela snooze pendente', async () => {
    await tratarRespostaNotificacao(respFixture(DESLIGAR_ACTION_ID), VAULT_ROOT);

    expect(mockCancelarSnooze).toHaveBeenCalledWith('medicacao-manha');
    expect(mockRegistrarSnooze).not.toHaveBeenCalled();
    expect(mockAgendarSnooze).not.toHaveBeenCalled();
  });

  // AUDIT-P1-7 item 2b: `ultimo_disparo` existe no schema desde M16 e
  // e' inicializado como null por tres produtores, mas nenhum consumidor
  // o escrevia. Consequencia: alarme 'unica' seguia ativo:true depois
  // de tocar, aparecia ligado na UI e voltava para a fila de boot.
  it('AUDIT-P1-7: Desligar de alarme unica grava ativo:false e ultimo_disparo', async () => {
    mockLerAlarme.mockResolvedValue(
      alarmeFixture({
        slug: 'consulta',
        recorrencia: 'unica',
        data_unica: '2026-07-20T09:00:00-03:00',
        dias_semana: [],
        ativo: true,
      })
    );

    await tratarRespostaNotificacao(
      respFixture(DESLIGAR_ACTION_ID, 'consulta'),
      VAULT_ROOT
    );

    expect(mockCancelarSnooze).toHaveBeenCalledWith('consulta');
    expect(mockEscreverAlarme).toHaveBeenCalledTimes(1);
    const [root, meta] = mockEscreverAlarme.mock.calls[0];
    expect(root).toBe(VAULT_ROOT);
    expect(meta.slug).toBe('consulta');
    expect(meta.ativo).toBe(false);
    expect(typeof meta.ultimo_disparo).toBe('string');
    expect(meta.ultimo_disparo).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/
    );
  });

  it('AUDIT-P1-7: Desligar de alarme recorrente nao desativa o alarme', async () => {
    mockLerAlarme.mockResolvedValue(alarmeFixture({ recorrencia: 'semanal' }));

    await tratarRespostaNotificacao(respFixture(DESLIGAR_ACTION_ID), VAULT_ROOT);

    expect(mockCancelarSnooze).toHaveBeenCalledWith('medicacao-manha');
    expect(mockEscreverAlarme).not.toHaveBeenCalled();
  });

  it('AUDIT-P1-7: falha de escrita no Desligar nao quebra o handler', async () => {
    mockLerAlarme.mockResolvedValue(
      alarmeFixture({
        slug: 'consulta',
        recorrencia: 'unica',
        data_unica: '2026-07-20T09:00:00-03:00',
        dias_semana: [],
      })
    );
    mockEscreverAlarme.mockRejectedValue(new Error('IO failed'));

    await expect(
      tratarRespostaNotificacao(
        respFixture(DESLIGAR_ACTION_ID, 'consulta'),
        VAULT_ROOT
      )
    ).resolves.toBeUndefined();
    expect(mockCancelarSnooze).toHaveBeenCalledWith('consulta');
  });

  it('no-op quando vaultRoot null', async () => {
    await tratarRespostaNotificacao(respFixture(SONECA_ACTION_ID), null);

    expect(mockLerAlarme).not.toHaveBeenCalled();
    expect(mockAgendarSnooze).not.toHaveBeenCalled();
  });

  it('no-op quando slug ausente', async () => {
    await tratarRespostaNotificacao(respFixture(SONECA_ACTION_ID, SEM_SLUG), VAULT_ROOT);

    expect(mockLerAlarme).not.toHaveBeenCalled();
  });

  it('no-op para actionId desconhecido', async () => {
    await tratarRespostaNotificacao(respFixture('outro.action'), VAULT_ROOT);

    expect(mockLerAlarme).not.toHaveBeenCalled();
    expect(mockCancelarSnooze).not.toHaveBeenCalled();
  });
});
