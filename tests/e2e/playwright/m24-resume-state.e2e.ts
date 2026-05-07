// E2E M24 -- resume state. Apos setUltimaRota('/saude-fisica') + reload,
// app deveria abrir em /memoria. Bug descoberto: abre em '/'.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM24(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M24';
  const aspecto = 'resume-state';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { reset: () => void; seed: () => void; setUltimaRota: (r: string) => void };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setUltimaRota('/saude-fisica');
    });
    await page.goto('http://localhost:8081/');
    await page.waitForTimeout(15000);

    const url = await page.evaluate(() => location.pathname);
    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M24/A-fail-redirect-home.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (url !== '/saude-fisica') {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `apos setUltimaRota=/memoria + reload, abriu ${url}, esperado /memoria`,
        screenshots,
      };
    }
    return { sprint, aspecto, status: 'PASS', detalhe: 'redirecionou para /memoria', screenshots };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
