// R-RECAP-9 (2026-07-11): E2E case para o botao de som do slideshow
// Memorias. Valida COMPORTAMENTO (nao o audio em si):
//   - abrir /recap-memorias mostra o botao de som no header, ligado por
//     default (rotulo "silenciar musica", icone Volume2);
//   - tocar o botao muta (rotulo vira "ativar musica", icone VolumeX);
//   - o estado PERSISTE: reabrir o slideshow mantem o mudo (o toggle
//     recapMusicaFundo vive no store persistido); tocar de novo restaura.
//
// O audio real (faixa toca audivel, fade-in/out sem estouro, duck do
// audio anexado) e' proof-of-work DEVICE (spec §8), coberto
// ao vivo no celular -- nao pelo web (sem saida de audio
// deterministica no Gauntlet).
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

export default async function caseRRecap9(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-RECAP-9';
  const aspecto = 'botao-som';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset + seed deterministico (recapMusicaFundo volta ao default
    //    ON no reset dos settings).
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

    // 4. Botao de som existe e comeca LIGADO (rotulo "silenciar musica").
    const ligadoInicial = await page.evaluate(
      () =>
        document.querySelectorAll('[aria-label="silenciar musica"]').length > 0
    );
    if (!ligadoInicial) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'botao de som nao encontrado ligado por default (esperado rotulo "silenciar musica")',
        screenshots,
      };
    }
    const path1 = `docs/sprints/${sprint}-screenshots-gauntlet/A-som-ligado.png`;
    await page.screenshot({ path: path1 });
    screenshots.push(path1);

    // 5. Tocar o botao -> muta (rotulo vira "ativar musica").
    await page.click('[aria-label="silenciar musica"]');
    await page.waitForTimeout(500);
    const mutou = await page.evaluate(
      () =>
        document.querySelectorAll('[aria-label="ativar musica"]').length > 0 &&
        document.querySelectorAll('[aria-label="silenciar musica"]').length ===
          0
    );
    if (!mutou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos tocar o botao, o estado nao virou mudo (rotulo "ativar musica" ausente)',
        screenshots,
      };
    }
    const path2 = `docs/sprints/${sprint}-screenshots-gauntlet/B-som-mudo.png`;
    await page.screenshot({ path: path2 });
    screenshots.push(path2);

    // 6. Persistencia: navegar para outra rota e reabrir o slideshow;
    //    o mudo deve continuar (recapMusicaFundo persistido no store).
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => void };
      };
      w.__gauntlet.abrir('/settings');
    });
    await page.waitForTimeout(800);
    // A secao de settings tambem expoe o toggle (discoverabilidade).
    const temToggleSettings = await page.evaluate(
      () =>
        document.querySelectorAll(
          '[aria-label="linha toggle musica de fundo recap"]'
        ).length > 0 ||
        document.querySelectorAll('[aria-label="toggle musica de fundo recap"]')
          .length > 0
    );
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => void };
      };
      w.__gauntlet.abrir('/recap-memorias');
    });
    await page.waitForTimeout(1200);
    const persistiuMudo = await page.evaluate(
      () =>
        document.querySelectorAll('[aria-label="ativar musica"]').length > 0
    );
    if (!persistiuMudo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos reabrir o slideshow, o mudo nao persistiu (recapMusicaFundo nao ficou no store)',
        screenshots,
      };
    }

    // 7. Tocar de novo -> restaura o som ligado.
    await page.click('[aria-label="ativar musica"]');
    await page.waitForTimeout(500);
    const restaurou = await page.evaluate(
      () =>
        document.querySelectorAll('[aria-label="silenciar musica"]').length > 0
    );
    if (!restaurou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos tocar de novo, o som nao voltou a ligar (rotulo "silenciar musica" ausente)',
        screenshots,
      };
    }
    const path3 = `docs/sprints/${sprint}-screenshots-gauntlet/C-som-restaurado.png`;
    await page.screenshot({ path: path3 });
    screenshots.push(path3);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `botao de som liga/desliga e persiste (reabertura mantem o estado; toggle tambem em /settings=${temToggleSettings}). Audio audivel, fade sem estouro e duck do anexado sao proof-of-work device.`,
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
