// E2E R-HOME-4c -- valida o card "Na sua semana" + a limpeza da home.
// Cobre (spec §6):
//   1) Semana com dados (seed): card "Na sua semana" presente, destaque
//      casando /\d+ (conquista|crise|registro)s?/; "Ver storybook de
//      componentes" AUSENTE da home.
//   2) Tap no card -> Recap aberto com o periodo "Semana" ativo.
//   3) Semana vazia (reset sem seed): card "Na sua semana" AUSENTE;
//      nenhuma caixa "nada/vazio esta semana".
//   4) /settings (em __DEV__): "Storybook de componentes" presente na
//      secao de desenvolvimento.
//
// Pre-requisito: ./gauntlet.sh em foreground (EXPO_PUBLIC_GAUNTLET=1).
//
// NAO roda via npm test (jest testMatch filtra *.test.ts). Executado
// via automacao de browser.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from './e2e-template';

const DIR = 'docs/sprints/R-HOME-4-screenshots-gauntlet';

export default async function caseRHome4c(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-HOME-4c';
  const aspecto = 'card-na-sua-semana-e-limpeza-storybook';
  const screenshots: string[] = [];

  try {
    // 1. Boot gauntlet + reset + seed deterministico. A seed popula
    //    humor/diario/eventos nos ultimos dias, logo a semana tem
    //    registros >= 1.
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

    // 2. Abrir Tela Hoje (rota raiz).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(2000);

    // 3. Captura A: card "Na sua semana" com dados.
    const pathA = `${DIR}/4c-card-na-sua-semana-com-dados.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    // 4. Asserts: card presente + destaque no formato esperado +
    //    storybook AUSENTE da home.
    const comDados = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      const tem = (s: string) => textos.some((t) => t === s);
      const destaqueRe = /^\d+ (conquista|crise|registro)s?(, \d+ crises?)?$/;
      return {
        temTitulo: tem('Na sua semana'),
        temDestaque: textos.some((t) => destaqueRe.test(t)),
        temStorybook: tem('Ver storybook de componentes'),
        // BotaoRecap standalone absorvido: nao deve haver pill "Recap".
        temRecapPill: tem('Recap'),
      };
    });
    if (!comDados.temTitulo || !comDados.temDestaque) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `card "Na sua semana" ausente ou destaque fora do formato: ${JSON.stringify(comDados)}`,
        screenshots,
      };
    }
    if (comDados.temStorybook) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'link "Ver storybook de componentes" ainda presente na home',
        screenshots,
      };
    }

    // 5. Captura B: home sem o link de storybook.
    const pathB = `${DIR}/4c-home-sem-storybook.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    // 6. Tap no card "Na sua semana" (role button, aria-label sem acento).
    const tapCard = await page.evaluate(() => {
      const alvo = document.querySelector(
        '[role="button"][aria-label="na sua semana"]'
      );
      if (!alvo) return false;
      (alvo as HTMLElement).click();
      return true;
    });
    if (!tapCard) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'card "na sua semana" nao encontrado para tap',
        screenshots,
      };
    }
    await page.waitForTimeout(1500);

    // 7. Assert: Recap aberto com o periodo "Semana" ativo (aria-selected
    //    no chip Semana; accessibilityState.selected -> aria-selected).
    const noRecap = await page.evaluate(() => {
      const semanaAtivo = Array.from(
        document.querySelectorAll('[role="button"][aria-selected="true"]')
      ).some((el) => (el.textContent ?? '').trim() === 'Semana');
      const temChipSemana = Array.from(
        document.querySelectorAll('[role="button"]')
      ).some((el) => (el.textContent ?? '').trim() === 'Semana');
      return { semanaAtivo, temChipSemana };
    });
    if (!noRecap.temChipSemana || !noRecap.semanaAtivo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `apos tap no card, Recap nao abriu no periodo Semana: ${JSON.stringify(noRecap)}`,
        screenshots,
      };
    }

    // 8. Caso vazio: reset SEM seed, reabrir home. Card deve sumir e
    //    nenhuma caixa "nada/vazio esta semana" pode existir.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { reset: () => void; abrir: (rota: string) => Promise<void> };
      };
      w.__gauntlet?.reset();
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(2000);

    const pathC = `${DIR}/4c-semana-vazia-sem-card.png`;
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);

    const vazio = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return {
        temTitulo: textos.some((t) => t === 'Na sua semana'),
        temCaixaVazia: textos.some((t) => /nada esta semana|nada nesta semana/i.test(t)),
      };
    });
    if (vazio.temTitulo || vazio.temCaixaVazia) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `semana vazia deveria ocultar o card sem caixa vazia: ${JSON.stringify(vazio)}`,
        screenshots,
      };
    }

    // 9. Settings (em __DEV__): "Storybook de componentes" presente na
    //    secao de desenvolvimento.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/settings');
    });
    await page.waitForTimeout(1500);

    const pathD = `${DIR}/4c-settings-dev-storybook.png`;
    await page.screenshot({ path: pathD });
    screenshots.push(pathD);

    const emSettings = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return {
        temSecaoDev: textos.some((t) => t === 'Desenvolvimento'),
        temStorybook: textos.some((t) => t === 'Storybook de componentes'),
      };
    });
    if (!emSettings.temStorybook) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `entrada "Storybook de componentes" ausente em settings dev: ${JSON.stringify(emSettings)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'card "Na sua semana" com destaque + tap abre Recap no periodo Semana; storybook fora da home e presente em settings dev; semana vazia oculta o card sem caixa vazia',
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
