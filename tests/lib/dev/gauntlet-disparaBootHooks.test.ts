// V4 v2 (escopo expandido pos-rejeicao formal V4 v1, 2026-05-08): unit
// para gauntlet.disparaBootHooks. Em ambiente Jest, GAUNTLET_ATIVO=false
// (Platform.OS='ios' por default no jest-expo preset), entao o caminho
// efetivo e o early return guarda-de-mobile.
//
// Cenarios cobertos:
//  - API exposta no objeto `gauntlet` (forma e tipo).
//  - Chamada e no-op em mobile/Jest (nao chama reagendarTodosBootHooks).
//  - Promise resolve sem lancar.
//
// O caminho web/dev (require dinamico de @/lib/boot/reagendamento e
// re-disparo da fila) e validado em browser pelo E2E playwright em
// tests/e2e/playwright/m-save-devices-index.e2e.ts (guia separado: nao
// roda em Jest -- jest.config.testMatch filtra *.e2e.ts).
//
// Comentarios sem acento.

import { gauntlet } from '@/lib/dev/gauntlet';

describe('gauntlet.disparaBootHooks (V4 v2)', () => {
  it('expoe disparaBootHooks no API publica como funcao', () => {
    expect(typeof gauntlet.disparaBootHooks).toBe('function');
  });

  it('e no-op quando GAUNTLET_ATIVO=false (mobile/Jest)', async () => {
    // Em Jest default Platform.OS='ios' -> GAUNTLET_ATIVO=false.
    // O guard explicito retorna undefined sem importar reagendamento,
    // entao nao precisamos mockar @/lib/boot/reagendamento aqui.
    const r = await gauntlet.disparaBootHooks();
    expect(r).toBeUndefined();
  });

  it('chamadas repetidas nao explodem (idempotencia minima)', async () => {
    await gauntlet.disparaBootHooks();
    await gauntlet.disparaBootHooks();
    await gauntlet.disparaBootHooks();
    // Nao chegamos a verificar conteudo do useVaultMock aqui porque
    // em Jest o guard impede execucao da fila. Conteudo+idempotencia
    // de bytes sao validados em browser pelo E2E.
    expect(typeof gauntlet.disparaBootHooks).toBe('function');
  });
});
