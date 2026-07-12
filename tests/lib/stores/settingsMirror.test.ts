// R-INT-3-HC-AUTOPULL-VAULT-MIRROR: o subscriber do useSettings espelha
// o estado em vault/_estado/settings-<deviceId>.md via
// escreverEstadoCanonico (debounced). Antes desta sprint o payload
// omitia hcAutopullUltimaSync; agora o tracking de pulls do Health
// Connect entra no mirror canonico para o sibling Python ler.
//
// Estrategia (mesma de migrarEstadoParaVault.test.ts):
//   - escreverEstadoCanonico mockado para observar o payload.
//   - useVault.getState mockado com vaultRoot != null (subscriber
//     so dispara escrita quando o vault esta autorizado).
//   - store REAL para exercitar o subscriber registrado no module load.
//
// Comentarios sem acento.

const mockEscreverDebounced = jest.fn();

jest.mock('@/lib/vault/escreverEstado', () => ({
  __esModule: true,
  escreverEstadoCanonico: (...args: unknown[]) =>
    mockEscreverDebounced(...args),
  escreverEstadoCanonicoImediato: jest.fn().mockResolvedValue(undefined),
}));

const mockUseVaultState = {
  vaultRoot: 'content://test/vault' as string | null,
};
jest.mock('@/lib/stores/vault', () => ({
  __esModule: true,
  useVault: {
    getState: () => mockUseVaultState,
  },
}));

import { useSettings } from '@/lib/stores/settings';

describe('useSettings subscriber: mirror canonico do Vault', () => {
  beforeEach(() => {
    mockEscreverDebounced.mockClear();
    mockUseVaultState.vaultRoot = 'content://test/vault';
    useSettings.getState().resetar();
  });

  it('espelha hcAutopullUltimaSync no payload do mirror', () => {
    mockEscreverDebounced.mockClear();
    useSettings
      .getState()
      .setHCAutopullUltimaSync('Steps', '2026-05-22T10:00:00-03:00');

    expect(mockEscreverDebounced).toHaveBeenCalled();
    const ultimaChamada =
      mockEscreverDebounced.mock.calls[
        mockEscreverDebounced.mock.calls.length - 1
      ];
    expect(ultimaChamada[0]).toBe('settings');
    const payload = ultimaChamada[1] as {
      hcAutopullUltimaSync?: Record<string, string | null>;
    };
    expect(payload.hcAutopullUltimaSync).toBeDefined();
    expect(payload.hcAutopullUltimaSync?.Steps).toBe(
      '2026-05-22T10:00:00-03:00'
    );
  });

  it('mantem as demais chaves canonicas no payload', () => {
    mockEscreverDebounced.mockClear();
    useSettings.getState().setFeatureToggle('cicloMenstrual', false);

    const ultimaChamada =
      mockEscreverDebounced.mock.calls[
        mockEscreverDebounced.mock.calls.length - 1
      ];
    const payload = ultimaChamada[1] as Record<string, unknown>;
    expect(payload).toHaveProperty('somVibracao');
    expect(payload).toHaveProperty('featureToggles');
    expect(payload).toHaveProperty('hcAutopullUltimaSync');
  });
});
