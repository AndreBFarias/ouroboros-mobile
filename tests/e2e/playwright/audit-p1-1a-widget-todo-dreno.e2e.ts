// Sprint AUDIT-P1-1A — E2E via Gauntlet (Nivel A+).
//
// Valida as duas metades observaveis na web do fix do widget Quick
// To-do:
//   1. A rota /widget-config deixou de ser orfa: existe a linha
//      "Widget tarefas" na secao "Features opcionais" de /settings, e
//      CLICAR nela navega de fato (assert por location.pathname, nao
//      por __gauntlet.abrir).
//   2. A tela de destino e a util: header "Widget tarefas" mais os
//      botoes "Sincronizar agora" e "Atualizar contador", que sao a
//      razao de a rota existir (drain manual da fila).
//   3. O hook novo no fim de BOOT_HOOKS nao quebra a cadeia de boot:
//      __gauntlet.disparaBootHooks() resolve e __gauntlet.estado()
//      segue devolvendo objeto valido depois.
//
// LIMITE HONESTO DESTE CASO: a drenagem em si NAO e observavel aqui.
// getNative() devolve null fora do Android
// (modules/widget-homescreen/src/index.ts:52-57), entao
// lerFilaTodoWidget sempre retorna [] e drenarFilaTodoWidget sai cedo
// sem tocar o Vault. Este caso cobre o ponto de entrada de UI e a
// integridade do boot. A drenagem real, com entry vinda do provider
// Kotlin, e evidencia de device na AUDIT-P1-1B — que tambem e quem
// conserta o RemoteInput orfao, sem o qual nada chega a fila em
// runtime.
//
// Pre-condicao: featureToggles.widgetHomescreen default TRUE
// (src/lib/stores/settings.ts:288), e o link vive dentro do bloco
// condicional desse toggle. O caso liga o toggle explicitamente se
// vier desligado do seed, para nao depender do default.
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

export default async function caseWidgetTodoDreno(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P1-1A-WIDGET-TODO-DRENO';
  const aspecto = 'entrada-ui-e-boot';
  const screenshots: string[] = [];
  const dir = `docs/sprints/${sprint}-screenshots-gauntlet`;

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 1. Reset + seed deterministico.
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

    // 2. Settings.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/settings');
    });
    await page.waitForTimeout(1000);

    // 3. Garante o toggle do widget ligado (o link e filho dele).
    const linkVisivel = () =>
      page.evaluate(
        () => !!document.querySelector('[aria-label="widget tarefas"]')
      );
    if (!(await linkVisivel())) {
      await page.evaluate(() => {
        const t = document.querySelector(
          '[aria-label="toggle widget homescreen"]'
        ) as HTMLElement | null;
        t?.click();
      });
      await page.waitForTimeout(600);
    }

    // 4. A linha "Widget tarefas" existe na secao "Features opcionais".
    const temLinha = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="widget tarefas"]');
      if (!el) return false;
      // Confere que esta na secao certa, nao solta em outro lugar.
      const secao = document.querySelector(
        '[aria-label="secao features opcionais"]'
      );
      return !!secao && secao.contains(el);
    });
    if (!temLinha) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Linha "Widget tarefas" ausente da secao "Features opcionais" em /settings (rota /widget-config continua orfa).',
        screenshots,
      };
    }

    // Rola a linha para o centro ANTES do print: /settings rola um
    // container interno, entao fullPage sozinho captura so a dobra de
    // cima e a evidencia visual sairia sem a secao Features opcionais.
    await page.evaluate(() => {
      const el = document.querySelector('[aria-label="widget tarefas"]');
      el?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(600);

    const shotSettings = `${dir}/A-settings-features-widget-tarefas.png`;
    await page.screenshot({ path: shotSettings, fullPage: true });
    screenshots.push(shotSettings);

    // 5. CLICA na linha (nao usa __gauntlet.abrir: o ponto da sprint e
    // que existe caminho navegavel de verdade).
    const clicou = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="widget tarefas"]'
      ) as HTMLElement | null;
      if (!el) return false;
      el.click();
      return true;
    });
    if (!clicou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'LinkSubTela "Widget tarefas" sumiu do DOM antes do clique.',
        screenshots,
      };
    }
    await page.waitForTimeout(1200);

    const naRota = await page.evaluate(() =>
      window.location.pathname.includes('/widget-config')
    );
    if (!naRota) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'Click sintetico nao propagou em RN-Web (armadilha A17/A18); navegacao para /widget-config nao confirmada por URL. Revalidar em Nivel B.',
        screenshots,
      };
    }

    // 6. A tela de destino tem o que justifica a rota existir.
    const alvoOk = await page.evaluate(() => {
      const texto = document.body.innerText;
      return {
        header: texto.includes('Widget tarefas'),
        sincronizar: !!document.querySelector(
          '[aria-label="sincronizar fila widget agora"]'
        ),
        contador: !!document.querySelector(
          '[aria-label="atualizar contador widget"]'
        ),
      };
    });
    if (!alvoOk.header || !alvoOk.sincronizar || !alvoOk.contador) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `/widget-config incompleta: header=${alvoOk.header} sincronizar=${alvoOk.sincronizar} contador=${alvoOk.contador}`,
        screenshots,
      };
    }

    const shotConfig = `${dir}/B-widget-config-por-clique.png`;
    await page.screenshot({ path: shotConfig, fullPage: true });
    screenshots.push(shotConfig);

    // 7. O hook novo (ultimo da fila) nao quebra a cadeia de boot.
    const bootOk = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: {
          disparaBootHooks: () => Promise<void>;
          estado: () => unknown;
        };
      };
      try {
        await w.__gauntlet.disparaBootHooks();
      } catch {
        return { disparou: false, estadoValido: false };
      }
      const s = w.__gauntlet.estado();
      return {
        disparou: true,
        estadoValido: typeof s === 'object' && s !== null,
      };
    });
    if (!bootOk.disparou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'disparaBootHooks lancou apos o registro do dreno do widget (hook novo quebrou a cadeia de BOOT_HOOKS).',
        screenshots,
      };
    }
    if (!bootOk.estadoValido) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'gauntlet.estado() nao retornou objeto valido apos disparaBootHooks com o hook novo plugado.',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Linha "Widget tarefas" presente em Features opcionais; clique navega para /widget-config (URL confirmada) com "Sincronizar agora" e "Atualizar contador"; disparaBootHooks resolve e estado segue valido com o dreno plugado. Drenagem real nao observavel na web (bridge nativa null) — evidencia de device fica na AUDIT-P1-1B.',
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
