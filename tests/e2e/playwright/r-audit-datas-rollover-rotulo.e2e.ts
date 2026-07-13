// Caso E2E R-AUDIT-DATAS: guarda de regressao do rotulo do card "Ainda
// de ontem" da Home apos a troca do helper de dias (diasEntreYmd ->
// diasEntre) em selecionarRollover. O nucleo do bug (criterio 3 a noite)
// NAO e reproduzivel no Gauntlet (relogio de parede nao e controlavel na
// web); a prova autoritativa desse ponto e o unit test com setSystemTime.
// Este E2E cobre a face UI-observavel: o rotulo calmo por item
// ("ontem" / "ha N dias") continua correto depois do refactor.
//
// Estrutura copiada de tests/e2e/playwright/e2e-template.ts (template
// canonico pos-scrub). Executado via automacao de browser no Gauntlet,
// nao por Jest (jest.config testMatch filtra *.test.ts).
//
// Comentarios sem acento (convencao shell/CI).

import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

export default async function case_r_audit_datas_rollover_rotulo(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-AUDIT-DATAS';
  const aspecto = 'rollover-rotulo';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset + seed deterministico (cada caso comeca limpo).
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          seedComDados?: () => void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      // seedComDados tende a produzir pendencias de dias anteriores
      // (rollover); cai para seed() simples se indisponivel.
      if (typeof w.__gauntlet.seedComDados === 'function') {
        w.__gauntlet.seedComDados();
      } else {
        w.__gauntlet.seed();
      }
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

    // 3. Abrir a Home (rota '/').
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> | void };
      };
      await w.__gauntlet?.abrir('/');
    });

    // 4. Aguardar render da Home.
    await page.waitForTimeout(1000);

    // 5. Asserts: se ha rollover, o titulo "Ainda de ontem" aparece e ha
    // ao menos um rotulo casando /^(ontem|ha \d+ dias)$/. Se o seed nao
    // gerou rollover, o card se auto-oculta -> INCONCLUSIVO (nao falsear
    // PASS).
    const analise = await page.evaluate(() => {
      const corpo = document.body?.innerText ?? '';
      const temTitulo = corpo.includes('Ainda de ontem');
      // Rotulo calmo por item; "ha" pode vir acentuado ("ha") na UI.
      const temRotulo = /(?:^|\s)(ontem|h[aá] \d+ dias)(?:\s|$)/m.test(corpo);
      return { temTitulo, temRotulo };
    });

    const path = 'screenshots/R-AUDIT-DATAS-rollover-rotulo.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (!analise.temTitulo) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'card "Ainda de ontem" nao renderizado (seed sem pendencia de dia anterior); rollover auto-ocultado. Sem rollout, o rotulo nao e observavel neste seed.',
        screenshots,
      };
    }
    if (!analise.temRotulo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'card "Ainda de ontem" presente mas nenhum rotulo casou /^(ontem|ha N dias)$/; a troca de helper pode ter quebrado diasAtras/rotulo.',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'card "Ainda de ontem" com rotulo calmo preservado apos troca diasEntreYmd -> diasEntre.',
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
