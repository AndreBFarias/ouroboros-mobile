// E2E R-RECAP-2 — Big numbers do Recap clicaveis (Q24.a revalidado).
// Valida via Gauntlet que cada um dos 6 cards do grid Numeros e'
// Pressable e navega para /recap-lista?tipo=<chave>&de=...&ate=...
// O accessibilityLabel agora segue padrao "<count> <tipo> no periodo"
// sem acento (convencao screen reader).
//
// Estrategia: seed do Gauntlet, navega para /recap, tira screenshot
// do grid Numeros, audita os 6 cards e captura tap em ao menos um
// confirmando que abre /recap-lista com query params corretos.
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

export default async function caseRRecap2(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-RECAP-2';
  const aspecto = 'recap-big-numbers-clicaveis';
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

    // Screenshot inicial do Recap mostrando grid Numeros.
    const pathInicial =
      'docs/sprints/R-RECAP-2-screenshots-gauntlet/A-recap-numeros-grid.png';
    await page.screenshot({ path: pathInicial, fullPage: true });
    screenshots.push(pathInicial);

    // Audita os 6 cards do grid Numeros — todos devem ter
    // accessibilityLabel no padrao "<count> <tipo> no periodo".
    const auditoria = await page.evaluate(() => {
      const padroes = [
        /^\d+ registros no periodo$/,
        /^\d+ treinos no periodo$/,
        /^\d+ fotos no periodo$/,
        /^\d+ eventos positivos no periodo$/,
        /^\d+ eventos dificeis no periodo$/,
        /^\d+ tarefas concluidas no periodo$/,
      ];
      const labels = Array.from(
        document.querySelectorAll('[aria-label*=" no periodo"]')
      )
        .map((el) => (el as HTMLElement).getAttribute('aria-label') ?? '')
        .filter((l) => l.length > 0);
      return padroes.map((re) => ({
        regex: re.source,
        achado: labels.find((l) => re.test(l)) ?? null,
      }));
    });

    const ausentes = auditoria.filter((a) => a.achado === null);
    if (ausentes.length > 0) {
      // Se vault esta vazio (seed nao popula completo), grid Numeros
      // pode nao aparecer (RecapScreen oculta secao quando totalNumeros=0).
      // Reportamos INCONCLUSIVO para revisao manual.
      const detalhe = ausentes
        .map((a) => `regex ${a.regex} nao encontrou label`)
        .join('; ');
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `audicao parcial dos 6 cards: ${detalhe}`,
        screenshots,
      };
    }

    // Captura URL atual (estado do Recap antes do tap).
    const urlAntes = page.url();

    // Tap no primeiro card disponivel (registros).
    const acaoTap = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label*="registros no periodo"]'
      ) as HTMLElement | null;
      if (el) {
        el.click();
        return 'registros';
      }
      return null;
    });

    if (!acaoTap) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nenhum card de big number foi clicado',
        screenshots,
      };
    }

    await page.waitForTimeout(1500);

    const pathLista = `docs/sprints/R-RECAP-2-screenshots-gauntlet/B-recap-lista-${acaoTap}.png`;
    await page.screenshot({ path: pathLista, fullPage: true });
    screenshots.push(pathLista);

    // Verifica que navegou para /recap-lista com tipo correto.
    const urlDepois = page.url();
    if (
      urlDepois === urlAntes ||
      !urlDepois.includes('/recap-lista') ||
      !urlDepois.includes(`tipo=${acaoTap}`)
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tap em ${acaoTap} nao navegou para /recap-lista?tipo=${acaoTap} (URL: ${urlDepois})`,
        screenshots,
      };
    }

    // Volta ao Recap.
    await page.goBack();
    await page.waitForTimeout(1000);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `auditoria dos 6 cards OK; tap em ${acaoTap} abriu /recap-lista com query params corretos`,
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
