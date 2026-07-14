// R-AUDIT-A11Y-MOVIMENTO (2026-07-13): E2E case para reduce-motion no
// slideshow Memorias. Valida COMPORTAMENTO observavel no Gauntlet web:
//   - com prefers-reduced-motion: reduce, o slide NAO avanca sozinho
//     (auto-avanco desligado; o usuario navega no toque);
//   - o container do Ken Burns NAO expoe mais o jargao ingles
//     "ken burns container" (achado 24 -- higiene de leitor de tela);
//   - com prefers-reduced-motion: no-preference (controle), o slide
//     volta a avancar sozinho (sem regressao do comportamento padrao).
//
// A deteccao web usa o mapeamento do react-native-web de
// AccessibilityInfo.isReduceMotionEnabled -> matchMedia('(prefers-
// reduced-motion: reduce)'), que o page.emulateMedia do playwright
// controla. O Ken Burns estatico, o loader parado e a deteccao do
// reduce-motion do SISTEMA sao proof-of-work DEVICE (spec §5.2).
//
// Executado via automacao de browser (nao por Jest; jest.config
// testMatch filtra *.test.ts). Comentarios sem acento.

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  emulateMedia(opts: {
    reducedMotion: 'reduce' | 'no-preference';
  }): Promise<unknown>;
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

// Folga alem do intervalo default (4s) do slideshow para observar (ou
// nao) o auto-avanco.
const ESPERA_AVANCO_MS = 5500;

// Abre o slideshow Memorias via API do Gauntlet e aguarda o render.
async function abrirSlideshow(page: PlaywrightPageLike): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { abrir: (rota: string) => void };
    };
    w.__gauntlet.abrir('/recap-memorias');
  });
  await page.waitForTimeout(1400);
}

// Assinatura textual do slide corrente. So o conteudo do slide (titulo/
// numero/frase) muda entre slides; o chrome (wordmark, header) e' fixo.
async function assinaturaSlide(page: PlaywrightPageLike): Promise<string> {
  return page.evaluate(() => document.body.innerText.trim());
}

export default async function caseRAuditA11yMovimento(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-AUDIT-A11Y-MOVIMENTO';
  const aspecto = 'reduce-motion';
  const screenshots: string[] = [];
  const dir = `docs/sprints/${sprint}-screenshots-gauntlet`;

  try {
    // 1. reduce-motion ON via media query + navegar para o gauntlet.
    await page.emulateMedia({ reducedMotion: 'reduce' });
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

    // 2. Auto-avanco DESLIGADO: capturar o slide, esperar > intervalo
    //    SEM interacao e conferir que nao mudou.
    await abrirSlideshow(page);
    const antes = await assinaturaSlide(page);
    await page.waitForTimeout(ESPERA_AVANCO_MS);
    const depois = await assinaturaSlide(page);
    const pathA = `${dir}/A-reduce-estatico.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);
    if (antes !== depois) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'com reduce-motion o slide avancou sozinho (auto-avanco nao foi desligado)',
        screenshots,
      };
    }

    // 3. Higiene de a11y: o jargao ingles "ken burns container" sumiu.
    const temJargao = await page.evaluate(
      () =>
        document.querySelectorAll('[aria-label="ken burns container"]').length >
        0
    );
    const pathB = `${dir}/B-sem-jargao.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);
    if (temJargao) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'o container ainda expoe aria-label="ken burns container" (jargao nao removido)',
        screenshots,
      };
    }

    // 4. CONTROLE (motion-normal): reduce-motion OFF, reabrir e conferir
    //    que o slide VOLTA a avancar sozinho (sem regressao).
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await abrirSlideshow(page);
    const normalAntes = await assinaturaSlide(page);
    await page.waitForTimeout(ESPERA_AVANCO_MS);
    const normalDepois = await assinaturaSlide(page);
    const pathC = `${dir}/C-motion-normal.png`;
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);
    if (normalAntes === normalDepois) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'sem reduce-motion o slide NAO avancou (regressao do auto-avanco padrao)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'reduce-motion desliga o auto-avanco e o jargao "ken burns container" sumiu; motion-normal restaura o auto-avanco. Ken Burns estatico + loader parado + deteccao do sistema sao proof-of-work device.',
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
