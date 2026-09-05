// AUDIT-P1-9 -- idempotencia da fila de boot hooks, observada no Vault mock.
//
// Por que este caso existe no browser e nao so' em Jest: o Gauntlet e' o
// unico lugar onde a fila roda de ponta a ponta contra um Vault de
// verdade (mock), com as stores hidratadas e os dynamic imports
// resolvendo pelo bundler real. Jest prova que cada hook chama a funcao
// certa; aqui prova-se que rodar a fila DE NOVO nao refaz o trabalho.
//
// O assert e' sobre comportamento observavel -- a lista de arquivos do
// Vault mock antes e depois --, nao sobre presenca visual.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

interface JanelaGauntlet {
  __gauntlet?: {
    reset: () => void;
    seed: () => void;
    disparaBootHooks: () => Promise<void>;
    listarVaultMock: () => string[];
  };
}

export default async function case_audit_p1_9_boot_hooks_infra(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P1-9';
  const aspecto = 'idempotencia-boot-hooks';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    const pronto = await page.evaluate(() => {
      const w = globalThis as unknown as JanelaGauntlet;
      if (!w.__gauntlet) return false;
      if (typeof w.__gauntlet.disparaBootHooks !== 'function') return false;
      if (typeof w.__gauntlet.listarVaultMock !== 'function') return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      return true;
    });
    if (!pronto) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'window.__gauntlet incompleto (disparaBootHooks/listarVaultMock). Confirme EXPO_PUBLIC_GAUNTLET=1.',
        screenshots,
      };
    }
    await page.waitForTimeout(1500);

    // Primeira passada: a fila roda e pode reorganizar o Vault.
    const primeira = await page.evaluate(async () => {
      const w = globalThis as unknown as JanelaGauntlet;
      const antes = w.__gauntlet!.listarVaultMock().slice().sort();
      await w.__gauntlet!.disparaBootHooks();
      const depois = w.__gauntlet!.listarVaultMock().slice().sort();
      return { antes, depois };
    });
    await page.waitForTimeout(1200);

    // Segunda passada: as rotinas one-shot ja marcaram suas flags, entao
    // a lista de arquivos nao pode mudar mais.
    const segunda = await page.evaluate(async () => {
      const w = globalThis as unknown as JanelaGauntlet;
      const antes = w.__gauntlet!.listarVaultMock().slice().sort();
      await w.__gauntlet!.disparaBootHooks();
      const depois = w.__gauntlet!.listarVaultMock().slice().sort();
      return { antes, depois };
    });

    const estavel =
      JSON.stringify(segunda.antes) === JSON.stringify(segunda.depois);
    if (!estavel) {
      const entraram = segunda.depois.filter((a) => !segunda.antes.includes(a));
      const sairam = segunda.antes.filter((a) => !segunda.depois.includes(a));
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Segunda passada da fila alterou o Vault -- rotina one-shot reexecutou. Entraram: ${JSON.stringify(
          entraram.slice(0, 5)
        )}; sairam: ${JSON.stringify(sairam.slice(0, 5))}.`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `Fila idempotente: 1a passada ${primeira.antes.length} -> ${primeira.depois.length} arquivos; 2a passada estavel em ${segunda.depois.length}.`,
      screenshots,
    };
  } catch (e) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `Excecao: ${String(e).slice(0, 200)}`,
      screenshots,
    };
  }
}
