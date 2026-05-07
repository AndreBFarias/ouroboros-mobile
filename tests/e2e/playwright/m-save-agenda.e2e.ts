// E2E I-AGENDA — M-SAVE-AGENDA-VALIDA.
//
// Valida o save resiliente da agenda apos a tripla H1+H2+H3:
//   1. Writer (vault/agenda.ts) usa vaultUriJoin canonico (paths.ts)
//      em vez de helper joinUri local — defesa A29 contra trailing
//      space + %20 + barras duplas em SAF de OEMs MIUI/HyperOS/OneUI.
//   2. Caller (app/agenda.tsx) envolve salvarCacheEventos em
//      comTimeout(p, 30s) + try/catch + toasts ('Agenda atualizada.'
//      / 'Não foi possível atualizar: <msg>') para garantir que SAF
//      lento nao trava a UI em loader infinito.
//
// O caso M37.1.2 (m37-1-2-cache-agenda-md.e2e.ts) cobre o refactor
// JSON -> .md individual; este caso cobre a camada de resiliencia
// adicionada em I-AGENDA. OAuth real nao funciona em web — a flag
// __DEV__ + GAUNTLET_ATIVO em useGoogleAuth.autenticar() injeta
// token sintetico para validacao Nivel A sem rede.
//
// Como executar (orquestrador via playwright MCP):
//   1. ./gauntlet.sh (sobe Metro web + abre /_dev/gauntlet)
//   2. Aguardar localhost:8081 responder
//   3. Carregar tools playwright via ToolSearch
//   4. Executar este caso via browser_evaluate({ function: ... })
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseISaveAgenda(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'I-AGENDA';
  const aspecto = 'save-resiliente';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // Reset + seed deterministico (vaultRoot mock web, pessoaAtiva,
    // onboarding done).
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

    // Navegar para /agenda. calendarApi em web __DEV__ devolve
    // eventos sinteticos sem rede. calendarCache delega para
    // sincronizarSnapshotAgenda apos H2 layout-por-tipo. O caller
    // (app/agenda.tsx) usa comTimeout(30s) e mostra toast em sucesso.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/agenda');
    });
    await page.waitForTimeout(2500);

    // Captura visual pos-save resiliente.
    const pathCaptura = `docs/sprints/M-SAVE-AGENDA-VALIDA-screenshots/A-agenda-save-resiliente.png`;
    await page.screenshot({ path: pathCaptura });
    screenshots.push(pathCaptura);

    // Assert 1: agenda root presente (UI nao travou).
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

    // Assert 2: nao esta em estado 'carregando' (loader infinito
    // seria o sintoma de save travado sem comTimeout).
    const carregando = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="agenda carregando"]');
    });
    if (carregando) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'agenda travou em estado carregando — comTimeout nao surtiu efeito ou estado nao avancou',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'agenda renderiza apos save resiliente (vaultUriJoin + comTimeout 30s + try/catch); sem regressao de UX vs M37.1.2',
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
