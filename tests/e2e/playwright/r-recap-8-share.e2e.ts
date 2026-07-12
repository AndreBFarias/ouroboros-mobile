// R-RECAP-8 (2026-07-10): E2E case para o overlay de share do
// slideshow Memorias. Valida COMPORTAMENTO (nao pixel):
//   - abrir /recap-memorias e tocar Compartilhar abre o overlay de
//     escolha de formato com os dois botoes (Stories / Post quadrado);
//   - Cancelar fecha o overlay e retoma o slideshow (botao pausar segue
//     acessivel, tela nao trava);
//   - escolher um formato no Gauntlet web retorna motivo 'web' (sem
//     captura nativa) -- a tela nao crasha e o botao Compartilhar volta
//     a ficar acessivel.
//
// A captura em si (PNG > 0 bytes, share sheet nativo, logcat sem
// ViewShot NPE) e' prova de runtime no device, coberta pela
// validacao ao vivo no celular -- nao pelo web.
//
// Executado via automacao de browser (nao por Jest;
// jest.config testMatch filtra *.test.ts). Comentarios sem acento.

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  click(selector: string): Promise<unknown>;
  screenshot(opts: { path: string; fullPage?: boolean }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<unknown>;
}

export interface ResultadoE2E {
  sprint: string;
  aspecto: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVO';
  detalhe: string;
  screenshots: string[];
}

export default async function caseRRecap8(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-RECAP-8';
  const aspecto = 'share-overlay';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset + seed deterministico.
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

    // 3. Abrir o slideshow Memorias.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => void };
      };
      w.__gauntlet.abrir('/recap-memorias');
    });
    await page.waitForTimeout(1200);

    // 4. Confirmar que o botao Compartilhar existe no header.
    const temCompartilhar = await page.evaluate(
      () =>
        document.querySelectorAll('[aria-label="compartilhar slide"]').length >
        0
    );
    if (!temCompartilhar) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao compartilhar nao encontrado no header do slideshow',
        screenshots,
      };
    }

    // 5. Tocar Compartilhar -> overlay de escolha de formato abre com
    //    os dois botoes.
    await page.click('[aria-label="compartilhar slide"]');
    await page.waitForTimeout(500);
    const path1 = `docs/sprints/${sprint}-screenshots-gauntlet/A-overlay-formato.png`;
    await page.screenshot({ path: path1 });
    screenshots.push(path1);

    const doisBotoes = await page.evaluate(() => {
      const stories = document.querySelectorAll(
        '[aria-label="compartilhar como stories"]'
      ).length;
      const quadrado = document.querySelectorAll(
        '[aria-label="compartilhar como post quadrado"]'
      ).length;
      return stories > 0 && quadrado > 0;
    });
    if (!doisBotoes) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'overlay nao expos os dois botoes de formato (stories + post quadrado)',
        screenshots,
      };
    }

    // 6. Cancelar fecha o overlay e retoma o slideshow (botao pausar
    //    segue acessivel; overlay some).
    await page.click('[aria-label="cancelar"]');
    await page.waitForTimeout(500);
    const retomou = await page.evaluate(() => {
      const overlayAberto =
        document.querySelectorAll('[aria-label="compartilhar como stories"]')
          .length > 0;
      const pausarPresente =
        document.querySelectorAll('[aria-label*="memorias"]').length > 0;
      return !overlayAberto && pausarPresente;
    });
    if (!retomou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos cancelar, o overlay nao fechou ou o slideshow nao retomou (tela travada)',
        screenshots,
      };
    }

    // 7. Reabrir e escolher um formato. No web nao ha captura nativa
    //    (motivo 'web'); a tela nao deve crashar e o botao Compartilhar
    //    volta a ficar acessivel.
    await page.click('[aria-label="compartilhar slide"]');
    await page.waitForTimeout(400);
    await page.click('[aria-label="compartilhar como post quadrado"]');
    await page.waitForTimeout(800);
    const path2 = `docs/sprints/${sprint}-screenshots-gauntlet/B-apos-escolha-web.png`;
    await page.screenshot({ path: path2 });
    screenshots.push(path2);

    const seguiuVivo = await page.evaluate(
      () =>
        document.querySelectorAll('[aria-label="compartilhar slide"]').length >
        0
    );
    if (!seguiuVivo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos escolher formato no web, a tela travou (botao compartilhar sumiu)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'overlay abre com dois formatos; cancelar retoma o slideshow; escolher formato no web nao trava a tela. Captura real (PNG > 0 bytes, share sheet, logcat sem NPE) e prova de runtime device.',
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
