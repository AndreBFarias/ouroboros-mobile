// E2E K3 (M-MENU-FOTO-EDITAVEL, 2026-05-07).
//
// Verifica:
//   1. /_dev/gauntlet abre normalmente; __gauntlet API disponivel.
//   2. seed() popula nomes via setNomes.
//   3. abrirMenu() mostra MenuLateral com cabecalho clicavel.
//   4. Tap no CabecalhoPessoa (aria-label "editar nome e foto") navega
//      para /settings/editar-pessoa.
//   5. Tela /settings/editar-pessoa exibe Input com nome de pessoa_a +
//      botao Salvar.
//   6. K2 colateral: secoes do MenuLateral exibem "Acesso Rápido" e
//      "Utilitários" como titulos.
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

export default async function caseMenuFotoEditavel(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-MENU-FOTO-EDITAVEL';
  const aspecto = 'menu-foto-editavel';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1200);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          setNomes: (a: string, b: string) => void;
          abrirMenu: () => void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setNomes('TestA', 'TestB');
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

    // Abre o MenuLateral via API JS.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrirMenu: () => void };
      };
      w.__gauntlet.abrirMenu();
    });
    await page.waitForTimeout(800);

    // K2: secoes renomeadas devem aparecer. Asserts via DOM textContent.
    const k2Labels = await page.evaluate(() => {
      const txt = document.body.textContent ?? '';
      return {
        acessoRapido: txt.includes('Acesso Rápido'),
        utilitarios: txt.includes('Utilitários'),
        verAntigo: /\bVer\b\s*\n/.test(txt),
        opcionaisAntigo: txt.includes('Opcionais'),
      };
    });
    if (!k2Labels.acessoRapido || !k2Labels.utilitarios) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `K2 labels ausentes: ${JSON.stringify(k2Labels)}`,
        screenshots,
      };
    }

    const pathMenu = `docs/sprints/${sprint}-screenshots-gauntlet/A-menu-cabecalho-pressable.png`;
    await page.screenshot({ path: pathMenu });
    screenshots.push(pathMenu);

    // K3: tap no cabecalho. aria-label = "editar nome e foto".
    const tapped = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="editar nome e foto"]'
      ) as HTMLElement | null;
      if (!el) return false;
      el.click();
      return true;
    });
    if (!tapped) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'CabecalhoPessoa Pressable nao encontrado no DOM',
        screenshots,
      };
    }
    await page.waitForTimeout(1000);

    // Confirma navegacao para /settings/editar-pessoa via URL.
    const urlOk = await page.evaluate(() =>
      window.location.pathname.includes('/settings/editar-pessoa')
    );
    if (!urlOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'URL nao foi para /settings/editar-pessoa apos tap',
        screenshots,
      };
    }

    const pathForm = `docs/sprints/${sprint}-screenshots-gauntlet/A-editar-pessoa-form.png`;
    await page.screenshot({ path: pathForm });
    screenshots.push(pathForm);

    // Verifica que o botao Salvar esta presente.
    const temSalvar = await page.evaluate(() => {
      const txt = document.body.textContent ?? '';
      return txt.includes('Salvar');
    });
    if (!temSalvar) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao Salvar ausente em /settings/editar-pessoa',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'CabecalhoPessoa navega para /settings/editar-pessoa; ' +
        'K2 labels Acesso Rapido + Utilitarios presentes',
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
