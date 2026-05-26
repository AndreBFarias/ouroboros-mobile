// Caso E2E R-INT-5-DRIVE-HUB-ATIVO (2026-05-25): valida que o card
// Google Drive no hub /integracoes deixou de ser placeholder "Em breve"
// e passou a refletir estado real (conectado/desconectado) + acoes
// inline "Fazer agora" / "Restaurar".
//
// Como executar (orquestrador via playwright MCP):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Aguardar localhost:8081.
//   3. Navegar /_dev/gauntlet, executar este case via browser_evaluate.
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

export default async function caseDriveHubAtivo(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-INT-5-DRIVE-HUB-ATIVO';
  const aspecto = 'card-drive-ativo';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset + seed deterministico antes de qualquer assert.
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

    // 3. Abrir o hub de integracoes.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> | void };
      };
      await w.__gauntlet.abrir('/integracoes');
    });
    await page.waitForTimeout(900);

    // 4. O card Drive existe e NAO esta mais como "Em breve".
    const driveExiste = await page.evaluate(() =>
      !!document.querySelector('[aria-label="card integracao google_drive"]')
    );
    if (!driveExiste) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'card google_drive ausente no hub',
        screenshots,
      };
    }
    const aindaEmBreve = await page.evaluate(
      () =>
        !!document.querySelector('[aria-label="estado google_drive em_breve"]')
    );
    if (aindaEmBreve) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'card Drive ainda em estado em_breve (placeholder nao removido)',
        screenshots,
      };
    }

    // 5. Estado deve ser conectado OU desconectado (real), nunca em_breve.
    const estadoReal = await page.evaluate(() => {
      const conectado = !!document.querySelector(
        '[aria-label="estado google_drive conectado"]'
      );
      const desconectado = !!document.querySelector(
        '[aria-label="estado google_drive desconectado"]'
      );
      return { conectado, desconectado };
    });
    if (!estadoReal.conectado && !estadoReal.desconectado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'card Drive sem estado real (nem conectado nem desconectado)',
        screenshots,
      };
    }

    // 6. Quando conectado, as acoes "Fazer agora" / "Restaurar" aparecem.
    //    O seed do gauntlet pode nao conectar Google; nesse caso o card
    //    fica desconectado (CTA conectar) sem acoes — comportamento valido
    //    da spec (R-SEC-1 dormente). Registramos qual caminho ocorreu.
    let detalheAcoes = 'estado desconectado: CTA conectar (sem acoes), valido';
    if (estadoReal.conectado) {
      const temAcoes = await page.evaluate(() => {
        const fazer = !!document.querySelector(
          '[aria-label="acao google_drive fazer_agora"]'
        );
        const restaurar = !!document.querySelector(
          '[aria-label="acao google_drive restaurar"]'
        );
        return fazer && restaurar;
      });
      if (!temAcoes) {
        return {
          sprint,
          aspecto,
          status: 'FAIL',
          detalhe: 'card Drive conectado sem as acoes Fazer agora/Restaurar',
          screenshots,
        };
      }
      detalheAcoes = 'estado conectado: acoes Fazer agora + Restaurar presentes';
    }

    // 7. Screenshot do card.
    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-card-drive.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `card Drive ativo (sem em_breve). ${detalheAcoes}`,
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
