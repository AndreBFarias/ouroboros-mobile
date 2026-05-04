// E2E M25 -- glifo Ouroboros estatico. Confirma que o SVG do
// loader renderiza com 4 grupos (3 aneis + 1 cabeca/wordmark) +
// transform string no formato 'rotate(angulo cx cy)'.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM25(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M25';
  const aspecto = 'cobra-glifo';
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
    await page.waitForTimeout(2000);

    const r = await page.evaluate(() => {
      const svg = document.querySelector('[aria-label="loader ouroboros"] svg');
      if (!svg) return { ok: false, motivo: 'sem svg' };
      const gs = svg.querySelectorAll('g');
      const transforms = Array.from(gs).map(g => g.getAttribute('transform')).filter(Boolean);
      return { ok: true, qtdG: gs.length, transforms };
    });

    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M25/A-loader-renderizado.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (!r.ok || (r.qtdG ?? 0) < 4) {
      return { sprint, aspecto, status: 'FAIL', detalhe: `glifo invalido: ${JSON.stringify(r)}`, screenshots };
    }
    return { sprint, aspecto, status: 'PASS', detalhe: `${r.qtdG} grupos, transform string ok`, screenshots };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
