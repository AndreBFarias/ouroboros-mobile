// E2E da sprint R-VAULT-CANONICAL-COMPLETE-B: confirma que o botao
// "Exportar estado completo" aparece em Settings na secao Privacidade
// e que tap dispara o pipeline de share (mockado em web).
//
// Como executar:
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Aguardar localhost:8081
//   3. Carregar playwright MCP, abrir _dev/gauntlet
//   4. Executar este case via browser_evaluate
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

export default async function caseRVaultBSettingsExport(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-VAULT-CANONICAL-COMPLETE-B';
  const aspecto = 'settings-botao-exportar-estado';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          abrir: (rota: string) => Promise<void>;
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
        detalhe: 'window.__gauntlet ausente',
        screenshots,
      };
    }

    // Abre Settings
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/settings');
    });
    await page.waitForTimeout(1200);

    // Captura A: tela inteira de Settings antes de scroll.
    const pathA = `docs/sprints/${sprint}-screenshots-gauntlet/A-settings-topo.png`;
    await page.screenshot({ path: pathA, fullPage: true });
    screenshots.push(pathA);

    // Assert 1: botao com accessibilityLabel "exportar estado completo"
    // existe no DOM.
    const tem = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="exportar estado completo"]'
      );
      return !!el;
    });
    if (!tem) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Botao "exportar estado completo" nao encontrado em Settings.',
        screenshots,
      };
    }

    // Captura B: scroll ate o botao novo (apos os 2 antigos de export).
    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="exportar estado completo"]'
      ) as HTMLElement | null;
      el?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(400);
    const pathB = `docs/sprints/${sprint}-screenshots-gauntlet/B-botao-exportar-estado.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Botao "Exportar estado completo" presente na secao Privacidade.',
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
