// Testes de notificarBackupDrive (R-INT-5-DRIVE-NOTIF-BACKUP).
//
// Cobre:
//   1. Sucesso emite notif silenciosa (sound: false, trigger null) com
//      title/body corretos em PT-BR.
//   2. Formatacao MB com virgula decimal PT-BR.
//   3. Bytes invalidos (NaN, negativo) -> nao notifica.
//   4. Sem permissao -> nao notifica (best-effort).
//
// Usa o mock global de expo-notifications (jest.setup.cjs). Platform vem
// do mock global (nao-web) para exercitar o caminho de disparo.
//
// Comentarios sem acento.
import {
  notificarBackupDrive,
  formatarMb,
} from '@/lib/notifications/driveBackup';
import * as Notifications from 'expo-notifications';

const memInterna = (
  Notifications as unknown as { __memory: Map<string, unknown> }
).__memory;

beforeEach(() => {
  memInterna.clear();
  jest.clearAllMocks();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
});

describe('formatarMb', () => {
  it('formata bytes em MB com virgula decimal PT-BR', () => {
    expect(formatarMb(2 * 1024 * 1024)).toBe('2 MB');
    expect(formatarMb(2516582)).toBe('2,4 MB');
    expect(formatarMb(0)).toBe('0 MB');
  });
});

describe('notificarBackupDrive', () => {
  it('sucesso: emite notif silenciosa com title/body PT-BR', async () => {
    const r = await notificarBackupDrive(2516582);
    expect(r.notificou).toBe(true);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0];
    expect(call.content.title).toBe('Backup salvo no Drive');
    expect(call.content.body).toBe('2,4 MB');
    // Silenciosa: sem som.
    expect(call.content.sound).toBe(false);
    // Entrega imediata.
    expect(call.trigger).toBeNull();
  });

  it('bytes invalidos nao notificam', async () => {
    expect((await notificarBackupDrive(NaN)).notificou).toBe(false);
    expect((await notificarBackupDrive(-1)).notificou).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('sem permissao: nao notifica (best-effort)', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    });
    const r = await notificarBackupDrive(1024 * 1024);
    expect(r.notificou).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('falha ao agendar e engolida (nao lanca)', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(
      new Error('sem suporte')
    );
    const r = await notificarBackupDrive(1024 * 1024);
    expect(r.notificou).toBe(false);
  });
});
