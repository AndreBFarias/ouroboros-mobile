// Testes do modulo haptics (sprint M29 - shape v2). Cobre:
//   - 5 funcoes genericas sempre disparam expo-haptics
//   - 5 funcoes contextuais consultam Settings.somVibracao agrupado:
//       humor/trigger/fab -> botoes
//       vitoria           -> conquista
//       alarme            -> despertar
//   - Quando o toggle agrupado esta off, contextual cai em no-op
//   - Quando o mestre `geral` esta off, todos os contextuais ficam
//     silenciosos independente das chaves
//   - Quando o toggle agrupado esta on (e geral on), contextual chama
//     o metodo nativo certo
import * as ExpoHaptics from 'expo-haptics';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/lib/stores/settings';

jest.mock('expo-haptics', () => ({
  __esModule: true,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

const mockImpact = ExpoHaptics.impactAsync as jest.MockedFunction<
  typeof ExpoHaptics.impactAsync
>;
const mockSelection = ExpoHaptics.selectionAsync as jest.MockedFunction<
  typeof ExpoHaptics.selectionAsync
>;
const mockNotification = ExpoHaptics.notificationAsync as jest.MockedFunction<
  typeof ExpoHaptics.notificationAsync
>;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset do store para defaults v2 (todos toggles ON).
  useSettings.getState().resetar();
});

describe('haptics genericos (sempre disparam)', () => {
  it('light dispara impactAsync(Light)', async () => {
    await haptics.light();
    expect(mockImpact).toHaveBeenCalledWith('light');
  });

  it('medium dispara impactAsync(Medium)', async () => {
    await haptics.medium();
    expect(mockImpact).toHaveBeenCalledWith('medium');
  });

  it('selection dispara selectionAsync', async () => {
    await haptics.selection();
    expect(mockSelection).toHaveBeenCalled();
  });

  it('success dispara notificationAsync(Success)', async () => {
    await haptics.success();
    expect(mockNotification).toHaveBeenCalledWith('success');
  });

  it('error dispara notificationAsync(Error)', async () => {
    await haptics.error();
    expect(mockNotification).toHaveBeenCalledWith('error');
  });
});

describe('haptics contextuais — toggle ON (defaults v2)', () => {
  it('humor dispara impactAsync(Light) quando botoes on', async () => {
    await haptics.humor();
    expect(mockImpact).toHaveBeenCalledWith('light');
  });

  it('vitoria dispara notificationAsync(Success) quando conquista on', async () => {
    await haptics.vitoria();
    expect(mockNotification).toHaveBeenCalledWith('success');
  });

  it('trigger dispara impactAsync(Medium) quando botoes on', async () => {
    await haptics.trigger();
    expect(mockImpact).toHaveBeenCalledWith('medium');
  });

  it('fab dispara impactAsync(Medium) quando botoes on', async () => {
    await haptics.fab();
    expect(mockImpact).toHaveBeenCalledWith('medium');
  });

  it('alarme dispara notificationAsync(Warning) quando despertar on', async () => {
    await haptics.alarme();
    expect(mockNotification).toHaveBeenCalledWith('warning');
  });
});

describe('haptics contextuais — toggle agrupado OFF (no-op)', () => {
  it('humor/trigger/fab silenciam quando botoes off', async () => {
    useSettings.getState().setSomVibracao('botoes', false);
    await haptics.humor();
    await haptics.trigger();
    await haptics.fab();
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('vitoria silencia quando conquista off', async () => {
    useSettings.getState().setSomVibracao('conquista', false);
    await haptics.vitoria();
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('alarme silencia quando despertar off', async () => {
    useSettings.getState().setSomVibracao('despertar', false);
    await haptics.alarme();
    expect(mockNotification).not.toHaveBeenCalled();
  });
});

describe('haptics contextuais — mestre geral OFF', () => {
  beforeEach(() => {
    useSettings.getState().setSomVibracao('geral', false);
    // Confirma que demais permanecem ON na store; mestre off deve
    // sobrepor independente do estado dos outros.
  });

  it('humor silencia mesmo com botoes on', async () => {
    await haptics.humor();
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('vitoria silencia mesmo com conquista on', async () => {
    await haptics.vitoria();
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('alarme silencia mesmo com despertar on', async () => {
    await haptics.alarme();
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('trigger silencia mesmo com botoes on', async () => {
    await haptics.trigger();
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('fab silencia mesmo com botoes on', async () => {
    await haptics.fab();
    expect(mockImpact).not.toHaveBeenCalled();
  });
});

describe('haptics contextuais — independencia entre toggles agrupados', () => {
  it('botoes off nao afeta vitoria (conquista on)', async () => {
    useSettings.getState().setSomVibracao('botoes', false);
    await haptics.humor();
    await haptics.vitoria();
    expect(mockImpact).not.toHaveBeenCalled();
    expect(mockNotification).toHaveBeenCalledWith('success');
  });

  it('conquista off nao afeta alarme (despertar on)', async () => {
    useSettings.getState().setSomVibracao('conquista', false);
    await haptics.vitoria();
    await haptics.alarme();
    expect(mockNotification).toHaveBeenCalledTimes(1);
    expect(mockNotification).toHaveBeenCalledWith('warning');
  });
});
