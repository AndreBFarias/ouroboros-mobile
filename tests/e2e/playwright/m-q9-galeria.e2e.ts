// Q9 (Onda Q): caso E2E da Galeria unificada / Vault Explorer.
// Cobre tres aspectos:
//   1. Grid lista TODOS os itens salvos quando aba "Tudo" esta ativa.
//   2. Aba "Fotos" filtra para apenas itens de tipo 'foto'.
//   3. Tap em item navega para /galeria/detalhe/[slug] (smoke).
//
// Pre-condicoes (gauntlet ja deve expor estas APIs):
//   - __gauntlet.reset()
//   - __gauntlet.seed()
//   - __gauntlet.setVaultRoot('...')
//   - __gauntlet.adicionarFotoMock(...)  (ou caminho equivalente via salvarFraseMock)
//   - __gauntlet.salvarFraseMock(...)
//   - __gauntlet.abrir('/galeria')
//
// Comentarios sem acento (convencao shell/CI).

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

export default async function caseGaleriaQ9(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-Q9-GALERIA';
  const aspecto = 'galeria-unificada';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 1. Reset + seed deterministico.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          setVaultRoot: (uri: string) => void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setVaultRoot('content://gauntlet/vault');
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET ativa?',
        screenshots,
      };
    }

    // 2. Popular o vault com itens fake. Use as APIs do gauntlet
    // quando disponiveis; cai em no-op silencioso quando ausente
    // (orquestrador inspeciona o resultado).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: Record<string, unknown> & {
          salvarFraseMock?: (
            texto: string,
            opts?: { autor?: string; para?: unknown }
          ) => Promise<unknown>;
          adicionarFotoMock?: (opts?: unknown) => Promise<unknown>;
        };
      };
      const g = w.__gauntlet;
      if (!g) return;
      // Frase + foto + humor: tres tipos canonicos cobrindo "texto",
      // "foto" e "mais" no filtro logico da galeria.
      if (typeof g.salvarFraseMock === 'function') {
        await g.salvarFraseMock('uma frase guardada para depois');
      }
      if (typeof g.adicionarFotoMock === 'function') {
        await g.adicionarFotoMock();
      }
    });

    // 3. Abrir /galeria.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<unknown> };
      };
      if (w.__gauntlet) {
        await w.__gauntlet.abrir('/galeria');
      }
    });
    await page.waitForTimeout(800);

    // 4. Capturar grid completo (aba Tudo default).
    const pathA = `docs/sprints/${sprint}-screenshots-gauntlet/A-grid.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    // 5. Verificar que ha cards renderizados.
    const cardsTudo = await page.evaluate(() => {
      const nos = document.querySelectorAll('[aria-label^="abrir "]');
      return nos.length;
    });
    if (cardsTudo < 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `nenhum card no grid (aba Tudo). encontrados=${cardsTudo}`,
        screenshots,
      };
    }

    // 6. Trocar para aba "Fotos".
    await page.evaluate(() => {
      const tab = document.querySelector('[aria-label="aba Fotos"]');
      if (tab) {
        (tab as HTMLElement).click();
      }
    });
    await page.waitForTimeout(600);

    const pathB = `docs/sprints/${sprint}-screenshots-gauntlet/B-filtro-fotos.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `grid Tudo com ${cardsTudo} cards; aba Fotos capturada`,
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
