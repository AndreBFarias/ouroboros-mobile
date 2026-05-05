// E2E M-GAUNTLET-DEAD-CODE-V2: garante que o refactor de bootstrap
// preservou o smoke do Gauntlet em dev web. window.__gauntlet deve
// existir em /_dev/gauntlet com o conjunto canonico de 16 APIs JS,
// seed/reset funcionam normalmente, e estado() devolve snapshot
// coerente apos seed().
//
// O contraponto release Android (bytecode sem __gauntlet) e validado
// pelo script ./scripts/check_gauntlet_leak.sh, NAO por este E2E.
//
// Como executar: igual aos outros E2E (ver docs/templates/e2e-template.e2e.ts).
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

const APIS_ESPERADAS = [
  'seed',
  'reset',
  'setNomes',
  'setVaultRoot',
  'setOnboardingDone',
  'setUltimaRota',
  'abrir',
  'abrirMenu',
  'fecharMenu',
  'abrirSheet',
  'estado',
  'aguardarBoot',
  'tempoDeBoot',
  'consoleErros',
  'adicionarFotoMock',
  'seedComDados',
];

export default async function caseGauntletDeadCodeV2(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'm-gauntlet-dead-code-v2';
  const aspecto = 'gauntlet-vivo-em-dev-web';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    // 1. window.__gauntlet existe?
    const presente = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: unknown };
      return typeof w.__gauntlet === 'object' && w.__gauntlet !== null;
    });
    if (!presente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente apos refactor V2. Bootstrap lazy require nao executou.',
        screenshots,
      };
    }

    // 2. Todas as 16 APIs canonicas estao presentes?
    const faltantes = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: Record<string, unknown>;
      };
      const esperadas = [
        'seed',
        'reset',
        'setNomes',
        'setVaultRoot',
        'setOnboardingDone',
        'setUltimaRota',
        'abrir',
        'abrirMenu',
        'fecharMenu',
        'abrirSheet',
        'estado',
        'aguardarBoot',
        'tempoDeBoot',
        'consoleErros',
        'adicionarFotoMock',
        'seedComDados',
      ];
      return esperadas.filter((k) => typeof w.__gauntlet[k] !== 'function');
    });
    if (faltantes.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `APIs faltando em window.__gauntlet: ${faltantes.join(', ')}`,
        screenshots,
      };
    }

    // 3. seed() altera estado coerentemente
    const estadoAposSeed = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: {
          reset: () => void;
          seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
          estado: () => Record<string, unknown>;
        };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed({ nomeA: 'Alice', nomeB: 'Bob' });
      return w.__gauntlet.estado();
    });
    const nomes = estadoAposSeed.nomes as
      | { pessoa_a: string; pessoa_b: string }
      | undefined;
    if (
      !nomes ||
      nomes.pessoa_a !== 'Alice' ||
      nomes.pessoa_b !== 'Bob' ||
      estadoAposSeed.onboardingDone !== true
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `seed nao refletiu em estado(): ${JSON.stringify(estadoAposSeed)}`,
        screenshots,
      };
    }

    // 4. Captura screenshot do dashboard renderizado
    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-dashboard-vivo.png`;
    await page.screenshot({ path, fullPage: true });
    screenshots.push(path);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `window.__gauntlet com ${APIS_ESPERADAS.length} APIs operacional; seed alterou nomes para Alice/Bob.`,
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
