// Sprint M-BACKUP-AUTOMATICO (Bloco C5) — testes do agendador.
// Cobre 3 caminhos canonicos:
//   1. Toggle OFF: nao dispara, nao registra timer.
//   2. Toggle ON + sem backup anterior: dispara executor.
//   3. Toggle ON + backup ha 3 dias: nao dispara (intervalo nao bateu).
//
// O executor real e o leitor de timestamp sao mockados via opts (DI).
// Assim isolamos a logica de decisao do agendador sem depender de
// FileSystem.

jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'android' },
}));

import {
  INTERVALO_BACKUP_MS,
  avaliarBackupAutomatico,
  cancelarTimer,
  timerAtivo,
} from '@/lib/backup/agendarBackup';
import { useSettings } from '@/lib/stores/settings';

beforeEach(() => {
  // Garante toggle limpo entre testes. resetar() restaura defaults v2;
  // R-BACKUP-AUTO mudou backupAutomaticoSemanal para default TRUE
  // (D6=SIM), entao desligamos explicitamente quando o teste precisa
  // do estado OFF.
  useSettings.getState().resetar();
  useSettings.getState().setFeatureToggle('backupAutomaticoSemanal', false);
  cancelarTimer();
});

afterEach(() => {
  cancelarTimer();
});

describe('avaliarBackupAutomatico', () => {
  it('quando toggle OFF, nao dispara executor nem registra timer', async () => {
    const executor = jest.fn();
    const leitor = jest.fn();
    const r = await avaliarBackupAutomatico({
      executor,
      leitorUltimo: leitor,
    });
    expect(r.disparou).toBe(false);
    expect(r.resultado).toBeNull();
    expect(executor).not.toHaveBeenCalled();
    expect(leitor).not.toHaveBeenCalled();
    expect(timerAtivo()).toBe(false);
  });

  it('quando toggle ON e nunca rodou, dispara executor', async () => {
    useSettings.getState().setFeatureToggle('backupAutomaticoSemanal', true);
    const executor = jest.fn().mockResolvedValue({
      uri: '/mock/Documents/Ouroboros-Backups/auto/backup-20260504T120000.zip',
      totalArquivos: 5,
      rotacionados: 0,
    });
    const leitor = jest.fn().mockResolvedValue(null);
    const r = await avaliarBackupAutomatico({
      executor,
      leitorUltimo: leitor,
      iniciarTimer: false,
    });
    expect(r.disparou).toBe(true);
    expect(r.resultado?.totalArquivos).toBe(5);
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('quando toggle ON mas ultimo backup ha 3 dias, NAO dispara', async () => {
    useSettings.getState().setFeatureToggle('backupAutomaticoSemanal', true);
    const executor = jest.fn();
    const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;
    const agora = 1_714_824_000_000; // qualquer base estavel
    const leitor = jest.fn().mockResolvedValue(agora - TRES_DIAS_MS);
    const r = await avaliarBackupAutomatico({
      executor,
      leitorUltimo: leitor,
      agora: () => agora,
      iniciarTimer: false,
    });
    expect(r.disparou).toBe(false);
    expect(executor).not.toHaveBeenCalled();
  });

  it('quando toggle ON e ultimo backup ha 7+ dias, dispara executor', async () => {
    useSettings.getState().setFeatureToggle('backupAutomaticoSemanal', true);
    const executor = jest.fn().mockResolvedValue({
      uri: '/mock/Documents/Ouroboros-Backups/auto/backup-novo.zip',
      totalArquivos: 7,
      rotacionados: 0,
    });
    const agora = 1_714_824_000_000;
    const leitor = jest
      .fn()
      .mockResolvedValue(agora - INTERVALO_BACKUP_MS - 1000);
    const r = await avaliarBackupAutomatico({
      executor,
      leitorUltimo: leitor,
      agora: () => agora,
      iniciarTimer: false,
    });
    expect(r.disparou).toBe(true);
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('cancelarTimer e idempotente (no-op se nao havia)', () => {
    cancelarTimer();
    cancelarTimer();
    expect(timerAtivo()).toBe(false);
  });
});
