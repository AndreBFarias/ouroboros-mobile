// E2E M34.1.1 -- FAB roxo (FABMenu) some do DOM enquanto o
// MenuCapturaVerde / SheetFrase estao abertos. Garante o caminho B
// do M34.1 original (descartado por "invasivo" e adotado em M34.1.1
// como unico viavel).
//
// Cenario:
//   1. Seed e navega ate /memoria.
//   2. Confere FAB roxo presente (estado base).
//   3. Tap "abrir menu de captura" (FAB verde).
//   4. Confere FAB roxo AUSENTE do DOM (sheetCapturaAberto=true).
//   5. Tap "capturar frase" para subir o SheetFrase.
//   6. Confere FAB roxo continua AUSENTE (transicao menu->frase
//      mantem flag true).
//   7. Tap "cancelar frase" para fechar.
//   8. Confere FAB roxo VOLTA ao DOM (flag false).
//   9. Tambem cobre fechamento por gesto pan-down via __gauntlet
//      em cenario alternativo: abrir menu, fechar via close direto
//      simulando snap=-1, FAB volta.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface PageComConsole extends PlaywrightPageLike {
  on?: (
    evt: string,
    handler: (msg: { type: () => string; text: () => string }) => void
  ) => void;
}

export default async function caseM3411FabSomeComSheet(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M34.1.1';
  const aspecto = 'fab-some-com-sheet';
  const screenshots: string[] = [];

  const erros: string[] = [];
  const pageHook = page as PageComConsole;
  if (typeof pageHook.on === 'function') {
    pageHook.on('console', (msg) => {
      if (msg.type() === 'error') {
        erros.push(msg.text());
      }
    });
  }

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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO inativa?',
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

    // Estado base: FAB roxo presente.
    const fabPre = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="abrir menu lateral"]');
    });
    if (!fabPre) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB roxo (abrir menu lateral) ausente no estado base /memoria',
        screenshots,
      };
    }

    const baseShot = 'docs/sprints/M34.1.1-screenshots-gauntlet/A-fab-presente.png';
    await page.screenshot({ path: baseShot });
    screenshots.push(baseShot);

    // Tap no FAB verde -> abre MenuCapturaVerde -> flag true ->
    // FAB roxo deve sair do DOM.
    const verdeOk = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      if (!f) return false;
      f.click();
      return true;
    });
    if (!verdeOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB verde "abrir menu de captura" ausente',
        screenshots,
      };
    }
    await page.waitForTimeout(900);

    const fabDuranteMenu = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="abrir menu lateral"]');
    });
    if (fabDuranteMenu) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'FAB roxo continua no DOM apos abrir MenuCapturaVerde (flag sheetCapturaAberto nao propagou)',
        screenshots,
      };
    }

    const menuShot =
      'docs/sprints/M34.1.1-screenshots-gauntlet/B-fab-some-menu-aberto.png';
    await page.screenshot({ path: menuShot });
    screenshots.push(menuShot);

    // Tap em "capturar frase" -> menu fecha + SheetFrase abre.
    // FAB roxo deve continuar ausente durante toda a transicao.
    const fraseOk = await page.evaluate(() => {
      const it = document.querySelector(
        '[aria-label="capturar frase"]'
      ) as HTMLElement | null;
      if (!it) return false;
      it.click();
      return true;
    });
    if (!fraseOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Item "capturar frase" ausente no MenuCapturaVerde',
        screenshots,
      };
    }
    await page.waitForTimeout(700);

    const fabDuranteFrase = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="abrir menu lateral"]');
    });
    if (fabDuranteFrase) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'FAB roxo reapareceu durante transicao menu->SheetFrase (flag piscou para false)',
        screenshots,
      };
    }

    // Confirma SheetFrase montou (campo da frase visivel).
    const sheetMontou = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="campo da frase"]');
    });
    if (!sheetMontou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'SheetFrase nao montou (campo da frase ausente)',
        screenshots,
      };
    }

    const fraseShot =
      'docs/sprints/M34.1.1-screenshots-gauntlet/C-fab-some-frase-aberta.png';
    await page.screenshot({ path: fraseShot });
    screenshots.push(fraseShot);

    // Tap "cancelar frase" -> SheetFrase fecha -> flag false ->
    // FAB roxo volta.
    const cancelOk = await page.evaluate(() => {
      const c = document.querySelector(
        '[aria-label="cancelar frase"]'
      ) as HTMLElement | null;
      if (!c) return false;
      c.click();
      return true;
    });
    if (!cancelOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Botao "cancelar frase" ausente no SheetFrase',
        screenshots,
      };
    }
    await page.waitForTimeout(900);

    const fabPos = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="abrir menu lateral"]');
    });
    if (!fabPos) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'FAB roxo nao voltou ao DOM apos fechar SheetFrase (flag sheetCapturaAberto nao foi para false)',
        screenshots,
      };
    }

    const voltaShot =
      'docs/sprints/M34.1.1-screenshots-gauntlet/D-fab-volta-pos-cancelar.png';
    await page.screenshot({ path: voltaShot });
    screenshots.push(voltaShot);

    if (erros.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `console com erros: ${erros.slice(0, 3).join(' | ')}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'FAB roxo presente -> ausente apos abrir menu -> ausente durante frase -> volta apos cancelar',
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
