// Testes do módulo haptics. Cobre:
//   - 5 funções genéricas sempre disparam expo-haptics
//   - 5 funções contextuais consultam Settings.somVibracao antes
//   - Quando o toggle correspondente está off, contextual cai em
//     no-op silencioso (não chama expo-haptics)
//   - Quando o toggle está on, contextual chama o método nativo certo
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
  // Reset do store para defaults (todos toggles ON exceto trigger).
  useSettings.getState().resetar();
});

describe('haptics genéricos (sempre disparam)', () => {
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

describe('haptics contextuais — toggle ON', () => {
  beforeEach(() => {
    useSettings.getState().setSomVibracao('humor', true);
    useSettings.getState().setSomVibracao('vitoria', true);
    useSettings.getState().setSomVibracao('trigger', true);
    useSettings.getState().setSomVibracao('fab', true);
    useSettings.getState().setSomVibracao('alarme', true);
  });

  it('humor dispara impactAsync(Light) quando toggle on', async () => {
    await haptics.humor();
    expect(mockImpact).toHaveBeenCalledWith('light');
  });

  it('vitoria dispara notificationAsync(Success) quando toggle on', async () => {
    await haptics.vitoria();
    expect(mockNotification).toHaveBeenCalledWith('success');
  });

  it('trigger dispara impactAsync(Medium) quando toggle on', async () => {
    await haptics.trigger();
    expect(mockImpact).toHaveBeenCalledWith('medium');
  });

  it('fab dispara impactAsync(Medium) quando toggle on', async () => {
    await haptics.fab();
    expect(mockImpact).toHaveBeenCalledWith('medium');
  });

  it('alarme dispara notificationAsync(Warning) quando toggle on', async () => {
    await haptics.alarme();
    expect(mockNotification).toHaveBeenCalledWith('warning');
  });
});

describe('haptics contextuais — toggle OFF (no-op silencioso)', () => {
  it('humor não chama nada quando toggle off', async () => {
    useSettings.getState().setSomVibracao('humor', false);
    await haptics.humor();
    expect(mockImpact).not.toHaveBeenCalled();
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('vitoria não chama nada quando toggle off', async () => {
    useSettings.getState().setSomVibracao('vitoria', false);
    await haptics.vitoria();
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('trigger não chama nada quando toggle off', async () => {
    useSettings.getState().setSomVibracao('trigger', false);
    await haptics.trigger();
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('fab não chama nada quando toggle off', async () => {
    useSettings.getState().setSomVibracao('fab', false);
    await haptics.fab();
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('alarme não chama nada quando toggle off', async () => {
    useSettings.getState().setSomVibracao('alarme', false);
    await haptics.alarme();
    expect(mockNotification).not.toHaveBeenCalled();
  });
});

describe('haptics contextuais — independência entre toggles', () => {
  it('toggle off de humor não afeta vitoria', async () => {
    useSettings.getState().setSomVibracao('humor', false);
    useSettings.getState().setSomVibracao('vitoria', true);
    await haptics.humor();
    await haptics.vitoria();
    expect(mockImpact).not.toHaveBeenCalled();
    expect(mockNotification).toHaveBeenCalledWith('success');
  });
});
