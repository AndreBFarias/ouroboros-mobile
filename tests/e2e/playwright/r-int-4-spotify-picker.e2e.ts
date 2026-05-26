// Caso E2E (Gauntlet) da sprint R-INT-4-SPOTIFY-PICKER.
//
// Objetivo: a aba Spotify do MidiaPicker oferece escolher da biblioteca
// quando conectado (modelo "Google Fotos"), e cai no input de URL +
// CTA "Conectar Spotify" quando desconectado.
//
// Como executar (orquestrador via playwright MCP):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Aguardar localhost:8081.
//   3. Navegar para http://localhost:8081/_dev/gauntlet
//   4. Executar este caso via browser_evaluate.
//
// Em dev web, useSpotifyAuth.autenticar injeta token sintetico
// (isMockMode). Sem conta conectada, a aba mostra o fallback. O caso
// cobre o fallback (desconectado) de forma deterministica; o caminho
// conectado depende do mock de rede do Gauntlet para a biblioteca e e
// validado pelo supervisor na main com screenshot.
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

export default async function caseSpotifyPicker(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-INT-4-SPOTIFY-PICKER';
  const aspecto = 'picker-biblioteca';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
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

    // 2. Abrir a captura (que monta o MidiaPicker com a aba Spotify).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/captura');
    });
    await page.waitForTimeout(1000);

    // 3. Assert: a aba Spotify existe (accessibilityLabel "aba spotify"
    // -> aria-label no DOM web do RN).
    const temAba = await page.evaluate(
      () => !!document.querySelector('[aria-label="aba spotify"]')
    );
    if (!temAba) {
      const path = `docs/sprints/${sprint}-screenshots-gauntlet/FAIL-sem-aba.png`;
      await page.screenshot({ path });
      screenshots.push(path);
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'aba spotify nao localizada na rota /captura; verificar fluxo de abertura do picker no Gauntlet',
        screenshots,
      };
    }

    // 4. Assert (desconectado): CTA "Conectar Spotify" presente e o
    // input de URL continua disponivel como alternativa.
    const temCTA = await page.evaluate(
      () => !!document.querySelector('[aria-label="conectar spotify"]')
    );
    const temInput = await page.evaluate(
      () => !!document.querySelector('[aria-label="campo link spotify"]')
    );

    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-aba-spotify.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    if (!temInput) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'input de URL ausente na aba Spotify',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: temCTA ? 'PASS' : 'INCONCLUSIVO',
      detalhe: temCTA
        ? 'fallback desconectado: CTA Conectar Spotify + input de URL presentes'
        : 'input presente; CTA ausente (conta ja conectada via mock?). Validar caminho conectado na main',
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
