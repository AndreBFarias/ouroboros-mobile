// E2E M23 -- onboarding 3 frames. Valida pelo menos Frame 1
// renderizando ("Como voce se chama?"). Frames 2/3 sao um percurso
// interativo; este caso confirma que o fluxo abre pos-reset.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM23(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M23';
  const aspecto = 'onboarding-frame1';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet: { reset: () => void } };
      w.__gauntlet.reset();
    });
    await page.goto('http://localhost:8081/onboarding');
    await page.waitForTimeout(15000);

    const ok = await page.evaluate(
      () =>
        document.body.innerText.includes('Como voc') &&
        document.body.innerText.includes('chama')
    );

    const path =
      'docs/validacao-gauntlet-2026-05-03/screenshots/M23/A-frame1-nome.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (!ok) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'titulo Frame 1 ausente',
        screenshots,
      };
    }
    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'Frame 1 renderiza',
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
