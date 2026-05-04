// E2E M27 -- FABMenu + MenuLateral. Confirma FAB no canto inferior
// esquerdo do frame mobile (~64dp width).
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM27(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M27';
  const aspecto = 'fab-menu';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: { reset: () => void; seed: () => void };
      };
      w.__gauntlet?.reset();
      w.__gauntlet?.seed();
    });
    await page.goto('http://localhost:8081/humor');
    await page.waitForTimeout(35000);

    const r = await page.evaluate(() => {
      const fab = document.querySelector('[aria-label*="abrir menu" i]');
      if (!fab) return null;
      const rect = (fab as Element).getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M27/A-fab-canto-inferior.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (!r) {
      return { sprint, aspecto, status: 'FAIL', detalhe: 'FAB ausente no DOM', screenshots };
    }
    if (r.width < 56 || r.width > 80) {
      return { sprint, aspecto, status: 'FAIL', detalhe: `FAB width=${r.width}, esperado ~64dp`, screenshots };
    }
    return { sprint, aspecto, status: 'PASS', detalhe: `FAB width=${r.width}, x=${r.x}, y=${r.y}`, screenshots };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
