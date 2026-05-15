// E2E sprint C4 — Tela Sobre / mini-changelog. Valida que a navegacao
// Settings -> Sobre monta a tela com versao "1.0.0", o mini-changelog
// renderiza pelo menos 3 entradas e a secao "O que mudou" esta presente.
//
// Como executar (orquestrador via playwright MCP):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Abrir http://localhost:8081/_dev/gauntlet
//   3. Executar este caso via browser_evaluate.

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

export default async function caseSobreReleaseNotes(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SOBRE-RELEASE-NOTES';
  const aspecto = 'tela-sobre';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

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

    // Navegar direto para /settings/sobre via __gauntlet.abrir
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/settings/sobre');
    });
    await page.waitForTimeout(1200);

    const a11yPath =
      'docs/sprints/M-SOBRE-RELEASE-NOTES-screenshots-gauntlet/A-tela-sobre-completa.png';
    await page.screenshot({ path: a11yPath, fullPage: true });
    screenshots.push(a11yPath);

    const checks = await page.evaluate(() => {
      function tem(label: string): boolean {
        return !!document.querySelector(`[aria-label="${label}"]`);
      }
      function temTextoExato(t: string): boolean {
        const all = Array.from(document.querySelectorAll('*'));
        return all.some((el) => el.textContent?.trim() === t);
      }
      function contaVersoes(): number {
        return document.querySelectorAll('[aria-label^="versao "]').length;
      }
      return {
        secaoSobrePresente: tem('secao sobre'),
        secaoMudancasPresente: tem('secao o que mudou'),
        secaoCreditosPresente: tem('secao creditos'),
        versao100Presente: temTextoExato('1.0.0'),
        botaoGitHub: tem('abrir repositorio no github'),
        nVersoes: contaVersoes(),
      };
    });

    const falhas: string[] = [];
    if (!checks.secaoSobrePresente) falhas.push('secao sobre ausente');
    if (!checks.secaoMudancasPresente) falhas.push('secao o que mudou ausente');
    if (!checks.secaoCreditosPresente) falhas.push('secao creditos ausente');
    if (!checks.versao100Presente) falhas.push('versao 1.0.0 nao renderizada');
    if (!checks.botaoGitHub) falhas.push('botao github ausente');
    if (checks.nVersoes < 3) {
      falhas.push(
        `mini-changelog tem ${checks.nVersoes} entradas, esperado >=3`
      );
    }

    if (falhas.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: falhas.join('; '),
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `tela sobre OK; mini-changelog com ${checks.nVersoes} entradas`,
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
