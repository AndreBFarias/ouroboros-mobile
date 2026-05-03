// Template de caso E2E para validacao via Gauntlet (M-GAUNTLET).
//
// Como usar:
//   1. Copiar este arquivo para tests/e2e/playwright/m<NN>-<aspecto>.e2e.ts
//   2. Trocar o nome da funcao default (case_<sprint>_<aspecto>).
//   3. Implementar passos seguindo o template.
//
// Como executar (orquestrador via playwright MCP):
//   1. Subir expo: EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Aguardar localhost:8081 responder.
//   3. Carregar tools playwright via ToolSearch.
//   4. Navegar para http://localhost:8081/_dev/gauntlet
//   5. Executar a funcao deste arquivo via browser_evaluate({ function: ... })
//   6. Capturar screenshots conforme spec da sprint.
//
// IMPORTANTE: nao rodar via npm test -- jest.config testMatch
// filtra por *.test.ts/*.test.tsx. Estes arquivos sao executados
// pelo orquestrador (Claude) usando playwright MCP, nao por Jest.
//
// Comentarios sem acento.

// Tipo do contexto playwright minimo. Os tipos reais vem do
// pacote playwright-core; aqui declaramos so o que o E2E usa para
// nao depender de install pesado.
export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  screenshot(opts: { path: string; fullPage?: boolean }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<unknown>;
}

// Resultado padrao de cada caso. Orquestrador agrega num relatorio.
export interface ResultadoE2E {
  sprint: string;
  aspecto: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVO';
  detalhe: string;
  screenshots: string[];
}

// Template de caso. Substitua 'M??-template' pelo identificador real.
export default async function caseTemplate(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M??';
  const aspecto = 'template';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Aplicar seed deterministico
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: { seed: () => void; estado: () => unknown } };
      if (!w.__gauntlet) return false;
      w.__gauntlet.seed();
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // 3. Navegar para a tela alvo via __gauntlet.abrir(...)
    // await page.evaluate(async () => {
    //   await (globalThis as any).__gauntlet.abrir('/humor-rapido');
    // });

    // 4. Aguardar render
    await page.waitForTimeout(800);

    // 5. Asserts especificos da sprint via page.evaluate(() => ...)
    // Exemplo:
    // const tem = await page.evaluate(() =>
    //   !!document.querySelector('[aria-label="loader ouroboros"]')
    // );
    // if (!tem) return { sprint, aspecto, status: 'FAIL', ... };

    // 6. Capturar screenshots
    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-${aspecto}.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'todos os asserts passaram',
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
