// E2E sprint C4 — Tela Sobre / mini-changelog. Valida que a navegacao
// Settings -> Sobre monta a tela com versao "1.0.0", o mini-changelog
// renderiza pelo menos 3 entradas e a secao "O que mudou" esta presente.
//
// AUDIT-P2-9: a navegacao deixou de usar o bypass __gauntlet.abrir e
// passa pelo toque real em "Detalhes e creditos", no rodape de
// Configuracoes — era o bypass que escondia o achado de rota sem
// entrada de usuario.
//
// Como executar (automacao de browser):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Abrir http://localhost:8081/_dev/gauntlet
//   3. Executar este caso via automacao de browser.

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

    // Caminho de usuario: abrir Configuracoes e tocar no link do
    // rodape da secao Sobre. Sem bypass para a rota dedicada.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/settings');
    });
    await page.waitForTimeout(800);

    const linkClicado = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="abrir tela sobre"]'
      ) as HTMLElement | null;
      el?.click();
      return !!el;
    });
    if (!linkClicado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'link "abrir tela sobre" ausente no rodape de Configuracoes; rota sem entrada de usuario',
        screenshots,
      };
    }
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
        // AUDIT-P2-9: a tela dedicada passou a usar semTituloDeSecao
        // (o Header ja diz "Sobre"), entao o wrapper virou 'bloco sobre'.
        secaoSobrePresente: tem('bloco sobre'),
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
    // AUDIT-P2-9: o botao do GitHub e condicional (so renderiza com
    // expo.extra.repoUrl preenchido em app.json, que hoje nao existe).
    // Ausencia nao e falha: e informacao no detalhe do resultado.
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
      detalhe:
        `tela sobre OK por toque (sem bypass); mini-changelog com ` +
        `${checks.nVersoes} entradas; botao github ` +
        `${checks.botaoGitHub ? 'presente' : 'ausente (repoUrl vazio)'}`,
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
