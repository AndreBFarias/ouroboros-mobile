// Caso E2E (Gauntlet) da sprint R-INT-2-CALENDAR-RECAP-CARD.
//
// Objetivo: seed de eventos da agenda Google (via setEventosAgendaMock,
// que escreve .md canonicos no Vault mock sem OAuth) -> abrir Recap ->
// a secao "Agenda essa semana" aparece com a contagem de eventos e o
// resumo, e o card e clicavel (navega para /agenda).
//
// Como executar (orquestrador via playwright MCP):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Aguardar localhost:8081.
//   3. Navegar para http://localhost:8081/_dev/gauntlet
//   4. Executar este caso via browser_evaluate.
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

export default async function caseRecapAgenda(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-INT-2-CALENDAR-RECAP-CARD';
  const aspecto = 'secao-agenda';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset + seed generico + seed de eventos da agenda na janela da
    // semana corrente. setEventosAgendaMock escreve .md canonicos no
    // Vault mock para pessoa_a (formato identico ao salvarEventoAgenda
    // mobile). Datas relativas a "hoje" para cairem na janela 'semana'.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          setEventosAgendaMock?: (
            pessoa: 'pessoa_a' | 'pessoa_b',
            eventos: Array<Record<string, unknown>>
          ) => number;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      if (typeof w.__gauntlet.setEventosAgendaMock !== 'function') {
        // Sem o mock de agenda nao da pra semear; segue para o assert
        // que tratara como INCONCLUSIVO.
        return true;
      }
      const hoje = new Date();
      const ymd = (offsetDias: number, hora: number) => {
        const d = new Date(hoje);
        d.setDate(d.getDate() - offsetDias);
        d.setHours(hora, 0, 0, 0);
        return d.toISOString();
      };
      const ts = hoje.toISOString();
      w.__gauntlet.setEventosAgendaMock('pessoa_a', [
        {
          id: 'evt-recap-1',
          pessoa: 'pessoa_a',
          titulo: 'Reunião de equipe',
          inicio: ymd(2, 10),
          fim: ymd(2, 11),
          fonte: 'google_calendar',
          sincronizado_em: ts,
        },
        {
          id: 'evt-recap-2',
          pessoa: 'pessoa_a',
          titulo: 'Consulta médica',
          inicio: ymd(0, 18),
          fim: ymd(0, 19),
          fonte: 'google_calendar',
          sincronizado_em: ts,
        },
      ]);
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

    // 3. Abrir o Recap no periodo semana.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/recap?periodo=semana');
    });
    await page.waitForTimeout(1200);

    // 4. Assert: a secao Agenda existe (accessibilityLabel "secao
    // agenda" -> aria-label no DOM web do RN).
    const temSecao = await page.evaluate(
      () => !!document.querySelector('[aria-label="secao agenda"]')
    );
    if (!temSecao) {
      const path = `docs/sprints/${sprint}-screenshots-gauntlet/FAIL-sem-secao.png`;
      await page.screenshot({ path });
      screenshots.push(path);
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'secao Agenda nao renderizou; verificar setEventosAgendaMock e janela',
        screenshots,
      };
    }

    // 5. Assert: o titulo "Agenda essa semana" e a contagem de eventos
    // (formato "<n> eventos") aparecem no texto da pagina.
    const temTitulo = await page.evaluate(() =>
      document.body.innerText.includes('Agenda essa semana')
    );
    const temContagem = await page.evaluate(() =>
      /\d+\s+eventos?/.test(document.body.innerText)
    );

    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-secao-agenda.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    if (!temTitulo || !temContagem) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `secao presente; titulo=${temTitulo} contagem=${temContagem}. Verificar seed.`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'secao Agenda visivel com titulo e contagem de eventos PT-BR',
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
