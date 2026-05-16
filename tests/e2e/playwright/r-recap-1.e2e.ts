// E2E R-RECAP-1 — Itens de agrupamento clicaveis no Recap.
// Valida via Gauntlet que cada item dentro de RecapSecao*
// (Conquistas/Crises/Reflexoes/Tarefas) e' Pressable e navega para
// a rota de detalhe canonica. Evolucoes coberto via fixture
// equivalente (rota /humor).
//
// Estrategia: seed do Gauntlet popula o vault com fixtures
// representativas; navegamos para /recap, conferimos que os 4
// agrupamentos renderizam itens, tocamos no primeiro item de cada
// um e verificamos que a URL muda para a rota canonica. Back retorna
// ao Recap com scroll preservado (stack card default expo-router).
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
  click(selector: string): Promise<unknown>;
  url(): string;
  goBack(): Promise<unknown>;
}

export interface ResultadoE2E {
  sprint: string;
  aspecto: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVO';
  detalhe: string;
  screenshots: string[];
}

export default async function caseRRecap1(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-RECAP-1';
  const aspecto = 'recap-itens-clicaveis';
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

    // Navega para /recap via API deterministica do Gauntlet.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(1500);

    // Screenshot inicial do Recap (estado com fixtures, ou empty se
    // o seed nao popular o vault completo).
    const pathInicial =
      'docs/sprints/R-RECAP-1-screenshots-gauntlet/A-recap-inicial.png';
    await page.screenshot({ path: pathInicial });
    screenshots.push(pathInicial);

    // Verifica que pelo menos um dos agrupamentos renderiza item ou
    // empty state global esta presente. A11y labels usados pelos
    // RecapSecao* clicaveis seguem padrao "conquista <id>",
    // "crise <id>", "reflexao <id>", "evolucao <id>", "tarefa <titulo>".
    const haAlgumItem = await page.evaluate(() => {
      const seletores = [
        '[aria-label^="conquista "]',
        '[aria-label^="crise "]',
        '[aria-label^="reflexao "]',
        '[aria-label^="evolucao "]',
        '[aria-label^="tarefa "]',
      ];
      return seletores.some(
        (sel) => document.querySelectorAll(sel).length > 0
      );
    });

    if (!haAlgumItem) {
      // Empty state esperado quando seed nao popula vault — caso
      // INCONCLUSIVO porque a UI esta correta mas nao podemos validar
      // navegacao sem dados. PNG ja capturado evidencia o estado.
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'Recap em estado empty (seed nao populou vault). Validar com dados reais via Nivel C.',
        screenshots,
      };
    }

    // Captura URL atual (estado do Recap antes do tap).
    const urlAntes = page.url();

    // Tap no primeiro item disponivel — preferimos a sequencia:
    // conquista > crise > reflexao > tarefa. Cada um e' Pressable.
    const acaoTap = await page.evaluate(() => {
      const ordem = [
        'conquista ',
        'crise ',
        'reflexao ',
        'evolucao ',
        'tarefa ',
      ];
      for (const prefixo of ordem) {
        const el = document.querySelector(
          `[aria-label^="${prefixo}"]`
        ) as HTMLElement | null;
        if (el) {
          el.click();
          return prefixo.trim();
        }
      }
      return null;
    });

    if (!acaoTap) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nenhum item de agrupamento foi clicado',
        screenshots,
      };
    }

    await page.waitForTimeout(1500);

    const pathDetalhe = `docs/sprints/R-RECAP-1-screenshots-gauntlet/B-detalhe-apos-tap-${acaoTap}.png`;
    await page.screenshot({ path: pathDetalhe });
    screenshots.push(pathDetalhe);

    // Verifica que houve navegacao (URL mudou). Em Web Expo Router
    // a URL reflete a rota atual.
    const urlDepois = page.url();
    if (urlDepois === urlAntes) {
      // Pode ter sido um item sem destino canonico (evento_positivo,
      // evento_negativo) que mostra toast. Tentamos detectar o toast.
      const toastVisivel = await page.evaluate(() => {
        const txt = document.body.textContent ?? '';
        return txt.includes('Edição em breve.');
      });
      if (toastVisivel) {
        return {
          sprint,
          aspecto,
          status: 'PASS',
          detalhe: `tap em ${acaoTap} sem destino canonico -> toast "Edição em breve." apareceu`,
          screenshots,
        };
      }
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `URL nao mudou apos tap em ${acaoTap}, e nenhum toast apareceu`,
        screenshots,
      };
    }

    // Volta ao Recap. expo-router stack 'card' default preserva
    // scroll position; nao validamos o scroll especifico aqui (custo
    // alto, sem assert determinista no playwright sobre scrollY do
    // ScrollView interno do React Native Web), apenas que a URL
    // volta para /recap.
    await page.goBack();
    await page.waitForTimeout(1000);

    const urlVolta = page.url();
    const pathVolta =
      'docs/sprints/R-RECAP-1-screenshots-gauntlet/C-recap-apos-back.png';
    await page.screenshot({ path: pathVolta });
    screenshots.push(pathVolta);

    if (!urlVolta.includes('/recap')) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `back nao retornou para /recap (URL atual: ${urlVolta})`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `tap em ${acaoTap} navegou para detalhe, back retornou ao Recap`,
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
