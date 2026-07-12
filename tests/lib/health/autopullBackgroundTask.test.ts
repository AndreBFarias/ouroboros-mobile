// Testes do registro guarded da task de background do autopull HC.
// R-INT-3-HC-AUTOPULL-BACKGROUND (2026-05-25).
//
// GATE DE BUILD NATIVO: expo-task-manager + expo-background-task NAO estao
// instalados. O modulo carrega essas libs de forma lazy via require dentro de
// try/catch; quando ausentes (estado atual do bundle), cada funcao vira no-op
// silencioso. Estes testes travam esse contrato para que o bundle/smoke nao
// quebre sem o prebuild:
//
//   1. registrarHCAutopullBackground nao lanca quando a lib nativa esta
//      ausente (resolve sem erro) e loga "indisponivel".
//   2. desregistrarHCAutopullBackground nao lanca quando a lib nativa esta
//      ausente (resolve sem erro, sem log de erro).
//   3. HC_AUTOPULL_BACKGROUND_TASK e' a string canonica esperada.
//
// Comentarios sem acento (convencao shell/CI).

import {
  registrarHCAutopullBackground,
  desregistrarHCAutopullBackground,
  HC_AUTOPULL_BACKGROUND_TASK,
} from '@/lib/health/autopullBackgroundTask';

describe('autopullBackgroundTask (guarded, lib nativa ausente)', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('expoe o nome canonico da task', () => {
    expect(HC_AUTOPULL_BACKGROUND_TASK).toBe('hc-autopull-background');
  });

  it('registrar e no-op sem erro quando expo-task-manager/expo-background-task ausentes', async () => {
    await expect(registrarHCAutopullBackground()).resolves.toBeUndefined();
    const linhas = logSpy.mock.calls.map((c) => c.join(' '));
    expect(linhas.some((l) => l.includes('background indisponivel'))).toBe(
      true
    );
  });

  it('desregistrar e no-op sem erro quando libs nativas ausentes', async () => {
    await expect(desregistrarHCAutopullBackground()).resolves.toBeUndefined();
  });
});
