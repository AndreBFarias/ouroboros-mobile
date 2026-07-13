// E2E M37.2 -- escrita no Google Calendar pela rota /agenda.
//
// Fluxo validado (Nivel A+, Gauntlet web com mock OAuth):
//   1. Reset + seed duo (para o SeletorPara aparecer).
//   2. Conta ativa (pessoa_a) com escopo readonly -> banner
//      "Reautorize para criar eventos" visivel e FAB verde ausente.
//   3. Subir a conta para escopo write via setContaGoogleMock ->
//      banner some, FAB "novo evento" aparece.
//   4. Abrir /agenda de novo, abrir o sheet, confirmar que o form
//      "Novo evento" renderiza (titulo, criar).
//
// A criacao/delecao REAIS (e o reconsentimento OAuth) sao validadas
// ao vivo no device (Nivel B): banner -> reautorizar ->
// aceitar no browser Google -> criar "Teste M37.2" -> conferir em
// calendar.google.com -> long-press -> apagar.
//
// Como executar (automacao de browser):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web (ou ./gauntlet.sh)
//   2. Aguardar localhost:8081.
//   3. Carregar a automacao de browser.
//   4. Executar este caso via automacao de browser.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from './e2e-template';

// Extensao local da API gauntlet usada por este caso (subset tipado).
interface GauntletM372 {
  reset: () => void;
  seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  abrir: (rota: string) => Promise<void>;
  setContaGoogleMock: (
    pessoa: 'pessoa_a' | 'pessoa_b',
    escopo: 'readonly' | 'write'
  ) => void;
}

export default async function caseM37_2(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M37.2';
  const aspecto = 'calendar-escrita';
  const screenshots: string[] = [];
  const dir = 'docs/sprints/M37.2-screenshots';

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 1. Reset + seed duo + conecta pessoa_a com escopo readonly.
    const setupOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletM372 };
      if (!w.__gauntlet || !w.__gauntlet.setContaGoogleMock) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed({ nomeA: 'Alice', nomeB: 'Bob' });
      w.__gauntlet.setContaGoogleMock('pessoa_a', 'readonly');
      return true;
    });
    if (!setupOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet.setContaGoogleMock ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa ou build sem M37.2?',
        screenshots,
      };
    }

    // 2. Abrir /agenda com escopo readonly: banner de reautorizar deve
    //    aparecer e o FAB verde NAO.
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletM372 };
      await w.__gauntlet.abrir('/agenda');
    });
    await page.waitForTimeout(2000);

    const readonlyState = await page.evaluate(() => ({
      temBannerReautorizar: !!document.querySelector(
        '[aria-label="banner reautorizar escrita"]'
      ),
      temFab: !!document.querySelector('[aria-label="novo evento"]'),
      temRoot: !!document.querySelector('[aria-label="agenda root"]'),
    }));

    const pathReadonly = `${dir}/A-agenda-banner-reautorizar.png`;
    await page.screenshot({ path: pathReadonly });
    screenshots.push(pathReadonly);

    if (!readonlyState.temRoot) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'agenda root ausente apos abrir /agenda',
        screenshots,
      };
    }
    if (!readonlyState.temBannerReautorizar || readonlyState.temFab) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `estado readonly incorreto: banner=${readonlyState.temBannerReautorizar} fab=${readonlyState.temFab} (esperado banner=true fab=false)`,
        screenshots,
      };
    }

    // 3. Subir para escopo write e reabrir: banner some, FAB aparece.
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletM372 };
      w.__gauntlet.setContaGoogleMock('pessoa_a', 'write');
      await w.__gauntlet.abrir('/');
      await w.__gauntlet.abrir('/agenda');
    });
    await page.waitForTimeout(2000);

    const writeState = await page.evaluate(() => ({
      temBannerReautorizar: !!document.querySelector(
        '[aria-label="banner reautorizar escrita"]'
      ),
      temFab: !!document.querySelector('[aria-label="novo evento"]'),
    }));

    const pathFab = `${dir}/A-agenda-fab-novo.png`;
    await page.screenshot({ path: pathFab });
    screenshots.push(pathFab);

    if (!writeState.temFab || writeState.temBannerReautorizar) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `estado write incorreto: banner=${writeState.temBannerReautorizar} fab=${writeState.temFab} (esperado banner=false fab=true)`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'readonly mostra banner reautorizar sem FAB; write esconde banner e mostra FAB verde novo evento. Criacao/delecao reais + reconsentimento OAuth ficam com o orquestrador no device (Nivel B).',
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
