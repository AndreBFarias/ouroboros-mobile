// Sprint M-BACKUP-AUTOMATICO (Bloco C5) -- render da secao opt-in.
// R-BACKUP-AUTO (2026-05-17): atualizado para default ON + nova UI
// estendida (Botao "Fazer backup agora", lista dos 4 ultimos backups
// com botao "Restaurar" por linha) + ToastProvider obrigatorio.
//
// Casos cobertos:
//   1. Default render (toggle ON) renderiza titulo + linha toggle +
//      linha "Ultimo backup" + botao "Fazer backup agora".
//   2. Toggle OFF (usuario desligou) esconde linha ultimo backup,
//      botao "Fazer backup agora" e lista de backups.
//   3. Lista de backups: render formatado (data + tamanho) e press
//      em "Restaurar" abre Alert.alert.
//   4. Press no toggle alterna useSettings.backupAutomaticoSemanal.
//   5. Press em "Fazer backup agora" chama executarBackup.

// Mock dos helpers de backup para nao tocar FileSystem.
const mockLerUltimoBackupMs = jest.fn();
const mockListarBackups = jest.fn();
const mockExecutarBackup = jest.fn();
jest.mock('@/lib/backup/executarBackup', () => {
  return {
    __esModule: true,
    lerUltimoBackupMs: () => mockLerUltimoBackupMs(),
    listarBackupsArquivados: () => mockListarBackups(),
    executarBackup: () => mockExecutarBackup(),
    descreverUltimoBackup: (ms: number | null) =>
      ms === null
        ? 'Nenhum backup automático ainda.'
        : `Último backup: há ${Math.floor(
            (Date.now() - ms) / (24 * 60 * 60 * 1000)
          )} dias.`,
  };
});

const mockRestaurar = jest.fn();
jest.mock('@/lib/services/restaurarVault', () => ({
  __esModule: true,
  restaurarVaultZip: (uri: string) => mockRestaurar(uri),
}));

// Spy do Alert para inspecionar o Alert.alert disparado pelo botao
// "Restaurar".
import { Alert } from 'react-native';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SecaoBackupAutomatico } from '@/components/settings/SecaoBackupAutomatico';
import { useSettings } from '@/lib/stores/settings';
import { ToastProvider } from '@/components/ui/Toast';

function renderComProviders() {
  return render(
    <ToastProvider>
      <SecaoBackupAutomatico />
    </ToastProvider>
  );
}

beforeEach(() => {
  useSettings.getState().resetar();
  mockLerUltimoBackupMs.mockReset();
  mockLerUltimoBackupMs.mockResolvedValue(null);
  mockListarBackups.mockReset();
  mockListarBackups.mockResolvedValue([]);
  mockExecutarBackup.mockReset();
  mockRestaurar.mockReset();
});

describe('SecaoBackupAutomatico', () => {
  it('default ON: renderiza titulo + linha toggle + linha ultimo backup + botao fazer backup agora', async () => {
    const tree = renderComProviders();
    expect(tree.getByText('Backup automático')).toBeTruthy();
    expect(tree.getByText('Backup semanal')).toBeTruthy();
    expect(
      tree.getByText(
        'Cópia local em Documents/Ouroboros-Backups/auto/. Últimos 4.'
      )
    ).toBeTruthy();
    await waitFor(() =>
      expect(tree.getByLabelText('linha ultimo backup')).toBeTruthy()
    );
    expect(tree.getByLabelText('fazer backup agora')).toBeTruthy();
  });

  it('toggle OFF (usuario desligou) esconde linha ultimo backup + botao + lista', async () => {
    useSettings.getState().setFeatureToggle('backupAutomaticoSemanal', false);
    const tree = renderComProviders();
    expect(tree.queryByLabelText('linha ultimo backup')).toBeNull();
    expect(tree.queryByLabelText('fazer backup agora')).toBeNull();
    expect(tree.queryByLabelText('lista backups')).toBeNull();
  });

  it('lista backups quando ativo + backups existem: renderiza data + tamanho + botao restaurar', async () => {
    mockListarBackups.mockResolvedValue([
      {
        uri: 'file:///mock/Documents/Ouroboros-Backups/auto/backup-20260516T120000-ouro-abc123.zip',
        nome: 'backup-20260516T120000-ouro-abc123.zip',
        modificadoEmMs: new Date('2026-05-16T12:00:00Z').getTime(),
        bytes: 1024 * 1024 * 3, // 3 MB
        snapshot: null,
      },
    ]);
    const tree = renderComProviders();
    await waitFor(() =>
      expect(tree.getByLabelText('lista backups')).toBeTruthy()
    );
    expect(tree.getByText('Backups disponíveis')).toBeTruthy();
    expect(tree.getByText('3,0 MB')).toBeTruthy();
    expect(
      tree.getByLabelText(
        'restaurar backup backup-20260516T120000-ouro-abc123.zip'
      )
    ).toBeTruthy();
  });

  it('press no botao restaurar abre Alert.alert com confirm', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockListarBackups.mockResolvedValue([
      {
        uri: 'file:///mock/Documents/Ouroboros-Backups/auto/backup-20260516T120000-ouro-abc123.zip',
        nome: 'backup-20260516T120000-ouro-abc123.zip',
        modificadoEmMs: new Date('2026-05-16T12:00:00Z').getTime(),
        bytes: 8000,
        snapshot: null,
      },
    ]);
    const tree = renderComProviders();
    await waitFor(() =>
      expect(tree.getByLabelText('lista backups')).toBeTruthy()
    );
    fireEvent.press(
      tree.getByLabelText(
        'restaurar backup backup-20260516T120000-ouro-abc123.zip'
      )
    );
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('Restaurar backup');
    alertSpy.mockRestore();
  });

  it('press no toggle alterna useSettings.backupAutomaticoSemanal', async () => {
    const tree = renderComProviders();
    // Default agora e' true (R-BACKUP-AUTO D6=SIM).
    expect(useSettings.getState().featureToggles.backupAutomaticoSemanal).toBe(
      true
    );
    fireEvent.press(tree.getByLabelText('toggle backup automatico semanal'));
    await waitFor(() =>
      expect(
        useSettings.getState().featureToggles.backupAutomaticoSemanal
      ).toBe(false)
    );
  });

  it('press em fazer backup agora chama executarBackup e recarrega lista', async () => {
    mockExecutarBackup.mockResolvedValue({
      uri: 'file:///mock/Documents/Ouroboros-Backups/auto/backup-20260517T030000-ouro-abc123.zip',
      totalArquivos: 7,
      rotacionados: 0,
    });
    const tree = renderComProviders();
    await waitFor(() =>
      expect(tree.getByLabelText('fazer backup agora')).toBeTruthy()
    );
    fireEvent.press(tree.getByLabelText('fazer backup agora'));
    await waitFor(() => expect(mockExecutarBackup).toHaveBeenCalledTimes(1));
    // listarBackupsArquivados foi chamado novamente apos o backup
    // (mount + recarregar pos-success).
    expect(mockListarBackups.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
