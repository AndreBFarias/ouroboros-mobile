// AUDIT-P2-11: prova que os filtros de conquista religados no Recap
// mudam de fato o que aparece na tela.
//
// O assert e de COMPORTAMENTO, nao de presenca: conta os cards de
// conquista do modo Calendario, aplica um filtro de midia, e exige que
// a contagem caia; depois limpa e exige que ela volte. Um caso que so
// verificasse "o botao Filtros existe" passaria verde com a barra
// desconectada -- que era exatamente o estado anterior a esta sprint.
//
// Depende da fixture eventos-7 enriquecida nesta mesma sprint: antes
// dela as 7 conquistas do seed eram todas foto/intensidade 2/sem
// bairro, e nenhum filtro conseguia distinguir uma da outra.
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

export default async function caseAuditP211FiltrosbarRecap(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P2-11-FILTROSBAR-RECAP';
  const aspecto = 'filtros-religados-mudam-a-lista';
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

    // seed() so configura estado (nomes, vaultRoot, rota). Quem popula
    // dados e seedComDados(fixture) -- sem ele nao ha conquista alguma
    // e o caso morre em INCONCLUSIVO.
    const seedOk = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          seedComDados: (f: string) => Promise<void>;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      await w.__gauntlet.seedComDados('eventos-7');
      return true;
    });
    if (!seedOk) {
      return falha(
        'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?'
      );
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (r: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(1500);

    // Modo Calendario. O toggle de modo do RecapScreen expoe a11y
    // 'modo calendario'.
    const entrouNoCalendario = await page.evaluate(() => {
      const alvo = document.querySelector<HTMLElement>(
        '[aria-label="modo calendario"]'
      );
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!entrouNoCalendario) {
      return falha('toggle "modo calendario" nao encontrado no Recap.');
    }
    await page.waitForTimeout(1200);

    // Conta os cards de conquista visiveis. O ConquistaCard expoe
    // a11y comecando por "conquista".
    const contar = () =>
      page.evaluate(
        () => document.querySelectorAll('[aria-label^="conquista"]').length
      );

    const controle = await page.evaluate(
      () =>
        document.querySelector(
          '[aria-label^="abrir filtros de conquistas"]'
        ) !== null
    );
    if (!controle) {
      return falha(
        'controle "abrir filtros de conquistas" ausente: a barra nao foi religada.'
      );
    }

    // O filtro de mes NAO entra no Recap (decisao do dono).
    const temFiltroMes = await page.evaluate(() =>
      Array.from(document.querySelectorAll('*')).some(
        (n) => n.textContent?.trim() === 'Filtrar por mês'
      )
    );
    if (temFiltroMes) {
      return falha(
        'bloco "Filtrar por mês" renderizou dentro do Recap; deveria estar suprimido.'
      );
    }

    await page.screenshot({ path: `${dir}/01-controle-fechado.png` });
    screenshots.push(`${dir}/01-controle-fechado.png`);

    const antes = await contar();
    if (antes === 0) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'seed nao produziu conquistas no modo Calendario; sem base para medir o filtro. ' +
          'Causa conhecida em 2026-09-05: AUDIT-P2-12 -- o Recap nao enxerga o seed do ' +
          'Gauntlet, apesar dos 7 eventos estarem gravados no path canonico do vault mock.',
        screenshots,
      };
    }

    // Abre o sheet e aplica o filtro de midia "Spotify".
    await page.evaluate(() => {
      document
        .querySelector<HTMLElement>(
          '[aria-label^="abrir filtros de conquistas"]'
        )
        ?.click();
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/02-sheet-aberto.png` });
    screenshots.push(`${dir}/02-sheet-aberto.png`);

    const clicouChip = await page.evaluate(() => {
      const chip = document.querySelector<HTMLElement>(
        '[aria-label="chip Spotify"]'
      );
      if (!chip) return false;
      chip.click();
      return true;
    });
    if (!clicouChip) {
      return falha('chip "Spotify" nao encontrado no sheet de filtros.');
    }
    await page.waitForTimeout(1000);

    const depois = await contar();
    if (depois >= antes) {
      return falha(
        `filtro de midia nao mudou a lista: ${antes} conquistas antes, ${depois} depois. ` +
          'Os setters provavelmente nao estao ligados a barra.'
      );
    }

    await page.screenshot({ path: `${dir}/03-filtrado.png` });
    screenshots.push(`${dir}/03-filtrado.png`);

    // O indicador tem de acusar o filtro ativo.
    const indicador = await page.evaluate(
      () =>
        document.querySelector(
          '[aria-label^="abrir filtros de conquistas, "]'
        ) !== null
    );
    if (!indicador) {
      return falha(
        'com filtro aplicado, o controle nao anuncia a contagem de filtros ativos.'
      );
    }

    // Limpar devolve a lista ao estado anterior.
    const limpou = await page.evaluate(() => {
      const btn = document.querySelector<HTMLElement>(
        '[aria-label="limpar filtros de conquistas"]'
      );
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!limpou) {
      return falha(
        'botao "limpar filtros de conquistas" ausente com filtro ativo.'
      );
    }
    await page.waitForTimeout(1000);

    const restaurado = await contar();
    if (restaurado !== antes) {
      return falha(
        `limpar nao restaurou a lista: ${antes} antes, ${restaurado} depois de limpar.`
      );
    }

    await page.screenshot({ path: `${dir}/04-limpo.png` });
    screenshots.push(`${dir}/04-limpo.png`);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        `Barra religada no Recap: ${antes} conquistas, ${depois} apos filtrar por Spotify, ` +
        `${restaurado} apos limpar. Controle anuncia a contagem de filtros ativos e o ` +
        'bloco "Filtrar por mês" nao renderiza dentro do Recap.',
      screenshots,
    };
  } catch (err) {
    return falha(`excecao: ${String(err)}`);
  }
}
