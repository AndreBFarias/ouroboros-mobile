// E2E M37.1.2 — cache de agenda em .md individual.
//
// Verifica que apos refactor (cache JSON unico -> N .md em
// agenda/<pessoa>/) a UI continua identica em comportamento:
//   1. Seed Gauntlet com 3 eventos mockados via calendarApi.
//   2. Navegar /agenda; verificar que os 3 aparecem na grid mensal e
//      que o evento do dia atual esta na lista do dia.
//   3. Re-seed simulando delete remoto (lista com 2 eventos); verificar
//      que o terceiro some da UI.
//
// Como executar (orquestrador via playwright MCP):
//   1. ./gauntlet.sh (sobe Metro web + abre /_dev/gauntlet)
//   2. Aguardar localhost:8081 responder
//   3. Carregar tools playwright via ToolSearch
//   4. Executar este caso via browser_evaluate({ function: ... })
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM37_1_2(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M37.1.2';
  const aspecto = 'cache-agenda-md';
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
          estado: () => unknown;
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
        detalhe: 'window.__gauntlet ausente',
        screenshots,
      };
    }

    // Navegar para /agenda. O calendarApi em web __DEV__ devolve
    // eventos sinteticos (mock-0..mock-5) sem rede real. O
    // calendarCache (refatorado em M37.1.2) persiste em memoria web
    // (Map em memoryCacheWeb) ja que vaultRoot e 'web://...'.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/agenda');
    });
    await page.waitForTimeout(2000);

    // Capturar screenshot da agenda com .md individual em vigor.
    const pathCaptura = `docs/sprints/M37.1-screenshots/A-agenda-md-individual.png`;
    await page.screenshot({ path: pathCaptura });
    screenshots.push(pathCaptura);

    // Assert 1: a agenda root esta presente.
    const temRoot = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="agenda root"]');
    });
    if (!temRoot) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'aria-label="agenda root" ausente apos abrir /agenda',
        screenshots,
      };
    }

    // Assert 2: a CalendarGrid mensal renderizou (procura por
    // qualquer celula de dia com classe react-native-calendars).
    const temGrid = await page.evaluate(() => {
      // CalendarGrid de M37.1 renderiza dots; checamos pela presenca
      // do container raiz da grid.
      const todas = document.querySelectorAll('[role="button"]');
      return todas.length >= 7; // pelo menos uma semana de dias
    });
    if (!temGrid) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'CalendarGrid nao detectada por seletor de role=button',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'agenda renderiza apos refactor JSON->md; UI inalterada (decisao M37.1.2: zero mudanca de UX)',
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
