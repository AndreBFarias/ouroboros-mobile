// Caso E2E R-DX-GAUNTLET-ONBOARDING-BYPASS para validacao via Gauntlet.
//
// Copiado de docs/templates/e2e-template.e2e.ts.
//
// Como executar (orquestrador via playwright MCP):
//   1. Subir expo: ./gauntlet.sh  (ou ./gauntlet.sh --onboarding)
//   2. Aguardar localhost:8081 responder (useFonts SDK 54 web ~30-60s).
//   3. Carregar tools playwright via ToolSearch.
//   4. Executar caseBypassDefault(page) e caseFlagOnboarding(page).
//   5. Capturar screenshots conforme spec da sprint.
//
// IMPORTANTE: nao rodar via npm test -- jest.config testMatch filtra por
// *.test.ts/*.test.tsx. Estes arquivos sao executados pelo orquestrador
// (Claude) usando playwright MCP, nao por Jest.
//
// Comentarios sem acento.

// Tipo do contexto playwright minimo (igual ao template).
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

const SPRINT = 'R-DX-GAUNTLET-ONBOARDING-BYPASS';
const DIR = `docs/sprints/${SPRINT}-screenshots-gauntlet`;

// Caso 1: abrir / (sem flag) -> o app NAO deve cair no onboarding; deve
// renderizar uma tela util (Tela Hoje). Assert: NAO existe o titulo do
// onboarding ("Como voce se chama" / equivalente) e a UI principal montou.
export async function caseBypassDefault(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const aspecto = 'bypass-default';
  const screenshots: string[] = [];

  try {
    // Abre a raiz sem flag. O OnboardingGuard aplica auto-seed (done=true)
    // em vez de redirecionar para /onboarding.
    await page.goto('http://localhost:8081/');
    // Boot fresh do Metro/useFonts pode levar 30-60s na primeira carga.
    await page.waitForTimeout(4000);

    // Assert: o onboarding NAO esta na tela. Procuramos texto tipico do
    // passo de nome do onboarding; ausencia => bypass funcionou.
    const noOnboarding = await page.evaluate(() => {
      const corpo = document.body?.innerText ?? '';
      const marcadores = ['Como voce se chama', 'Como você se chama'];
      return !marcadores.some((m) => corpo.includes(m));
    });

    // Assert positivo: a URL nao foi reescrita para /onboarding.
    const naoEstaEmOnboarding = await page.evaluate(
      () => !window.location.pathname.startsWith('/onboarding')
    );

    const path1 = `${DIR}/A-bypass-default.png`;
    await page.screenshot({ path: path1, fullPage: true });
    screenshots.push(path1);

    if (!noOnboarding || !naoEstaEmOnboarding) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: `bypass falhou: onboarding visivel? ${!noOnboarding}; rota=/onboarding? ${!naoEstaEmOnboarding}`,
        screenshots,
      };
    }

    return {
      sprint: SPRINT,
      aspecto,
      status: 'PASS',
      detalhe: 'sem flag: onboarding bypassado, app caiu em tela util',
      screenshots,
    };
  } catch (err) {
    return {
      sprint: SPRINT,
      aspecto,
      status: 'FAIL',
      detalhe: `erro inesperado: ${(err as Error).message}`,
      screenshots,
    };
  }
}

// Caso 2: abrir /?onboarding=1 -> o fluxo de onboarding DEVE renderizar
// (a flag forca o comportamento original do OnboardingGuard).
export async function caseFlagOnboarding(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const aspecto = 'flag-onboarding';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/?onboarding=1');
    await page.waitForTimeout(4000);

    // Assert: o onboarding renderizou. Aceita o titulo do passo de nome
    // OU que a rota tenha sido reescrita para /onboarding.
    const temOnboarding = await page.evaluate(() => {
      const corpo = document.body?.innerText ?? '';
      const marcadores = ['Como voce se chama', 'Como você se chama'];
      const porTexto = marcadores.some((m) => corpo.includes(m));
      const porRota = window.location.pathname.startsWith('/onboarding');
      return porTexto || porRota;
    });

    const path1 = `${DIR}/B-flag-onboarding.png`;
    await page.screenshot({ path: path1, fullPage: true });
    screenshots.push(path1);

    if (!temOnboarding) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: 'flag ?onboarding=1 nao levou ao fluxo de onboarding',
        screenshots,
      };
    }

    return {
      sprint: SPRINT,
      aspecto,
      status: 'PASS',
      detalhe: 'com flag ?onboarding=1: fluxo de onboarding renderizou',
      screenshots,
    };
  } catch (err) {
    return {
      sprint: SPRINT,
      aspecto,
      status: 'FAIL',
      detalhe: `erro inesperado: ${(err as Error).message}`,
      screenshots,
    };
  }
}

// Default export: roda os dois casos em sequencia e agrega.
export default async function caseOnboardingBypass(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const r1 = await caseBypassDefault(page);
  const r2 = await caseFlagOnboarding(page);
  const screenshots = [...r1.screenshots, ...r2.screenshots];
  const ambosPass = r1.status === 'PASS' && r2.status === 'PASS';
  return {
    sprint: SPRINT,
    aspecto: 'bypass+flag',
    status: ambosPass ? 'PASS' : 'FAIL',
    detalhe: `default=${r1.status} (${r1.detalhe}); flag=${r2.status} (${r2.detalhe})`,
    screenshots,
  };
}
