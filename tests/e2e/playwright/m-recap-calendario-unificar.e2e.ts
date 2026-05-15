// E2E L2 (M-RECAP-CALENDARIO-UNIFICAR) — Recap absorveu o antigo
// Calendario de Conquistas. Toggle de modo Lista/Calendario no header.
// Valida via Gauntlet:
//   1. Reset + seed deterministico do estado das stores.
//   2. Navegacao para /recap via window.__gauntlet.abrir().
//   3. Toggle de modo presente (botoes "Lista" e "Calendario").
//   4. Default modo "Lista" — ChipGroup de periodo visivel.
//   5. Tap em "Calendario" — ChipGroup some, container do modo
//      Calendario aparece (aria-label "recap modo calendario").
//   6. Item "Calendario" (top-level) ausente do MenuLateral.
//   7. Captura screenshots em
//      docs/sprints/M-RECAP-CALENDARIO-UNIFICAR-screenshots-gauntlet/.
//
// Executor: orquestrador (Claude) via playwright MCP.
// Ver template: docs/templates/e2e-template.e2e.ts.
//
// Comentarios sem acento.

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  evaluateWith<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>;
  screenshot(opts: { path: string; fullPage?: boolean }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<unknown>;
  click(selector: string): Promise<unknown>;
}

export interface ResultadoE2E {
  sprint: string;
  aspecto: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVO';
  detalhe: string;
  screenshots: string[];
}

export default async function caseRecapCalendarioUnificar(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-RECAP-CALENDARIO-UNIFICAR';
  const aspecto = 'recap-calendario-unificar';
  const screenshots: string[] = [];
  const dir = 'docs/sprints/M-RECAP-CALENDARIO-UNIFICAR-screenshots-gauntlet';

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          estado: () => unknown;
        };
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

    // Aspecto 1: Menu lateral nao deve mais ter item "Calendario"
    // de top-level. Abre o menu, valida ausencia, fecha.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrirMenu: () => Promise<void> };
      };
      await w.__gauntlet?.abrirMenu();
    });
    await page.waitForTimeout(500);
    const menuSemCalendario = await page.evaluate(() => {
      // Item de menu top-level "Calendario" tinha a11y label
      // "item calendario" (sem acento, pre-L2). Procurar por essa
      // referencia exata.
      const nodes = document.querySelectorAll('[aria-label="item calendario"]');
      return nodes.length === 0;
    });
    const pngMenu = `${dir}/A-menu-lateral-sem-calendario.png`;
    await page.screenshot({ path: pngMenu });
    screenshots.push(pngMenu);

    if (!menuSemCalendario) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'item "Calendario" ainda presente no menu lateral apos L2 (esperado: removido)',
        screenshots,
      };
    }

    // Fecha o menu.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { fecharMenu: () => Promise<void> };
      };
      await w.__gauntlet?.fecharMenu();
    });
    await page.waitForTimeout(300);

    // Aspecto 2: navegacao para /recap.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(1000);

    // Cabecalho presente.
    const headerOk = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="cabecalho recap"]');
    });
    if (!headerOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'cabecalho recap ausente apos abrir /recap',
        screenshots,
      };
    }

    // Aspecto 3: toggle de modo presente.
    const toggleOk = await page.evaluate(() => {
      const lista = document.querySelector('[aria-label="modo lista"]');
      const cal = document.querySelector('[aria-label="modo calendario"]');
      return lista !== null && cal !== null;
    });
    if (!toggleOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'toggle de modo (Lista/Calendario) nao renderizou',
        screenshots,
      };
    }

    // Aspecto 4: default modo Lista — chips de periodo aparecem.
    const chipsLista = await page.evaluate(() => {
      const txt = document.body.textContent ?? '';
      return (
        txt.includes('Semana') &&
        txt.includes('Mês') &&
        txt.includes('Ano') &&
        txt.includes('Personalizado')
      );
    });
    const pngLista = `${dir}/A-recap-modo-lista.png`;
    await page.screenshot({ path: pngLista });
    screenshots.push(pngLista);
    if (!chipsLista) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'modo Lista (default) nao mostra chips de periodo',
        screenshots,
      };
    }

    // Aspecto 5: tap em "Calendario" — ChipGroup some, container
    // calendario aparece.
    const cliqueOk = await page.evaluate(() => {
      const btn = document.querySelector(
        '[aria-label="modo calendario"]'
      ) as HTMLElement | null;
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!cliqueOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao "modo calendario" nao clicavel',
        screenshots,
      };
    }
    await page.waitForTimeout(500);

    const calendarioOk = await page.evaluate(() => {
      const cont = document.querySelector(
        '[aria-label="recap modo calendario"]'
      );
      const txt = document.body.textContent ?? '';
      // ChipGroup some no modo Calendario; conteudo do calendario
      // aparece (mesmo que dots agregados estejam vazios).
      return cont !== null && !txt.includes('Personalizado');
    });
    const pngCal = `${dir}/A-recap-modo-calendario.png`;
    await page.screenshot({ path: pngCal });
    screenshots.push(pngCal);
    if (!calendarioOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos toggle, container modo calendario ausente ou ChipGroup ainda visivel',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'L2 OK: menu sem item Calendario, /recap com toggle Lista/Calendario, default Lista renderiza chips, toggle para Calendario remove chips e mostra container.',
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
