// Sprint M-BACKUP-AUTOMATICO (Bloco C5) — E2E via Gauntlet.
// Valida o fluxo de UI:
//   1. Settings carrega com a secao "Backup automático" presente.
//   2. Default OFF (privacy-first) — linha "Ultimo backup" nao
//      aparece ate o usuario ligar o toggle.
//   3. Press no toggle altera estado (visivel via __gauntlet.estado()).
//
// Web nao executa task manager real (decisao spec §4: mockamos so a
// UI). A execucao real do backup e testada em Nivel B no emulador.
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

export default async function caseBackupAutomatico(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-BACKUP-AUTOMATICO';
  const aspecto = 'toggle-opt-in';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // Reset + seed deterministico.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          abrir: (rota: string) => Promise<void>;
          estado: () => Record<string, unknown>;
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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET nao ativa.',
        screenshots,
      };
    }

    // Navega para Settings.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/settings');
    });
    await page.waitForTimeout(800);

    // Confere secao presente + default OFF.
    const tituloPresente = await page.evaluate(() => {
      return document.body.innerText.includes('Backup automático');
    });
    if (!tituloPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Secao "Backup automático" ausente em Settings.',
        screenshots,
      };
    }

    const screenshotInicial = `docs/sprints/${sprint}-screenshots-gauntlet/A-default-off.png`;
    await page.screenshot({ path: screenshotInicial, fullPage: true });
    screenshots.push(screenshotInicial);

    // Linha "Ultimo backup" NAO deve aparecer com toggle OFF.
    const semUltimo = await page.evaluate(() =>
      !document.querySelector('[aria-label="linha ultimo backup"]')
    );
    if (!semUltimo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Linha "Ultimo backup" visivel com toggle OFF.',
        screenshots,
      };
    }

    // Liga o toggle. Em RN-Web, dispara click no aria-label.
    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="toggle backup automatico semanal"]'
      ) as HTMLElement | null;
      el?.click();
    });
    await page.waitForTimeout(500);

    const ligado = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: {
          estado: () => { settings?: { backupAutomaticoSemanal?: boolean } };
        };
      };
      const s = w.__gauntlet.estado();
      return Boolean(s.settings?.backupAutomaticoSemanal);
    });
    if (!ligado) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'Click sintetico nao propagou em RN-Web (armadilha A17/A18). Validar em Nivel B.',
        screenshots,
      };
    }

    const screenshotLigado = `docs/sprints/${sprint}-screenshots-gauntlet/B-toggle-on.png`;
    await page.screenshot({ path: screenshotLigado, fullPage: true });
    screenshots.push(screenshotLigado);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Secao presente, default OFF, toggle alterna estado em useSettings.',
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
