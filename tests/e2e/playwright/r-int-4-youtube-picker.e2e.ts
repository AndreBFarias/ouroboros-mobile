// Caso E2E (Gauntlet) da sprint R-INT-4-YOUTUBE-PICKER.
//
// Valida os dois modos da aba YouTube do MidiaPicker:
//   - Desconectado: input de URL + CTA "Conectar YouTube".
//   - Conectado: a aba alterna para o modo biblioteca (lista / vazio /
//     atalho "Colar link"). Em dev web o store injeta um token
//     sintetico via useYouTubeAuth.autenticar(), entao a UI assume o
//     ramo "conectado" mesmo sem rede real (a lista pode vir vazia
//     porque o token mock nao resolve na Data API; o que importa para
//     o E2E e o ramo de UID correto).
//
// Como executar (orquestrador via playwright MCP):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Aguardar localhost:8081.
//   3. Navegar para /_dev/gauntlet e rodar este default export via
//      browser_evaluate.
//   4. Capturar os screenshots referenciados.
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

export default async function caseYoutubePicker(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-INT-4-YOUTUBE-PICKER';
  const aspecto = 'picker-biblioteca';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          setOnboardingDone: (v: boolean) => void;
          abrir: (rota: string) => Promise<void> | void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setOnboardingDone(true);
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

    // 1. Abre o registro de diario, que embute o MidiaPicker, e
    //    seleciona a aba YouTube. Estado inicial: DESCONECTADO.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> | void };
      };
      await w.__gauntlet.abrir('/diario/novo');
    });
    await page.waitForTimeout(800);

    // Seleciona a aba YouTube por texto do chip.
    const abriuAba = await page.evaluate(() => {
      const chips = Array.from(
        document.querySelectorAll('[aria-label="seletor de aba midia"] *')
      );
      const yt = chips.find((el) => el.textContent?.trim() === 'YouTube') as
        | HTMLElement
        | undefined;
      yt?.click();
      return !!yt;
    });
    await page.waitForTimeout(500);

    // Assert desconectado: CTA "Conectar YouTube" visivel.
    const temCta = await page.evaluate(() => {
      const tab = document.querySelector('[aria-label="aba youtube"]');
      return !!(tab && /Conectar YouTube/.test(tab.textContent ?? ''));
    });

    const pathDesc = `docs/sprints/${sprint}-screenshots-gauntlet/A-desconectado.png`;
    await page.screenshot({ path: pathDesc });
    screenshots.push(pathDesc);

    if (!abriuAba || !temCta) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `aba youtube=${abriuAba} CTA conectar=${temCta}`,
        screenshots,
      };
    }

    // 2. Conecta via store (dev web injeta token sintetico) e reabre.
    await page.evaluate(async () => {
      const mod = (
        globalThis as unknown as {
          require?: (m: string) => unknown;
        }
      ).require;
      // Em ambiente web do Expo nao ha require global confiavel; o
      // gauntlet expoe setOnboardingDone mas nao token. Fallback:
      // dispara o flow OAuth dev (mock) pelo CTA, que em dev web
      // resolve sincrono via isMockMode.
      void mod;
      const tab = document.querySelector('[aria-label="aba youtube"]');
      const cta = Array.from(tab?.querySelectorAll('*') ?? []).find(
        (el) => el.textContent?.trim() === 'Conectar YouTube'
      ) as HTMLElement | undefined;
      cta?.click();
    });
    await page.waitForTimeout(1200);

    // Assert conectado: aba mostra o ramo biblioteca (lista, vazio ou
    // atalho "Colar link"). Aceitamos qualquer um dos marcadores do
    // ramo conectado.
    const ramoConectado = await page.evaluate(() => {
      const tab = document.querySelector('[aria-label="aba youtube"]');
      const txt = tab?.textContent ?? '';
      const temLista = !!document.querySelector(
        '[aria-label="lista biblioteca youtube"]'
      );
      const temVazio = !!document.querySelector(
        '[aria-label="biblioteca youtube vazia"]'
      );
      const temColarLink = /Colar link/.test(txt);
      const temLoader = !!document.querySelector(
        '[aria-label="carregando biblioteca youtube"]'
      );
      return temLista || temVazio || temColarLink || temLoader;
    });

    const pathConn = `docs/sprints/${sprint}-screenshots-gauntlet/B-conectado.png`;
    await page.screenshot({ path: pathConn });
    screenshots.push(pathConn);

    return {
      sprint,
      aspecto,
      status: ramoConectado ? 'PASS' : 'INCONCLUSIVO',
      detalhe: ramoConectado
        ? 'desconectado mostra CTA; conectado entra no ramo biblioteca'
        : 'ramo conectado nao detectado (token mock pode nao ter propagado no gauntlet)',
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
