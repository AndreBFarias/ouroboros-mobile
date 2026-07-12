import {
  agendarLembrete,
  cancelarLembrete,
  cancelarTudo,
  listarAgendados,
  parseHorario,
  pedirPermissao,
} from '@/lib/services/notificacoesLembretes';
import * as Notifications from 'expo-notifications';

// Acessa a memoria interna do mock para verificacao direta.
const memInterna = (
  Notifications as unknown as { __memory: Map<string, unknown> }
).__memory;

describe('notificacoesLembretes', () => {
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
    it('aceita 09:00 e 18:30', () => {
      expect(parseHorario('09:00')).toEqual({ hour: 9, minute: 0 });
      expect(parseHorario('18:30')).toEqual({ hour: 18, minute: 30 });
    });

    it('aceita 9:00 sem zero a esquerda', () => {
      expect(parseHorario('9:00')).toEqual({ hour: 9, minute: 0 });
    });

    it('rejeita formatos invalidos', () => {
      expect(parseHorario('25:00')).toBeNull();
      expect(parseHorario('09:60')).toBeNull();
      expect(parseHorario('abc')).toBeNull();
      expect(parseHorario('')).toBeNull();
    });
  });

  describe('pedirPermissao', () => {
    it('retorna true quando ja tem permissao', async () => {
      const ok = await pedirPermissao();
      expect(ok).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('pede e retorna true se concedida', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
        canAskAgain: true,
      });
      const ok = await pedirPermissao();
      expect(ok).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('retorna false se nao pode mais perguntar', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
        canAskAgain: false,
      });
      const ok = await pedirPermissao();
      expect(ok).toBe(false);
    });
  });

  describe('agendarLembrete', () => {
    it('agenda com prefixo canonico', async () => {
      const ok = await agendarLembrete('medicacao', '09:00');
      expect(ok).toBe(true);
      expect(memInterna.has('ouroboros.lembrete.medicacao')).toBe(true);
    });

    it('falha em horario invalido sem chamar agendamento', async () => {
      const ok = await agendarLembrete('treino', 'abc');
      expect(ok).toBe(false);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('cancela schedule pre-existente antes de agendar', async () => {
      await agendarLembrete('humor', '21:00');
      await agendarLembrete('humor', '22:00');
      expect(
        Notifications.cancelScheduledNotificationAsync
      ).toHaveBeenCalledWith('ouroboros.lembrete.humor');
    });

    it('passa hour e minute do horario para o trigger', async () => {
      await agendarLembrete('humor', '21:30');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'ouroboros.lembrete.humor',
          trigger: expect.objectContaining({ hour: 21, minute: 30 }),
        })
      );
    });
  });

  describe('cancelarLembrete', () => {
    it('chama cancelScheduledNotification com prefixo', async () => {
      await cancelarLembrete('treino');
      expect(
        Notifications.cancelScheduledNotificationAsync
      ).toHaveBeenCalledWith('ouroboros.lembrete.treino');
    });
  });

  describe('listarAgendados / cancelarTudo', () => {
    it('lista apenas identifiers com prefixo canonico', async () => {
      await agendarLembrete('medicacao', '09:00');
      await agendarLembrete('humor', '21:00');
      // Insere manualmente um item de outra feature para verificar filtro.
      memInterna.set('outra.feature.x', { identifier: 'outra.feature.x' });
      const lista = await listarAgendados();
      expect(lista).toHaveLength(2);
      expect(lista).toContain('ouroboros.lembrete.medicacao');
      expect(lista).toContain('ouroboros.lembrete.humor');
      expect(lista).not.toContain('outra.feature.x');
    });

    it('cancelarTudo limpa as 3 chaves canonicas', async () => {
      await agendarLembrete('medicacao', '09:00');
      await agendarLembrete('treino', '18:00');
      await agendarLembrete('humor', '21:00');
      expect(memInterna.size).toBe(3);
      await cancelarTudo();
      expect(memInterna.size).toBe(0);
    });
  });
});
