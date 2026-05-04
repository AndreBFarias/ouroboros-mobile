// E2E M26 -- 4 sheets opacas. Em web sheets via __gauntlet.abrirSheet
// causam navegacao destrutiva (chrome-error). Validacao limitada:
// confirma backgroundColor Dracula em rotas adjacentes.
// INCONCLUSIVO -- requer Nivel B (emulador) para validar sheets.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM26(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M26';
  const aspecto = 'sheets-opacas';
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
    await page.waitForTimeout(8000);

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M26/A-redirect-gauntlet.png';
    await page.screenshot({ path });
    screenshots.push(path);

    const okBg = bg === 'rgb(20, 21, 26)';
    if (!okBg) {
      return { sprint, aspecto, status: 'FAIL', detalhe: `bg=${bg}, esperado rgb(20, 21, 26)`, screenshots };
    }
    return {
      sprint,
      aspecto,
      status: 'INCONCLUSIVO',
      detalhe: 'bg Dracula confirmado; abrirSheet em web causa chrome-error -- requer Nivel B',
      screenshots,
    };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
