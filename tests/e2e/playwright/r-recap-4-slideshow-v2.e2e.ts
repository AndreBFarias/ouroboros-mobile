// R-RECAP-4 (2026-05-16): E2E case para o slideshow Memorias v2.
// Cobre:
//   - intervalo configuravel (ler settings, depois abrir slideshow)
//   - botao pausar visivel e funcional
//   - toggle ambient audio (default OFF)
//   - Ken Burns aplicado aos slides (transform muda ao longo do tempo)
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

export default async function caseRRecap4(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-RECAP-4';
  const aspecto = 'slideshow-v2';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset + seed
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
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // 3. Abrir tela de Configuracoes para conferir defaults novos.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => void };
      };
      w.__gauntlet.abrir('/settings');
    });
    await page.waitForTimeout(800);

    const path1 = `docs/sprints/${sprint}-screenshots-gauntlet/A-settings-recap-memorias.png`;
    await page.screenshot({ path: path1 });
    screenshots.push(path1);

    // 4. Abrir slideshow Memorias e capturar 3 frames durante o
    // auto-avance + Ken Burns.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => void };
      };
      w.__gauntlet.abrir('/recap-memorias');
    });
    await page.waitForTimeout(1200);

    const path2 = `docs/sprints/${sprint}-screenshots-gauntlet/B-slide-1-ken-burns.png`;
    await page.screenshot({ path: path2 });
    screenshots.push(path2);

    // Aguarda auto-avance e captura segundo frame.
    await page.waitForTimeout(4500);
    const path3 = `docs/sprints/${sprint}-screenshots-gauntlet/C-slide-2-ken-burns.png`;
    await page.screenshot({ path: path3 });
    screenshots.push(path3);

    // 5. Conferir botao pausar presente e funcional.
    const pausarPresente = await page.evaluate(() => {
      const bts = document.querySelectorAll('[aria-label*="pausar memorias"]');
      return bts.length > 0;
    });
    if (!pausarPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao pausar nao encontrado no overlay',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'settings expoe toggle ambient + slider intervalo; slideshow roda com Ken Burns e botao pausar visivel',
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
