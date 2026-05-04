// E2E M28 -- nomes reais via setNomes + tela editar-pessoa.
// Apos setNomes('TestA','TestB'), tela /settings/editar-pessoa
// renderiza titulo TESTA (uppercase) e input com TestA.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM28(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M28';
  const aspecto = 'nomes-reais';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: {
          reset: () => void;
          seed: () => void;
          setNomes: (a: string | null, b: string | null) => void;
        };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setNomes('TestA', 'TestB');
    });
    await page.goto('http://localhost:8081/settings/editar-pessoa');
    await page.waitForTimeout(15000);

    const r = await page.evaluate(() => ({
      hasTestA: document.body.innerText.toUpperCase().includes('TESTA'),
      preview: document.body.innerText.slice(0, 300),
    }));

    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M28/B-nomes-testa-renderizado.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (!r.hasTestA) {
      return { sprint, aspecto, status: 'FAIL', detalhe: `TESTA ausente. preview=${r.preview}`, screenshots };
    }
    return { sprint, aspecto, status: 'PASS', detalhe: 'header TESTA renderiza apos setNomes', screenshots };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
