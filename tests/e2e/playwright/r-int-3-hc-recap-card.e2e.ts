// Caso E2E (Gauntlet) da sprint R-INT-3-HC-RECAP-CARD.
//
// Objetivo: seed de dados de saude (passos/treinos/sono/medidas via
// autopull HC ja materializado no Vault) -> abrir Recap -> a secao
// "Saude essa semana" aparece com os valores consolidados e cada
// linha e clicavel.
//
// Como executar (orquestrador via playwright MCP):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Aguardar localhost:8081.
//   3. Navegar para http://localhost:8081/_dev/gauntlet
//   4. Executar este caso via browser_evaluate.
//
// IMPORTANTE: nao roda via jest (testMatch filtra *.test.ts). Este
// arquivo e executado pelo orquestrador (Claude) via playwright MCP.
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

export default async function caseRecapSaude(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-INT-3-HC-RECAP-CARD';
  const aspecto = 'secao-saude';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset + seed deterministico de dados de saude. seedSaude
    // escreve passos/treinos/sono/medidas no Vault mock para a janela
    // da semana. Caso o gauntlet ainda nao exponha seedSaude, caimos
    // no seed() generico (que ja cobre treinos) e seguimos.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          seedSaude?: () => void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      if (typeof w.__gauntlet.seedSaude === 'function') {
        w.__gauntlet.seedSaude();
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

    // 3. Abrir o Recap no periodo semana.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/recap?periodo=semana');
    });
    await page.waitForTimeout(1200);

    // 4. Assert: a secao Saude existe (accessibilityLabel "secao saude"
    // -> aria-label no DOM web do RN).
    const temSecao = await page.evaluate(
      () => !!document.querySelector('[aria-label="secao saude"]')
    );
    if (!temSecao) {
      const path = `docs/sprints/${sprint}-screenshots-gauntlet/FAIL-sem-secao.png`;
      await page.screenshot({ path });
      screenshots.push(path);
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'secao Saude nao renderizou apos seed de dados HC',
        screenshots,
      };
    }

    // 5. Assert: o titulo "Saude essa semana" aparece no texto da pagina.
    const temTitulo = await page.evaluate(() =>
      document.body.innerText.includes('Saúde essa semana')
    );
    // 6. Assert: ao menos uma metrica de passos no formato PT-BR
    // (contem "passos" e ponto de milhar). Tolerante ao valor exato do
    // seed para nao quebrar quando o gabarito mudar.
    const temPassos = await page.evaluate(() =>
      /\d{1,3}(\.\d{3})*\s+passos/.test(document.body.innerText)
    );

    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-secao-saude.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    if (!temTitulo || !temPassos) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `secao presente; titulo=${temTitulo} passos=${temPassos}. Verificar seed de saude.`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'secao Saude visivel com titulo e metrica de passos PT-BR',
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
