// E2E M11.1 -- regressao unificada Memorias usavel:
//   1. Heatmap centralizado horizontalmente no frame 412dp
//      (primeira linha tem x ~= (412 - largura_grid)/2 +- 8px).
//   2. FAB unificado verde presente na aba Fotos (M34.3 removeu FAB
//      proprio "adicionar foto").
//   3. Botao "Cadastrar exercicios na Galeria" presente na aba Treinos
//      (visivel quando total === 0, que e o caso apos seed limpo).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM111Regressao(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M11.1';
  const aspecto = 'memorias-usavel';
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

    // ---- 3. Aba Treinos (default ao abrir /memoria) ----
    const treinosCheck = await page.evaluate(() => {
      const txt = document.body.innerText;
      const heatmap = document.querySelector(
        '[aria-label="container heatmap centralizado"]'
      ) as HTMLElement | null;
      let centralizado = false;
      let dx = -1;
      if (heatmap) {
        const rect = heatmap.getBoundingClientRect();
        // Frame mobile do gauntlet em /_dev/gauntlet tem maxWidth 412dp.
        // Em /memoria (rota normal), o app nao tem o frame mobile -- a
        // viewport vira inteira do navegador. Para isolar a centralizacao
        // do CONTAINER do heatmap dentro do parent, conferimos que o
        // alignItems aplica margin equivalente em ambos os lados.
        const parent = heatmap.parentElement;
        if (parent) {
          const prect = parent.getBoundingClientRect();
          const left = rect.left - prect.left;
          const right = prect.right - rect.right;
          dx = Math.abs(left - right);
          centralizado = dx <= 8;
        }
      }
      return {
        temBotaoCadastrar: txt.includes('Cadastrar exercícios na Galeria'),
        heatmapPresente: !!heatmap,
        centralizado,
        deltaX: dx,
      };
    });

    const treinosShot = 'docs/sprints/M11.1-screenshots-gauntlet/A-treinos-heatmap-centralizado.png';
    await page.screenshot({ path: treinosShot });
    screenshots.push(treinosShot);

    if (!treinosCheck.heatmapPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'container heatmap centralizado nao encontrado',
        screenshots,
      };
    }
    if (!treinosCheck.centralizado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `heatmap nao centralizado: deltaX=${treinosCheck.deltaX}px (esperado <=8)`,
        screenshots,
      };
    }
    if (!treinosCheck.temBotaoCadastrar) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao "Cadastrar exercicios na Galeria" ausente (seed deveria gerar lista vazia => empty state)',
        screenshots,
      };
    }

    // ---- 2. Aba Fotos ----
    const tabFotos = await page.evaluate(() => {
      const t = document.querySelector('[aria-label="tab fotos"]') as HTMLElement | null;
      if (!t) return false;
      t.click();
      return true;
    });
    if (!tabFotos) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'tab fotos nao encontrada',
        screenshots,
      };
    }
    await page.waitForTimeout(500);

    // M34.3: o FAB proprio "adicionar foto" foi removido; o item virou
    // entrada do MenuCapturaVerde unificado. Confirmamos a presenca do
    // FAB verde unificado (substitui o FAB roxo proprio da aba).
    const fotosCheck = await page.evaluate(() => {
      return {
        fab: !!document.querySelector('[aria-label="abrir menu de captura"]'),
      };
    });

    const fotosShot = 'docs/sprints/M11.1-screenshots-gauntlet/B-fotos-com-fab.png';
    await page.screenshot({ path: fotosShot });
    screenshots.push(fotosShot);

    if (!fotosCheck.fab) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'FAB verde unificado ausente na aba Fotos (M34.3 removeu o FAB proprio)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        `heatmap centralizado (delta=${treinosCheck.deltaX}px), FAB Fotos presente, atalho Cadastrar exercicios visivel`,
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
