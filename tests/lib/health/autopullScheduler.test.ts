// Testes do orquestrador puro `orquestrarHCAutopull`.
// R-INT-3-HC-AUTOPULL-SCHEDULER (2026-05-22).
//
// Estrategia: nao mocka `@/lib/stores/settings` — usa o store real e
// resetar antes de cada teste via `useSettings.setState()`. Mocka
// apenas os Puxadores (fakes com jest.fn) para validar:
//
//   1. 3 puxadores OK -> totalNovos somado, todos ultimaSync atualizados.
//   2. 1 puxador erro -> 2 ultimaSync atualizados, 1 preservado.
//   3. Primeira sync (ultimaSync null) -> since passado e ~7d atras.
//   4. Sync subsequente -> since passado e o ISO armazenado.
//   5. pageSize cap = 1000 passado a cada puxador.
//
// Cenario extra (6): puxador lancando excecao em vez de retornar
// {erro: string} e tratado como erro silencioso (Promise.allSettled).
//
// Comentarios sem acento (convencao shell/CI).

import {
  orquestrarHCAutopull,
  type Puxador,
  type TipoHC,
} from '@/lib/health/autopullScheduler';
import { useSettings } from '@/lib/stores/settings';

// Helper: cria puxador fake com tipo + comportamento deterministico.
function fakePuxador(
  tipo: TipoHC,
  resultado: { novos: number; erro: string | null } | Error
): Puxador {
  const puxar = jest.fn(async () => {
    if (resultado instanceof Error) throw resultado;
    return resultado;
  });
  return { tipo, puxar };
}

// Limpa hcAutopullUltimaSync para todos os tipos antes de cada teste.
// Garante isolamento entre cenarios (sem leak de estado). Tambem zera a
// telemetria (R-INT-3-HC-SYNC-PAINEL) para que cada cenario observe a
// rodada que ele dispara.
beforeEach(() => {
  useSettings.setState({
    hcAutopullUltimaSync: {
      Steps: null,
      ExerciseSession: null,
      Weight: null,
      BodyFat: null,
      HeartRate: null,
      SleepSession: null,
      MenstruationFlow: null,
    },
    hcAutopullUltimaRodada: undefined,
  });
});

