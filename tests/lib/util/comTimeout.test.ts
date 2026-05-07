// Testes do helper canonico comTimeout extraido em I-DIARIO
// (M-SAVE-DIARIO-VALIDA, 2026-05-07). Cobertura:
//   - resolve normal antes do timeout: passa o valor adiante.
//   - reject normal antes do timeout: propaga o erro original.
//   - estouro de timeout: rejeita com Error('timeout salvando').
//   - default 10s exportado como SAVE_TIMEOUT_DEFAULT_MS.
//   - timer limpo apos resolve (sem leak em fakeTimers).
//
// Usa jest.useFakeTimers() para tornar os testes deterministas sem
// depender de wall-clock. Comentarios sem acento.
import {
  comTimeout,
  SAVE_TIMEOUT_DEFAULT_MS,
} from '@/lib/util/comTimeout';

describe('comTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolve normal antes do timeout repassa o valor', async () => {
    const promise = comTimeout(Promise.resolve('ok'), 1_000);
    await expect(promise).resolves.toBe('ok');
  });

  it('reject normal antes do timeout propaga o erro original', async () => {
    const erroOriginal = new Error('falha de rede');
    const promise = comTimeout(Promise.reject(erroOriginal), 1_000);
    await expect(promise).rejects.toBe(erroOriginal);
  });

  it('rejeita com "timeout salvando" quando ms estoura', async () => {
    // Promise que nunca resolve.
    let pending!: Promise<string>;
    pending = new Promise<string>(() => {
      // sem resolve nem reject: simula SAF write travado.
    });
    const promise = comTimeout(pending, 5_000);
    // Avanca o relogio fake exatamente para cima do timeout.
    jest.advanceTimersByTime(5_000);
    await expect(promise).rejects.toThrow('timeout salvando');
  });

  it('expoe default SAVE_TIMEOUT_DEFAULT_MS = 10_000', () => {
    expect(SAVE_TIMEOUT_DEFAULT_MS).toBe(10_000);
  });

  it('usa o default quando ms nao e passado', async () => {
    let pending!: Promise<string>;
    pending = new Promise<string>(() => {
      // nunca resolve
    });
    const promise = comTimeout(pending);
    // Antes de 10s nao rejeita.
    jest.advanceTimersByTime(9_999);
    // Aguarda microtasks pendentes; promise nao resolveu nem rejeitou.
    let resolvido = false;
    let rejeitado = false;
    promise.then(
      () => {
        resolvido = true;
      },
      () => {
        rejeitado = true;
      }
    );
    await Promise.resolve();
    expect(resolvido).toBe(false);
    expect(rejeitado).toBe(false);
    // Cruza o limite do default.
    jest.advanceTimersByTime(2);
    await expect(promise).rejects.toThrow('timeout salvando');
  });

  it('limpa o timer apos resolve para nao vazar handles', async () => {
    // Spy no clearTimeout global.
    const spy = jest.spyOn(global, 'clearTimeout');
    await comTimeout(Promise.resolve('ok'), 1_000);
    // clearTimeout deve ter sido chamado pelo finally do helper.
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
