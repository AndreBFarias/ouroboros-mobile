// E2E M11.1 -- aba Fotos da MemoriasScreen: confirma FAB "adicionar
// foto" no DOM e que __gauntlet.adicionarFotoMock() insere uma
// thumbnail no grid (mesmo sem expo-image-picker funcionar em web).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM111Fotos(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M11.1';
  const aspecto = 'fotos-upload';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: { reset: () => void; seed: () => void };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente',
        screenshots,
      };
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/memoria');
    });
    await page.waitForTimeout(1500);

    // Click na tab Fotos.
    const tabClicada = await page.evaluate(() => {
      const t = document.querySelector('[aria-label="tab fotos"]') as HTMLElement | null;
      if (!t) return false;
      t.click();
      return true;
    });
    if (!tabClicada) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'tab fotos nao encontrada',
        screenshots,
      };
    }
    await page.waitForTimeout(700);

    const fabPresente = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="adicionar foto"]');
    });
    if (!fabPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB adicionar foto ausente no DOM',
        screenshots,
      };
    }

    const antes = 'docs/sprints/M11.1-screenshots-gauntlet/B-fotos-com-fab.png';
    await page.screenshot({ path: antes });
    screenshots.push(antes);

    // Aciona helper mock e confirma incremento na galeria.
    const cresceu = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { adicionarFotoMock: () => Promise<void> };
      };
      const before = document.querySelectorAll('[aria-label^="foto galeria-manual"]').length;
      await w.__gauntlet.adicionarFotoMock();
      // Aguarda re-render do React.
      await new Promise((r) => setTimeout(r, 600));
      const after = document.querySelectorAll('[aria-label^="foto galeria-manual"]').length;
      return after > before;
    });

    const depois = 'docs/sprints/M11.1-screenshots-gauntlet/B2-fotos-com-mock.png';
    await page.screenshot({ path: depois });
    screenshots.push(depois);

    if (!cresceu) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'adicionarFotoMock nao incrementou contagem de thumbs (verificar useFotosAgregadas + GAUNTLET_ATIVO)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'FAB adicionar foto presente; adicionarFotoMock insere thumb no grid',
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
