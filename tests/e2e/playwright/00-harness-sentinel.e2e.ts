// E2E sentinela do harness (R-CI-E2E-WEB-a). Prova o runner fim a fim:
// se este caso sai PASS, o harness importou o modulo, executou o default,
// passou o page real e traduziu o ResultadoE2E corretamente.
//
// Confirma o minimo do Gauntlet: window.__gauntlet presente + seed()
// funcional (onboarding done, vaultRoot mock, nomes default). Adaptado do
// 00-bootstrap.e2e.ts. Nao depende de nenhuma feature de UI da sprint --
// so do contrato de boot do Gauntlet, que e' pre-requisito de todos os
// demais casos.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from './e2e-template';

export default async function caseHarnessSentinel(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-CI-E2E-WEB';
  const aspecto = 'harness-sentinel';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    // 1. window.__gauntlet exposto?
    const gauntletPresente = await page.evaluate(
      () =>
        typeof (globalThis as unknown as { __gauntlet?: unknown }).__gauntlet !==
        'undefined'
    );
    if (!gauntletPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente. Metro sem Gauntlet ativo (EXPO_PUBLIC_GAUNTLET=1 + dev web)?',
        screenshots,
      };
    }

    // 2. reset + seed e le o estado resultante.
    const estadoPosSeed = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: {
          reset: () => void;
          seed: () => void;
          estado: () => {
            onboardingDone: boolean;
            vaultRoot: string | null;
            nomes: { pessoa_a: string; pessoa_b: string };
          };
        };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      return w.__gauntlet.estado();
    });

    const okOnboarding = estadoPosSeed.onboardingDone === true;
    const okVault = estadoPosSeed.vaultRoot === 'web://mock-vault/Ouroboros';
    const okNomes = estadoPosSeed.nomes.pessoa_a === 'Nome_A';

    if (!okOnboarding || !okVault || !okNomes) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `seed nao aplicou corretamente: ${JSON.stringify(estadoPosSeed)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'harness fim a fim: window.__gauntlet exposto + seed() aplicou onboarding/vault/nomes',
      screenshots,
    };
  } catch (err) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `erro inesperado: ${(err as Error).message}`,
      screenshots,
    };
  }
}
