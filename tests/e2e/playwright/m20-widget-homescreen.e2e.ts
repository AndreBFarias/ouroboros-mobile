// E2E M20 -- widget homescreen Android. Em web so valida que o
// toggle "Widget na tela inicial" esta presente em /settings.
// Validacao do widget nativo em si exige Nivel B (emulador Android).
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM20(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M20';
  const aspecto = 'widget-homescreen';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/settings');
    await page.waitForTimeout(60000);

    const tem = await page.evaluate(() =>
      document.body.innerText.toLowerCase().includes('widget')
    );

    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M20/A-toggle-settings.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (!tem) {
      return { sprint, aspecto, status: 'FAIL', detalhe: 'toggle Widget ausente em Settings', screenshots };
    }
    return {
      sprint,
      aspecto,
      status: 'INCONCLUSIVO',
      detalhe: 'toggle web presente; widget Android nativo precisa Nivel B (emulador)',
      screenshots,
    };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