describe('orquestrarHCAutopull', () => {
  it('3 puxadores OK: agrega novos e atualiza ultimaSync de todos', async () => {
    const p1 = fakePuxador('Steps', { novos: 5, erro: null });
    const p2 = fakePuxador('Weight', { novos: 3, erro: null });
    const p3 = fakePuxador('SleepSession', { novos: 1, erro: null });

    const res = await orquestrarHCAutopull([p1, p2, p3]);

    expect(res.tipos).toHaveLength(3);
    expect(res.tipos.map((t) => t.novos).reduce((a, b) => a + b, 0)).toBe(9);
    expect(res.tipos.every((t) => t.erro === null)).toBe(true);

    const ultimaSync = useSettings.getState().hcAutopullUltimaSync;
    expect(ultimaSync.Steps).not.toBeNull();
    expect(ultimaSync.Weight).not.toBeNull();
    expect(ultimaSync.SleepSession).not.toBeNull();
    // Tipos nao envolvidos permanecem null.
    expect(ultimaSync.HeartRate).toBeNull();
  });

  it('1 puxador erro + 2 OK: ultimaSync preservado para o erro, atualizado para os OK', async () => {
    const p1 = fakePuxador('Steps', { novos: 4, erro: null });
    const p2 = fakePuxador('Weight', { novos: 0, erro: 'permission_denied' });
    const p3 = fakePuxador('BodyFat', { novos: 2, erro: null });

    // Pre-popula Weight com ISO antigo para confirmar preservacao.
    const isoAntigo = '2026-04-01T10:00:00.000Z';
    useSettings.setState({
      hcAutopullUltimaSync: {
        ...useSettings.getState().hcAutopullUltimaSync,
        Weight: isoAntigo,
      },
    });

    const res = await orquestrarHCAutopull([p1, p2, p3]);

    expect(res.tipos).toHaveLength(3);
    const erros = res.tipos.filter((t) => t.erro !== null);
    expect(erros).toHaveLength(1);
    expect(erros[0]?.tipo).toBe('Weight');
    expect(erros[0]?.erro).toBe('permission_denied');

    const ultimaSync = useSettings.getState().hcAutopullUltimaSync;
    expect(ultimaSync.Steps).not.toBeNull();
    expect(ultimaSync.BodyFat).not.toBeNull();
    // Weight preservado no ISO antigo (NAO foi atualizado).
    expect(ultimaSync.Weight).toBe(isoAntigo);
  });

  it('primeira sync (ultimaSync null): since passado ~ 7 dias atras', async () => {
    const p1 = fakePuxador('Steps', { novos: 0, erro: null });
    const antesMs = Date.now();

    await orquestrarHCAutopull([p1]);

    expect(p1.puxar).toHaveBeenCalledTimes(1);
    const callArg = (p1.puxar as jest.Mock).mock.calls[0][0] as {
      since: string;
      pageSize: number;
    };
    const sinceMs = new Date(callArg.since).getTime();
    const esperadoMs = antesMs - 7 * 24 * 60 * 60 * 1000;
    // Tolerancia 2s para diferenca de relogio entre antesMs e new Date()
    // dentro do orquestrador.
    expect(Math.abs(sinceMs - esperadoMs)).toBeLessThan(2000);
  });

  it('sync subsequente (ultimaSync = ISO recente): since passado e o ISO armazenado', async () => {
    const isoArmazenado = '2026-05-20T08:30:00.000Z';
    useSettings.setState({
      hcAutopullUltimaSync: {
        ...useSettings.getState().hcAutopullUltimaSync,
        ExerciseSession: isoArmazenado,
      },
    });

    const p1 = fakePuxador('ExerciseSession', { novos: 2, erro: null });
    await orquestrarHCAutopull([p1]);

    const callArg = (p1.puxar as jest.Mock).mock.calls[0][0] as {
      since: string;
      pageSize: number;
    };
    expect(callArg.since).toBe(isoArmazenado);
  });

  it('pageSize fixado em 1000 para todos os puxadores', async () => {
    const p1 = fakePuxador('Steps', { novos: 0, erro: null });
    const p2 = fakePuxador('HeartRate', { novos: 0, erro: null });

    await orquestrarHCAutopull([p1, p2]);

    const arg1 = (p1.puxar as jest.Mock).mock.calls[0][0];
    const arg2 = (p2.puxar as jest.Mock).mock.calls[0][0];
    expect(arg1.pageSize).toBe(1000);
    expect(arg2.pageSize).toBe(1000);
  });

  it('puxador que lanca excecao: tratado como erro, outros completam', async () => {
    const p1 = fakePuxador('Steps', { novos: 1, erro: null });
    const p2 = fakePuxador('Weight', new Error('boom inesperado'));
    const p3 = fakePuxador('BodyFat', { novos: 2, erro: null });

    const res = await orquestrarHCAutopull([p1, p2, p3]);

    expect(res.tipos).toHaveLength(3);
    const weightResult = res.tipos.find((t) => t.tipo === 'Weight');
    expect(weightResult?.novos).toBe(0);
    expect(weightResult?.erro).toBe('boom inesperado');

    // Os outros 2 completaram OK e atualizaram ultimaSync.
    const ultimaSync = useSettings.getState().hcAutopullUltimaSync;
    expect(ultimaSync.Steps).not.toBeNull();
    expect(ultimaSync.BodyFat).not.toBeNull();
    expect(ultimaSync.Weight).toBeNull();
  });

  it('campo rodadoEm e ISO 8601 valido', async () => {
    const p1 = fakePuxador('Steps', { novos: 0, erro: null });

    const res = await orquestrarHCAutopull([p1]);

    expect(res.rodadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(res.rodadoEm).toString()).not.toBe('Invalid Date');
  });
});

// R-INT-3-HC-SYNC-PAINEL: o orquestrador grava a telemetria agregada da
// rodada em hcAutopullUltimaRodada (alimenta a linha "Ultima rodada: N
// novos" do painel de sync). Aqui validamos a gravacao via store real.
describe('orquestrarHCAutopull: telemetria hcAutopullUltimaRodada', () => {
  it('grava total de novos somado e zero erros quando tudo OK', async () => {
    const p1 = fakePuxador('Steps', { novos: 5, erro: null });
    const p2 = fakePuxador('Weight', { novos: 3, erro: null });

    const res = await orquestrarHCAutopull([p1, p2]);

    const rodada = useSettings.getState().hcAutopullUltimaRodada;
    expect(rodada).toBeDefined();
    expect(rodada?.novos).toBe(8);
    expect(rodada?.erros).toBe(0);
    // rodadoEm da telemetria casa com o do resultado retornado.
    expect(rodada?.rodadoEm).toBe(res.rodadoEm);
  });

  it('conta erros e soma apenas novos dos puxadores OK', async () => {
    const p1 = fakePuxador('Steps', { novos: 4, erro: null });
    const p2 = fakePuxador('Weight', { novos: 0, erro: 'permission_denied' });
    const p3 = fakePuxador('BodyFat', new Error('boom'));

    await orquestrarHCAutopull([p1, p2, p3]);

    const rodada = useSettings.getState().hcAutopullUltimaRodada;
    expect(rodada?.novos).toBe(4);
    expect(rodada?.erros).toBe(2);
  });

  it('sobrescreve a telemetria a cada nova rodada (so a ultima importa)', async () => {
    await orquestrarHCAutopull([fakePuxador('Steps', { novos: 9, erro: null })]);
    expect(useSettings.getState().hcAutopullUltimaRodada?.novos).toBe(9);

    await orquestrarHCAutopull([fakePuxador('Steps', { novos: 1, erro: null })]);
    expect(useSettings.getState().hcAutopullUltimaRodada?.novos).toBe(1);
  });
});
