// Sprint M-BACKUP-AUTOMATICO (Bloco C5) — render da secao opt-in.
// Cobre 3 caminhos canonicos:
//   1. Toggle OFF (default): renderiza so a linha do toggle, sem
//      timestamp.
//   2. Toggle ON: renderiza a linha de timestamp com texto humano.
//   3. Press no toggle alterna useSettings.backupAutomaticoSemanal.

// Mock do leitor de timestamp para nao tocar FileSystem.
const mockLerUltimoBackupMs = jest.fn();
jest.mock('@/lib/backup/executarBackup', () => {
  // Reimplementa descreverUltimoBackup local para nao depender do
  // codigo real (que importa Platform e FileSystem). Aqui so quero
  // testar a UI com texto controlado.
  return {
    __esModule: true,
    lerUltimoBackupMs: () => mockLerUltimoBackupMs(),
    descreverUltimoBackup: (ms: number | null) =>
      ms === null
        ? 'Nenhum backup automático ainda.'
        : `Último backup: há ${Math.floor(
            (Date.now() - ms) / (24 * 60 * 60 * 1000)
          )} dias.`,
  };
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SecaoBackupAutomatico } from '@/components/settings/SecaoBackupAutomatico';
import { useSettings } from '@/lib/stores/settings';

beforeEach(() => {
  useSettings.getState().resetar();
  mockLerUltimoBackupMs.mockReset();
  mockLerUltimoBackupMs.mockResolvedValue(null);
});

describe('SecaoBackupAutomatico', () => {
  it('renderiza titulo da secao + linha do toggle (default OFF)', async () => {
    const tree = render(<SecaoBackupAutomatico />);
    expect(tree.getByText('Backup automático')).toBeTruthy();
    expect(tree.getByText('Backup semanal')).toBeTruthy();
    expect(
      tree.getByText(
        'Cópia local em Documents/Ouroboros-Backups/auto/. Últimos 4.'
      )
    ).toBeTruthy();
    // Toggle off => nao renderiza linha "Ultimo backup".
    expect(tree.queryByLabelText('linha ultimo backup')).toBeNull();
  });

  it('quando toggle ON, exibe a linha de ultimo backup com texto humano', async () => {
    useSettings
      .getState()
      .setFeatureToggle('backupAutomaticoSemanal', true);
    const tree = render(<SecaoBackupAutomatico />);
    await waitFor(() =>
      expect(tree.getByLabelText('linha ultimo backup')).toBeTruthy()
    );
    expect(tree.getByText('Nenhum backup automático ainda.')).toBeTruthy();
  });

  it('press no toggle alterna useSettings.backupAutomaticoSemanal', async () => {
    const tree = render(<SecaoBackupAutomatico />);
    expect(
      useSettings.getState().featureToggles.backupAutomaticoSemanal
    ).toBe(false);
    fireEvent.press(tree.getByLabelText('toggle backup automatico semanal'));
    await waitFor(() =>
      expect(
        useSettings.getState().featureToggles.backupAutomaticoSemanal
      ).toBe(true)
    );
  });
});
