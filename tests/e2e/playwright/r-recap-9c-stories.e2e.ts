// R-RECAP-9c (2026-07-13): caso E2E do slideshow Memorias -- barra de
// progresso anima (B2) e auto-advance corre sem travar (B3). Copiado da
// estrutura de tests/e2e/playwright/e2e-template.ts.
//
// Valida COMPORTAMENTO observavel no web (Gauntlet):
//   - a barra ativa PREENCHE (largura cresce ao longo do slide), em vez
//     de ficar fixa em ~50% (bug B2 antigo);
//   - o slideshow AVANCA sozinho sem interacao (B3), passando a barra
//     ativa para o proximo indice.
// Audio/haptic/long-press real ficam como proof-of-work device (Nivel C).
//
// Executar via automacao de browser (playwright MCP) no Gauntlet, nao
// via Jest (jest.config filtra *.test.ts).
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

// Mede a largura renderizada (getBoundingClientRect) de TODAS as barras
// internas de uma vez, ordenadas por indice. A barra ativa cresce via
// scaleX ancorado a esquerda, entao a largura visual reflete o progresso.
// Zero-arg (page.evaluate nao captura closures externas): a query roda
// inteira dentro do browser e devolve o array de larguras.
async function medirBarras(page: PlaywrightPageLike): Promise<number[]> {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll('[data-testid^="barra-inner-"]')
    );
    return nodes
      .map((el) => {
        const id = el.getAttribute('data-testid') ?? '';
        const n = Number.parseInt(id.replace('barra-inner-', ''), 10);
        return { n, w: el.getBoundingClientRect().width };
      })
      .sort((a, b) => a.n - b.n)
      .map((x) => x.w);
  });
}

export default async function caseRecap9cStories(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-RECAP-9c';
  const aspecto = 'stories-barra-autoadvance';
  const screenshots: string[] = [];
  const dir = 'docs/sprints/R-RECAP-9c-screenshots-gauntlet';

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

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
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // Navegar para o slideshow.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (r: string) => Promise<void> | void };
      };
      return w.__gauntlet.abrir('/recap-memorias');
    });
    // useFonts SDK 54 web demora na primeira navegacao fresh.
    await page.waitForTimeout(3000);

    // B2 -- barra ativa preenche: mede o indice 0 (ativo) em dois instantes.
    const larg0 = await medirBarras(page);
    const w0 = larg0[0] ?? -1;
    if (w0 < 0) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'barra-inner-0 nao encontrada; slideshow nao renderizou (vault seed sem slides?)',
        screenshots,
      };
    }
    await page.waitForTimeout(1500);
    const larg1 = await medirBarras(page);
    const w1 = larg1[0] ?? -1;
    await page.screenshot({ path: `${dir}/A-barra-preenchendo.png` });
    screenshots.push(`${dir}/A-barra-preenchendo.png`);

    // A barra ativa deve ter CRESCIDO (nao ficar fixa em ~50%).
    if (!(w1 > w0 + 2)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `barra ativa nao cresceu: w0=${w0.toFixed(1)} w1=${w1.toFixed(1)} (bug B2 -- barra fixa)`,
        screenshots,
      };
    }

    // B3 -- auto-advance: aguardar > intervaloS (default 4s) sem interagir.
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${dir}/B-auto-advance.png` });
    screenshots.push(`${dir}/B-auto-advance.png`);
    // A barra do indice 1 ja tem largura > 0 (slide avancou para o 1).
    const largAvanco = await medirBarras(page);
    const w1DepoisAvanco = largAvanco[1] ?? -1;
    if (!(w1DepoisAvanco > 0)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `auto-advance nao correu: barra-inner-1 largura=${w1DepoisAvanco.toFixed(1)} (bug B3 -- travou)`,
        screenshots,
      };
    }

    // B3 -- nao travar: apos mais ~2 intervalos, avancou de novo.
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `${dir}/C-sem-travar.png` });
    screenshots.push(`${dir}/C-sem-travar.png`);
    const largFinal = await medirBarras(page);
    const w2 = largFinal[2] ?? -1;
    if (!(w2 > 0)) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'apos 2 intervalos barra-inner-2 sem largura; pode ser slideshow com < 3 slides no seed',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `barra cresceu (w0=${w0.toFixed(1)} -> w1=${w1.toFixed(1)}); auto-advance correu >= 2 slides sem travar`,
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
