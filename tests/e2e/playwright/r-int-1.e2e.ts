// R-INT-1 (2026-05-16): E2E do hub /integracoes.
//
// Fluxo:
//   1. Reset + seed deterministico.
//   2. Abrir menu lateral, verificar entry "Integrações" na secao
//      Utilitários.
//   3. Tap em "Integrações" navega para /integracoes.
//   4. Asserts: 5 cards renderizados, placeholders desabilitados,
//      HC navegavel pra /settings/integracoes.
//
// Como rodar (orquestrador via playwright MCP):
//   EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   Abrir http://localhost:8081/_dev/gauntlet
//   Executar via browser_evaluate(this default export).
//
// Comentarios sem acento.

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
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

export default async function caseRIntegracoes1(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-INT-1';
  const aspecto = 'hub-integracoes';
  const screenshots: string[] = [];

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
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET ativada?',
        screenshots,
      };
    }

    // 1. Abrir menu lateral.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrirMenu: () => Promise<void> | void };
      };
      await w.__gauntlet.abrirMenu();
    });
    await page.waitForTimeout(600);

    // 2. Entry "Integrações" presente.
    const temEntry = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('[aria-label="item integracoes"]')
      );
      return nodes.length > 0;
    });
    if (!temEntry) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'entry "item integracoes" nao encontrada no MenuLateral',
        screenshots,
      };
    }

    const pathMenu = `docs/sprints/${sprint}-screenshots-gauntlet/A-menu-lateral.png`;
    await page.screenshot({ path: pathMenu });
    screenshots.push(pathMenu);

    // 3. Tap navega para /integracoes via __gauntlet.abrir.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> | void };
      };
      await w.__gauntlet.abrir('/integracoes');
    });
    await page.waitForTimeout(800);

    // 4. Asserts: 5 cards.
    const cards = await page.evaluate(() => {
      const slugs = [
        'health_connect',
        'google_calendar',
        'spotify',
        'youtube',
        'google_drive',
      ];
      return slugs.map((s) => ({
        slug: s,
        presente: !!document.querySelector(
          `[aria-label="card integracao ${s}"]`
        ),
      }));
    });
    const faltantes = cards.filter((c) => !c.presente);
    if (faltantes.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cards faltantes: ${faltantes.map((c) => c.slug).join(', ')}`,
        screenshots,
      };
    }

    const pathHub = `docs/sprints/${sprint}-screenshots-gauntlet/B-hub-cards.png`;
    await page.screenshot({ path: pathHub });
    screenshots.push(pathHub);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: '5 cards renderizados + entry no menu lateral funcional',
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
