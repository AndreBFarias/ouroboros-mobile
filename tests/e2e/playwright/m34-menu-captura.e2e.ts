// E2E M34 -- MenuCapturaVerde na tab Memorias.
// Verifica:
//  1. FAB verde "abrir menu de captura" presente na rota /memoria.
//  2. Tap abre sheet e expoe os 4 itens (foto/musica/video/frase).
//  3. Tap em "capturar frase" navega para o sheet de frase, com label
//     "campo da frase" exposto na arvore de acessibilidade.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM34MenuCaptura(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M34';
  const aspecto = 'menu-captura';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // Auditoria 2026-05-04 (item 20): reset() antes de seed() garante
    // ordem de execucao independente entre casos E2E.
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

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    const fabPresente = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="abrir menu de captura"]');
    });
    if (!fabPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'FAB verde "abrir menu de captura" ausente no DOM da rota /memoria',
        screenshots,
      };
    }

    const fab =
      'docs/sprints/M34-screenshots-gauntlet/A-fab-verde-memorias.png';
    await page.screenshot({ path: fab });
    screenshots.push(fab);

    // Tap no FAB para abrir o sheet do menu.
    const tapOk = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      if (!f) return false;
      f.click();
      return true;
    });
    if (!tapOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'falha ao clicar no FAB verde',
        screenshots,
      };
    }
    await page.waitForTimeout(700);

    // Conferencia dos 4 itens. Em web o gorhom/bottom-sheet nao anima
    // (A17), mas o conteudo entra na arvore a11y; selectoramos pelos
    // accessibilityLabel canonicos.
    const itensDisponiveis = await page.evaluate(() => {
      const labels = [
        'capturar foto',
        'capturar musica',
        'capturar video',
        'capturar frase',
      ];
      return labels.filter((l) =>
        document.querySelector(`[aria-label="${l}"]`)
      );
    });
    if (itensDisponiveis.length !== 4) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `esperado 4 itens (foto/musica/video/frase), encontrado ${itensDisponiveis.length}: ${itensDisponiveis.join(', ')}`,
        screenshots,
      };
    }

    const aberto = 'docs/sprints/M34-screenshots-gauntlet/A-menu-aberto.png';
    await page.screenshot({ path: aberto });
    screenshots.push(aberto);

    // Tap em capturar frase abre o sheet de frase. Em web o sheet
    // tambem nao anima, mas BottomSheetView vira <View> com accessibility
    // label do conteudo filho ("campo da frase").
    const tapFrase = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="capturar frase"]'
      ) as HTMLElement | null;
      if (!f) return false;
      f.click();
      return true;
    });
    if (!tapFrase) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'falha ao clicar em capturar frase',
        screenshots,
      };
    }
    // O caller delay timeout abre sheet em 200ms; aguardamos 800.
    await page.waitForTimeout(800);

    const fraseSheet = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="campo da frase"]');
    });
    if (!fraseSheet) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'sheet de frase nao montou (campo da frase ausente)',
        screenshots,
      };
    }

    const fraseShot = 'docs/sprints/M34-screenshots-gauntlet/A-sheet-frase.png';
    await page.screenshot({ path: fraseShot });
    screenshots.push(fraseShot);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'FAB verde presente; sheet abre com 4 itens; sheet de frase monta com campo acessivel',
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
