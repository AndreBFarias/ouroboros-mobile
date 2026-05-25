// Testes do puxadorExercicio (HC ExerciseSession -> Vault treino_sessao).
// R-INT-3-HC-AUTOPULL-EXERCICIO.
//
// Cenarios:
//   1. readRecords vazio -> {novos: 0, erro: null}, zero writes.
//   2. tipo do puxador e' ExerciseSession.
//   3. 2 sessoes novas -> 2 escreverTreino com mapeamento PT-BR e
//      fonte humanizada.
//   4. Idempotencia: id ja persistido (via listarTreinos) e' pulado.
//   5. Idempotencia intra-lote: id duplicado no mesmo readRecords
//      escreve uma vez so.
//   6. exerciseType desconhecido -> fallback "Atividade fisica".
//   7. title proprio do app vira base da rotina; sem title usa o tipo.
//   8. duracao calculada de start/end e clampada ao range do schema.
//   9. record sem metadata.id e' ignorado.
//   10. readRecords lanca -> {novos: 0, erro: msg}.
//   11. vault root null -> {novos: 0, erro: vault_root_indisponivel}.
//   12. pessoa = pessoa_b -> autor escrito com pessoa_b.
//
// Mocka a bridge nativa e o writer vault/treinos (escreverTreino +
// listarTreinos). Usa store real para useSettings e useVault, mesma
// estrategia de passos.test.ts e scheduler.test.ts.
//
// Comentarios sem acento.
const mockReadRecords = jest.fn();
const mockEscreverTreino = jest.fn();
const mockListarTreinos = jest.fn();

jest.mock('../../../modules/health-connect/src', () => ({
  __esModule: true,
  readRecords: (...args: unknown[]) => mockReadRecords(...args),
}));

jest.mock('@/lib/vault/treinos', () => ({
  __esModule: true,
  escreverTreino: (...args: unknown[]) => mockEscreverTreino(...args),
  listarTreinos: (...args: unknown[]) => mockListarTreinos(...args),
}));

import { puxadorExercicio } from '@/lib/health/puxadores/exercicio';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

function sessao(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    metadata: { id: 'uuid-1', dataOrigin: { packageName: 'com.strava' } },
    startTime: '2026-05-21T18:00:00.000Z',
    endTime: '2026-05-21T18:45:00.000Z',
    exerciseType: 77, // Caminhada
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEscreverTreino.mockResolvedValue({
    uri: 'content://test/vault/treinos/x.md',
    rel: 'treinos/x.md',
  });
  // Por padrao nenhum treino pre-existente (idempotencia limpa).
  mockListarTreinos.mockResolvedValue([]);
  useVault.setState({ vaultRoot: VAULT_ROOT });
  useSettings.setState({
    pessoa: {
      ativa: 'pessoa_a',
      vaultCompartilhado: true,
      tipoCompanhia: 'sozinho',
    },
  });
});

afterAll(() => {
  useVault.setState({ vaultRoot: null });
});

