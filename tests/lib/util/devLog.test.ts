// R-INT-3-LOGGER-CONDICIONAL: devLog so emite em __DEV__ (no-op em release).
// Comentarios sem acento (convencao shell/CI).
import { devLog } from '@/lib/util/devLog';

describe('devLog (R-INT-3-LOGGER-CONDICIONAL)', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
    // Restaura __DEV__=true para nao contaminar outras suites no worker.
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  it('loga quando __DEV__ e true (dev/metro)', () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
    devLog('[hc-autopull]', 'mensagem', { n: 1 });
    expect(spy).toHaveBeenCalledWith('[hc-autopull]', 'mensagem', { n: 1 });
  });

  it('e no-op quando __DEV__ e false (release)', () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    devLog('[hc-autopull]', 'nao deve aparecer em release');
    expect(spy).not.toHaveBeenCalled();
  });
});
