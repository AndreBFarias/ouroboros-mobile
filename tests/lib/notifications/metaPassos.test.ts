// Testes de checarEnotificarMeta (R-INT-3-HC-NOTIF-META-PASSOS).
//
// Cobre:
//   1. Notifica quando passosHoje >= meta (1a vez no dia).
//   2. Guard 1x/dia: 2a chamada no mesmo dia nao duplica.
//   3. Nao notifica abaixo da meta.
//   4. Notificacao e silenciosa (sound: false) com title/body corretos.
//   5. Entradas invalidas (NaN, meta <= 0) -> nao notifica.
//
// Usa o mock global de expo-notifications (jest.setup.cjs) e
// expo-secure-store. Reseta o guard via deleteItemAsync entre testes.
//
// Comentarios sem acento.
import { checarEnotificarMeta } from '@/lib/notifications/metaPassos';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const memInterna = (
  Notifications as unknown as { __memory: Map<string, unknown> }
).__memory;

const GUARD_KEY = 'ouroboros.metaPassos.ultimoAviso';

beforeEach(async () => {
  memInterna.clear();
  jest.clearAllMocks();
  await SecureStore.deleteItemAsync(GUARD_KEY);
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
});

describe('checarEnotificarMeta', () => {
  it('notifica quando passosHoje >= meta (1a vez no dia)', async () => {
    const r = await checarEnotificarMeta(8200, 8000);
    expect(r.notificou).toBe(true);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('guard 1x/dia: 2a chamada no mesmo dia nao duplica', async () => {
    const r1 = await checarEnotificarMeta(8200, 8000);
    expect(r1.notificou).toBe(true);
    const r2 = await checarEnotificarMeta(9000, 8000);
    expect(r2.notificou).toBe(false);
    // So uma notificacao foi agendada no total.
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('nao notifica abaixo da meta', async () => {
    const r = await checarEnotificarMeta(7999, 8000);
    expect(r.notificou).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('notificacao e silenciosa e com title/body em PT-BR', async () => {
    await checarEnotificarMeta(8000, 8000);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0];
    expect(call.content.sound).toBe(false);
    expect(call.content.title).toBe('Meta de passos atingida');
    expect(call.content.body).toBe('8.000 passos hoje');
    // Entrega imediata.
    expect(call.trigger).toBeNull();
  });

  it('formata milhar maior corretamente (12345 -> 12.345)', async () => {
    await checarEnotificarMeta(12345, 8000);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0];
    expect(call.content.body).toBe('12.345 passos hoje');
  });

  it('entradas invalidas nao notificam', async () => {
    expect((await checarEnotificarMeta(NaN, 8000)).notificou).toBe(false);
    expect((await checarEnotificarMeta(9000, 0)).notificou).toBe(false);
    expect((await checarEnotificarMeta(9000, -1)).notificou).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('nao notifica se permissao negada', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    });
    const r = await checarEnotificarMeta(9000, 8000);
    expect(r.notificou).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
