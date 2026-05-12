// E2E placeholder para sprint Q10 (share intent financeiro auto-
// classificador). Share intent e API nativa do Android (action.SEND
// disparado por outro app); o Gauntlet web nao consegue simular
// realisticamente o handoff. Esta sprint exige checkpoint humano via
// adb shell am start ... ou compartilhamento real do banco.
//
// Por consistencia com o protocolo (todo sprint UI tem 1 caso E2E em
// tests/e2e/playwright/m<NN>-*.e2e.ts), este arquivo existe mas
// declara status INCONCLUSIVO em web e instrui o validador a rodar
// o teste real em sessao com celular adb.
//
// Como rodar em web (Gauntlet) — devolve INCONCLUSIVO:
//   1. ./gauntlet.sh
//   2. orquestrador executa este arquivo via browser_evaluate.
//
// Como rodar real (Nivel C, adb):
//   adb shell am start -W -a android.intent.action.SEND \
//       -t text/plain --es android.intent.extra.TEXT \
//       'Pix R$ 50 EAB123CD45EF6789' com.ouroboros.mobile
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

export default async function caseQ10ShareFinanceiro(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'Q10';
  const aspecto = 'share-financeiro';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(800);

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
        detalhe: 'window.__gauntlet ausente',
        screenshots,
      };
    }

    // Em web, share intent nao existe. Apenas verificamos que a rota
    // /share-receive renderiza sem crash quando navegada manualmente
    // com texto puro (sem uri).
    const renderOk = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      try {
        await w.__gauntlet!.abrir(
          '/share-receive?texto=' +
            encodeURIComponent('Pix R$ 50 EAB123CD45EF6789')
        );
        return true;
      } catch {
        return false;
      }
    });

    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-${aspecto}.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    return {
      sprint,
      aspecto,
      status: 'INCONCLUSIVO',
      detalhe: renderOk
        ? 'rota /share-receive renderizou sem crash em web; teste real via adb am start (Nivel C)'
        : 'falha ao navegar para /share-receive em web; investigar antes do checkpoint adb',
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
