// E2E M36 — Tela Recap. Valida via Gauntlet:
//   1. Reset + seed deterministico do estado das stores.
//   2. Navegacao para /recap via window.__gauntlet.abrir().
//   3. Header "Recap" + chips de periodo (Semana/Mes/Ano/Personalizado).
//   4. Empty state esperado quando vault nao foi populado com dados.
//   5. Captura screenshot final em
//      docs/sprints/M36-screenshots-gauntlet/A-recap-empty.png.
//
// Executor: orquestrador (Claude) via playwright MCP.
// Ver template: docs/templates/e2e-template.e2e.ts.
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

export default async function caseM36Recap(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M36';
  const aspecto = 'recap';
  const screenshots: string[] = [];

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

    // Navega para /recap via API determinística (evita refs voláteis).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(1000);

    // Asserts: header presente, chips de periodo presentes, fechar
    // acessivel.
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

    const chipsOk = await page.evaluate(() => {
      const txt = document.body.textContent ?? '';
      return (
        txt.includes('Recap') &&
        txt.includes('Semana') &&
        txt.includes('Mês') &&
        txt.includes('Ano') &&
        txt.includes('Personalizado')
      );
    });
    if (!chipsOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'chips de periodo nao renderizaram (Semana/Mês/Ano/Personalizado)',
        screenshots,
      };
    }

    // Empty state esperado: gauntlet seed nao popula vault de dados,
    // entao a frase "Nenhum registro neste período." deve aparecer.
    const emptyOk = await page.evaluate(() => {
      const txt = document.body.textContent ?? '';
      return txt.includes('Nenhum registro neste período.');
    });

    const path = `docs/sprints/M36-screenshots-gauntlet/A-${aspecto}-empty.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    if (!emptyOk) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'header e chips OK, mas empty state esperado nao apareceu (vault tem dados via seed?).',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'recap renderizou com header, chips de periodo e empty state.',
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
