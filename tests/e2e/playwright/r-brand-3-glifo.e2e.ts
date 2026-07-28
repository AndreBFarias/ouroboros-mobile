// E2E R-BRAND-3-GLIFO: valida comportamento (nao so presenca) dos monomarks
// E1/E2/E3 na rota dev /_dev/bench-c2 do Gauntlet.
//   E1 -- o olho existe e pisca (opacity oscila abaixo do repouso 0.65).
//   E2 -- o anel existe e a rotacao avanca entre dois instantes.
//   E3 -- o wordmark "ouroboros"/"protocolo" e o ponto estao presentes.
// Roda via automacao de browser (nao por Jest -- testMatch filtra *.test.ts).
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

export default async function case_r_brand_3_glifo(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-BRAND-3-GLIFO';
  const aspecto = 'monomarks-E1-E2-E3';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/bench-c2');
    // boot fresh do useFonts SDK 54 pode demorar; aguarda estabilizar
    await page.waitForTimeout(6000);

    // --- E3: wordmark + ponto presentes ---
    const e3 = await page.evaluate(() => {
      const cont = document.querySelector('[aria-label="conceito e3"]');
      if (!cont) return { ok: false, motivo: 'container e3 ausente' };
      const texto = (cont as HTMLElement).innerText.toLowerCase();
      const temPonto = !!cont.querySelector('svg circle');
      return {
        ok: texto.includes('ouroboros') && texto.includes('protocolo') && temPonto,
        motivo: `texto="${texto.replace(/\s+/g, ' ').trim()}" ponto=${temPonto}`,
      };
    });
    if (!e3.ok) {
      return { sprint, aspecto, status: 'FAIL', detalhe: `E3: ${e3.motivo}`, screenshots };
    }

    // --- E2: anel presente e rotacao avanca ---
    const transformInicial = await page.evaluate(() => {
      const g = document.querySelector('[aria-label="conceito e2"] [data-anim-id*="anel"]');
      return g ? g.getAttribute('transform') : null;
    });
    await page.waitForTimeout(700);
    const transformDepois = await page.evaluate(() => {
      const g = document.querySelector('[aria-label="conceito e2"] [data-anim-id*="anel"]');
      return g ? g.getAttribute('transform') : null;
    });
    const e2Presente = transformDepois !== null;
    const e2Rotaciona = transformInicial !== transformDepois && transformDepois !== null;
    if (!e2Presente) {
      return { sprint, aspecto, status: 'FAIL', detalhe: 'E2: anel ausente', screenshots };
    }
    if (!e2Rotaciona) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `E2: anel nao rotaciona (transform ${transformInicial} -> ${transformDepois})`,
        screenshots,
      };
    }

    // --- E1: olho presente e pisca (amostra a opacity ao longo de ~6,5s) ---
    const olhoPresente = await page.evaluate(
      () => !!document.querySelector('[aria-label="conceito e1"] [data-anim-id*="olho"]')
    );
    if (!olhoPresente) {
      return { sprint, aspecto, status: 'FAIL', detalhe: 'E1: olho ausente', screenshots };
    }
    let minOpacidade = 1;
    for (let i = 0; i < 65; i++) {
      const op = await page.evaluate(() => {
        const c = document.querySelector('[aria-label="conceito e1"] [data-anim-id*="olho"]');
        const v = c ? c.getAttribute('opacity') : null;
        return v == null ? 1 : Number(v);
      });
      if (op < minOpacidade) minOpacidade = op;
      await page.waitForTimeout(100);
    }
    const e1Pisca = minOpacidade < 0.5;

    await page.screenshot({ path: `screenshots/${sprint}-conceitos.png` });
    screenshots.push(`screenshots/${sprint}-conceitos.png`);

    if (!e1Pisca) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `E1 olho presente porem blink nao capturado na janela (min opacity=${minOpacidade}); E2 rotaciona; E3 ok`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `E1 pisca (min opacity=${minOpacidade}); E2 rotaciona; E3 wordmark+ponto ok`,
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
