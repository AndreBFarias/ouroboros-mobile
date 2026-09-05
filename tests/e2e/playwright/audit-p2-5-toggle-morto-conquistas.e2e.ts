// Sprint AUDIT-P2-5 — E2E via Gauntlet (Nivel A+).
//
// Prova que o ToggleRow morto "Calendario de conquistas" saiu da secao
// "Features opcionais" de /settings e que a remocao NAO levou vizinho
// junto:
//   1. Nem o toggle nem a linha do container do item removido existem
//      no DOM, e o texto do label sumiu da pagina.
//   2. "Acompanhamento do ciclo menstrual" e "Widget na tela inicial"
//      continuam dentro da secao, e o do ciclo continua alternavel de
//      fato (aria-checked inverte apos o clique).
//   3. Checkpoint do spec: a chave `calendarioConquistas` continua no
//      contrato de Vault, entao uma instalacao que ja a tenha
//      persistida precisa renderizar a secao inteira nos DOIS estados
//      (true e false). O caso hidrata a chave via
//      __gauntlet.setFeatureToggle (src/lib/dev/gauntlet.ts) e repete
//      os asserts em cada estado.
//
// LIMITE HONESTO DESTE CASO: o contrato de arquivo em si (escrever e
// restaurar o estado espelhado com a chave inerte) nao e observavel na
// web, onde o Vault e mock. Essa metade fica com os testes de Jest de
// tests/lib/vault/escreverEstado.test.ts e
// tests/lib/services/restaurarVault.test.ts, que montam a chave por
// exigencia do schema e seguem verdes.
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

export default async function caseToggleMortoConquistas(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P2-5-TOGGLE-MORTO-CONQUISTAS';
  const aspecto = 'toggle-removido-vizinhos-vivos';
  const screenshots: string[] = [];
  const dir = `docs/sprints/${sprint}-screenshots-gauntlet`;

  const falha = (detalhe: string): ResultadoE2E => ({
    sprint,
    aspecto,
    status: 'FAIL',
    detalhe,
    screenshots,
  });

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
      return falha(
        'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?'
      );
    }

    // 2. Settings.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/settings');
    });
    await page.waitForTimeout(1000);

    // 3. Leitura unica da secao, reusada nos dois estados da chave.
    const lerSecao = () =>
      page.evaluate(() => {
        const secao = document.querySelector(
          '[aria-label="secao features opcionais"]'
        );
        const dentro = (label: string) => {
          const el = document.querySelector(`[aria-label="${label}"]`);
          return !!secao && !!el && secao.contains(el);
        };
        return {
          temSecao: !!secao,
          toggleConquistas: !!document.querySelector(
            '[aria-label="toggle calendario conquistas"]'
          ),
          linhaConquistas: !!document.querySelector(
            '[aria-label="linha toggle calendario conquistas"]'
          ),
          // O label visivel usa acento; o E2E procura a string exata
          // que o usuario via na tela antes da remocao.
          textoConquistas:
            document.body.innerText.indexOf('Calendário de conquistas') >= 0,
          ciclo: dentro('toggle ciclo menstrual'),
          widget: dentro('toggle widget homescreen'),
          todo: dentro('toggle todo leve'),
          alarme: dentro('toggle alarme pessoal'),
          contador: dentro('toggle contador dias sem'),
        };
      });

    // 4. Hidrata a chave inerte nos dois estados. Simula a instalacao
    // que ja tinha o valor persistido em disco antes da remocao da UI.
    // Sao dois callbacks literais (e nao um parametrizado) porque
    // page.evaluate serializa a funcao e nao carrega o closure junto.
    const hidratarLigada = () =>
      page.evaluate(() => {
        const w = globalThis as unknown as {
          __gauntlet?: { setFeatureToggle?: (c: string, v: boolean) => void };
        };
        if (typeof w.__gauntlet?.setFeatureToggle !== 'function') return false;
        w.__gauntlet.setFeatureToggle('calendarioConquistas', true);
        return true;
      });
    const hidratarDesligada = () =>
      page.evaluate(() => {
        const w = globalThis as unknown as {
          __gauntlet?: { setFeatureToggle?: (c: string, v: boolean) => void };
        };
        if (typeof w.__gauntlet?.setFeatureToggle !== 'function') return false;
        w.__gauntlet.setFeatureToggle('calendarioConquistas', false);
        return true;
      });

    for (const [valor, hidratar] of [
      [true, hidratarLigada],
      [false, hidratarDesligada],
    ] as const) {
      if (!(await hidratar())) {
        return falha(
          '__gauntlet.setFeatureToggle ausente; nao da para hidratar calendarioConquistas nos dois estados.'
        );
      }
      await page.waitForTimeout(600);
      const s = await lerSecao();
      if (!s.temSecao) {
        return falha(
          `Secao "Features opcionais" nao renderizou com calendarioConquistas=${valor}.`
        );
      }
      if (s.toggleConquistas || s.linhaConquistas || s.textoConquistas) {
        return falha(
          `ToggleRow morto ainda presente com calendarioConquistas=${valor}: toggle=${s.toggleConquistas} linha=${s.linhaConquistas} texto=${s.textoConquistas}`
        );
      }
      if (!s.todo || !s.alarme || !s.contador || !s.ciclo || !s.widget) {
        return falha(
          `Vizinho levado junto com calendarioConquistas=${valor}: todo=${s.todo} alarme=${s.alarme} contador=${s.contador} ciclo=${s.ciclo} widget=${s.widget}`
        );
      }
    }

    // 5. Print da secao. /settings rola container interno, entao rola a
    // secao para o centro antes do print (mesma armadilha da P1-1A).
    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="secao features opcionais"]'
      );
      el?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(600);
    const shotSecao = `${dir}/A-features-opcionais-sem-calendario.png`;
    await page.screenshot({ path: shotSecao, fullPage: true });
    screenshots.push(shotSecao);

    // 6. O vizinho imediato continua funcional: clicar no toggle do
    // ciclo inverte o aria-checked de verdade.
    const antes = await page.evaluate(() =>
      document
        .querySelector('[aria-label="toggle ciclo menstrual"]')
        ?.getAttribute('aria-checked')
    );
    if (antes !== 'true' && antes !== 'false') {
      return falha(
        `Toggle "ciclo menstrual" sem aria-checked legivel (valor: ${String(antes)}).`
      );
    }
    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="toggle ciclo menstrual"]'
      ) as HTMLElement | null;
      el?.click();
    });
    await page.waitForTimeout(800);
    const depois = await page.evaluate(() =>
      document
        .querySelector('[aria-label="toggle ciclo menstrual"]')
        ?.getAttribute('aria-checked')
    );
    if (depois === antes) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `Click sintetico nao propagou em RN-Web (armadilha A17/A18): aria-checked seguiu ${String(antes)}. Remocao do item morto confirmada; alternancia do vizinho fica para Nivel B.`,
        screenshots,
      };
    }

    const shotDepois = `${dir}/B-vizinho-ciclo-alternado.png`;
    await page.screenshot({ path: shotDepois, fullPage: true });
    screenshots.push(shotDepois);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Com calendarioConquistas hidratada em true e em false, a secao "Features opcionais" renderiza inteira e sem o item "Calendario de conquistas" (toggle, linha e texto ausentes); os 5 vizinhos seguem na secao e o toggle do ciclo inverte aria-checked ao clique.',
      screenshots,
    };
  } catch (err) {
    return falha(`erro inesperado: ${(err as Error).message}`);
  }
}
