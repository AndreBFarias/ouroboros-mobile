// E2E #00 -- bootstrap do Gauntlet. Confirma que window.__gauntlet
// existe e responde, que seed() popula stores corretamente, e que
// estado() retorna snapshot esperado. Pre-requisito de todos os
// outros E2E.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseBootstrap(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-GAUNTLET';
  const aspecto = 'bootstrap';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    // Confirma window.__gauntlet
    const gauntletPresente = await page.evaluate(
      () =>
        typeof (globalThis as unknown as { __gauntlet?: unknown })
          .__gauntlet !== 'undefined'
    );
    if (!gauntletPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente. Confirme EXPO_PUBLIC_GAUNTLET=1.',
        screenshots,
      };
    }

    // Aplica seed e le estado
    const estadoPosSeed = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: {
          seed: () => void;
          estado: () => {
            onboardingDone: boolean;
            vaultRoot: string | null;
            nomes: { pessoa_a: string; pessoa_b: string };
          };
        };
      };
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

    const path = 'docs/sprints/M-GAUNTLET-screenshots/A-bootstrap.png';
    await page.screenshot({ path });
    screenshots.push(path);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'window.__gauntlet exposto + seed funcional',
      screenshots,
    };
  } catch (err) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `erro: ${(err as Error).message}`,
      screenshots,
    };
  }
}
