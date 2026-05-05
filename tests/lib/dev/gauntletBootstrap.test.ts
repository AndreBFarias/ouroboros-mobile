// M-GAUNTLET-DEAD-CODE-V2: contrato de dead-code do bootstrap.
//
// Cada entry-point publico (iniciarModoDev, sinalizarBootDev,
// registrarRouterDev, registrarPathnameDev) faz `if (__DEV__) { require
// (gauntlet).xxx() }`. Em Jest __DEV__ vem como true do jest-expo
// preset, entao podemos validar que o require lazy delega corretamente
// quando o modulo gauntlet esta mockado.
//
// Para o cenario "release Android" (sem __DEV__) confiamos no Babel/
// Metro DCE -- nao testavel em Jest. Validamos isso via
// scripts/check_gauntlet_leak.sh em CI.
//
// Comentarios sem acento.

describe('gauntletBootstrap (M-GAUNTLET-DEAD-CODE-V2)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('chamadas delegam ao gauntlet quando __DEV__ true (jest default)', () => {
    const instalarSpy = jest.fn();
    const marcarSpy = jest.fn();
    const setRouterSpy = jest.fn();
    const setPathSpy = jest.fn();

    jest.doMock('@/lib/dev/gauntlet', () => ({
      instalarGauntlet: instalarSpy,
      marcarBootCompleto: marcarSpy,
      setRouterRef: setRouterSpy,
      setPathnameRef: setPathSpy,
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bootstrap = require('@/lib/dev/gauntletBootstrap');
    const router = { replace: jest.fn(), push: jest.fn() };
    bootstrap.iniciarModoDev();
    bootstrap.sinalizarBootDev();
    bootstrap.registrarRouterDev(router);
    bootstrap.registrarPathnameDev('/foo');

    expect(instalarSpy).toHaveBeenCalledTimes(1);
    expect(marcarSpy).toHaveBeenCalledTimes(1);
    expect(setRouterSpy).toHaveBeenCalledWith(router);
    expect(setPathSpy).toHaveBeenCalledWith('/foo');
  });

  test('exporta as 4 funcoes esperadas', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bootstrap = require('@/lib/dev/gauntletBootstrap');
    expect(typeof bootstrap.iniciarModoDev).toBe('function');
    expect(typeof bootstrap.sinalizarBootDev).toBe('function');
    expect(typeof bootstrap.registrarRouterDev).toBe('function');
    expect(typeof bootstrap.registrarPathnameDev).toBe('function');
  });
});