describe('puxadorExercicio', () => {
  it('cenario 2: tipo ExerciseSession', () => {
    expect(puxadorExercicio.tipo).toBe('ExerciseSession');
  });

  it('cenario 1: readRecords vazio -> novos=0, erro=null, zero writes', async () => {
    mockReadRecords.mockResolvedValueOnce({ records: [] });
    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });
    expect(r).toEqual({ novos: 0, erro: null });
    expect(mockEscreverTreino).not.toHaveBeenCalled();
  });

  it('cenario 3: 2 sessoes novas -> 2 writes com mapeamento e origem', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        sessao({
          metadata: { id: 'uuid-a', dataOrigin: { packageName: 'com.strava' } },
          exerciseType: 56, // Corrida
        }),
        sessao({
          metadata: {
            id: 'uuid-b',
            dataOrigin: { packageName: 'com.google.android.apps.healthdata' },
          },
          exerciseType: 8, // Ciclismo
          startTime: '2026-05-20T07:00:00.000Z',
          endTime: '2026-05-20T08:00:00.000Z',
        }),
      ],
    });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 2, erro: null });
    expect(mockEscreverTreino).toHaveBeenCalledTimes(2);

    const [, slug0, meta0] = mockEscreverTreino.mock.calls[0];
    expect(slug0).toBe('hc-uuid-a');
    expect(meta0.tipo).toBe('treino_sessao');
    expect(meta0.fonte_hc_id).toBe('uuid-a');
    expect(meta0.fonte_hc_origin).toBe('Strava');
    expect(meta0.exercicio_hc_type).toBe(56);
    expect(meta0.exercicios[0].nome).toBe('Corrida');
    expect(meta0.rotina).toContain('Corrida');
    expect(meta0.rotina).toContain('Strava');
    expect(meta0.data).toBe('2026-05-21T18:00:00.000Z');

    const [, slug1, meta1] = mockEscreverTreino.mock.calls[1];
    expect(slug1).toBe('hc-uuid-b');
    expect(meta1.fonte_hc_origin).toBe('Conexão Saúde');
    expect(meta1.exercicios[0].nome).toBe('Ciclismo');
    expect(meta1.duracao_min).toBe(60);
  });

  it('cenario 4: id ja persistido (listarTreinos) e pulado', async () => {
    mockListarTreinos.mockResolvedValueOnce([
      {
        tipo: 'treino_sessao',
        data: '2026-05-21T18:00:00.000Z',
        autor: 'pessoa_a',
        duracao_min: 45,
        exercicios: [{ nome: 'Caminhada', series: 1, reps: 1 }],
        fonte_hc_id: 'uuid-existente',
      },
    ]);
    mockReadRecords.mockResolvedValueOnce({
      records: [
        sessao({ metadata: { id: 'uuid-existente', dataOrigin: { packageName: 'com.strava' } } }),
        sessao({ metadata: { id: 'uuid-novo', dataOrigin: { packageName: 'com.strava' } } }),
      ],
    });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    expect(mockEscreverTreino).toHaveBeenCalledTimes(1);
    const [, slug, meta] = mockEscreverTreino.mock.calls[0];
    expect(slug).toBe('hc-uuid-novo');
    expect(meta.fonte_hc_id).toBe('uuid-novo');
  });

  it('cenario 5: id duplicado no mesmo lote escreve uma vez so', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        sessao({ metadata: { id: 'uuid-dup', dataOrigin: { packageName: 'com.strava' } } }),
        sessao({ metadata: { id: 'uuid-dup', dataOrigin: { packageName: 'com.strava' } } }),
      ],
    });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    expect(mockEscreverTreino).toHaveBeenCalledTimes(1);
  });

  it('cenario 6: exerciseType desconhecido -> fallback Atividade fisica', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [sessao({ exerciseType: 9999 })],
    });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const [, , meta] = mockEscreverTreino.mock.calls[0];
    expect(meta.exercicios[0].nome).toBe('Atividade física');
    expect(meta.exercicio_hc_type).toBe(9999);
  });

  it('cenario 7: title proprio do app vira base da rotina', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [sessao({ title: 'Corridinha matinal', exerciseType: 56 })],
    });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const [, , meta] = mockEscreverTreino.mock.calls[0];
    expect(meta.rotina).toContain('Corridinha matinal');
    // Sem title, a rotina cai para o label do tipo.
    expect(meta.exercicios[0].nome).toBe('Corrida');
  });

  it('cenario 8: duracao calculada e clampada ao range do schema', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        // 45 min normais.
        sessao({
          metadata: { id: 'd45', dataOrigin: { packageName: 'com.strava' } },
          startTime: '2026-05-21T10:00:00.000Z',
          endTime: '2026-05-21T10:45:00.000Z',
        }),
        // end <= start -> clamp para 1.
        sessao({
          metadata: { id: 'd0', dataOrigin: { packageName: 'com.strava' } },
          startTime: '2026-05-21T10:00:00.000Z',
          endTime: '2026-05-21T10:00:00.000Z',
        }),
        // 10h -> clamp para 240.
        sessao({
          metadata: { id: 'dbig', dataOrigin: { packageName: 'com.strava' } },
          startTime: '2026-05-21T00:00:00.000Z',
          endTime: '2026-05-21T10:00:00.000Z',
        }),
      ],
    });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(3);
    const duracoes = mockEscreverTreino.mock.calls.map((c) => c[2].duracao_min);
    expect(duracoes).toEqual([45, 1, 240]);
  });

  it('cenario 9: record sem metadata.id e ignorado', async () => {
    mockReadRecords.mockResolvedValueOnce({
      records: [
        sessao({ metadata: { dataOrigin: { packageName: 'com.strava' } } }),
        sessao({ metadata: { id: 'uuid-ok', dataOrigin: { packageName: 'com.strava' } } }),
      ],
    });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const [, slug] = mockEscreverTreino.mock.calls[0];
    expect(slug).toBe('hc-uuid-ok');
  });

  it('cenario 10: readRecords lanca -> retorna {novos: 0, erro: msg}', async () => {
    mockReadRecords.mockRejectedValueOnce(new Error('permission_denied'));

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 0, erro: 'permission_denied' });
    expect(mockEscreverTreino).not.toHaveBeenCalled();
  });

  it('cenario 11: vault root null -> erro vault_root_indisponivel', async () => {
    useVault.setState({ vaultRoot: null });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r).toEqual({ novos: 0, erro: 'vault_root_indisponivel' });
    expect(mockReadRecords).not.toHaveBeenCalled();
    expect(mockEscreverTreino).not.toHaveBeenCalled();
  });

  it('cenario 12: pessoa = pessoa_b -> autor escrito com pessoa_b', async () => {
    useSettings.setState({
      pessoa: {
        ativa: 'pessoa_b',
        vaultCompartilhado: true,
        tipoCompanhia: 'sozinho',
      },
    });
    mockReadRecords.mockResolvedValueOnce({ records: [sessao()] });

    const r = await puxadorExercicio.puxar({
      since: '2026-05-15T00:00:00.000Z',
      pageSize: 1000,
    });

    expect(r.novos).toBe(1);
    const [, , meta] = mockEscreverTreino.mock.calls[0];
    expect(meta.autor).toBe('pessoa_b');
  });

  it('cenario 13 (extra): first sync (since=null) usa janela default 7d', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-22T15:00:00.000Z'));
    mockReadRecords.mockResolvedValueOnce({ records: [] });

    await puxadorExercicio.puxar({ since: null, pageSize: 1000 });

    const [tipo, opts] = mockReadRecords.mock.calls[0];
    expect(tipo).toBe('ExerciseSession');
    const startDate = new Date(opts.timeRangeFilter.startTime);
    const esperado = new Date('2026-05-15T15:00:00.000Z').getTime();
    expect(Math.abs(startDate.getTime() - esperado)).toBeLessThan(2000);
    expect(opts.timeRangeFilter.endTime).toBe('2026-05-22T15:00:00.000Z');
    expect(opts.pageSize).toBe(1000);
    expect(opts.ascendingOrder).toBe(true);

    jest.useRealTimers();
  });
});
