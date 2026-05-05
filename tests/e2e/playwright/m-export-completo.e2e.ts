// E2E Sprint M-EXPORT-COMPLETO (A5): valida que a tela Settings
// expoe os botoes "Exportar todos os meus dados" e "Importar
// backup" com strings canonicas em PT-BR (sentence case + acento).
//
// Limitacao consciente: o Gauntlet web roda em vault mock (sem SAF
// real). Validacao FUNCIONAL do roundtrip ficou na suite Jest
// integration/export-restaure-roundtrip.test.ts. Este E2E foca em
// presenca/render dos botoes na UI Settings.
//
// Como executar (orquestrador via playwright MCP):
//   1. ./gauntlet.sh
//   2. Aguardar localhost:8081/_dev/gauntlet responder.
//   3. Carregar tools playwright via ToolSearch.
//   4. Executar a funcao default deste arquivo via browser_evaluate.
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

export default async function caseExportCompleto(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-EXPORT-COMPLETO';
  const aspecto = 'settings-botoes-export-import';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          abrir: (rota: string) => Promise<void> | void;
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
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // Abre Settings.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/settings');
    });
    await page.waitForTimeout(1200);

    // Assert: textos canonicos presentes.
    const presentes = await page.evaluate(() => {
      const corpo = document.body.innerText;
      return {
        exportar: corpo.includes('Exportar todos os meus dados'),
        importar: corpo.includes('Importar backup'),
        privacidade: corpo.includes('Privacidade'),
      };
    });

    if (!presentes.exportar || !presentes.importar) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `botoes ausentes: ${JSON.stringify(presentes)}`,
        screenshots,
      };
    }

    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-settings-export-import.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Settings renderiza "Exportar todos os meus dados" e "Importar backup" (sentence case + acentuacao PT-BR).',
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
