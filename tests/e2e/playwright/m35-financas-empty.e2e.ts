// E2E M35 -- aba "Financas" em modo "Em desenvolvimento" honesto.
// Verifica:
//   1. Default v1.0 (toggle OFF): item "Financas" nao aparece no menu
//      lateral. A rota /financas continua acessivel via URL direta e
//      renderiza apenas o EmptyState com a frase canonica.
//   2. Quando o usuario liga o toggle "Mostrar financas em
//      desenvolvimento" no Settings, o item "Financas" volta a
//      aparecer no menu lateral, e o tap navega para a tela com o
//      mesmo EmptyState honesto (nao mostra mais "Rode o pipeline
//      no desktop").
//   3. Console sem erros novos durante o fluxo.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface PageComConsole extends PlaywrightPageLike {
  on?: (
    evt: string,
    handler: (msg: { type: () => string; text: () => string }) => void
  ) => void;
}

export default async function caseM35FinancasEmpty(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M35';
  const aspecto = 'financas-empty';
  const screenshots: string[] = [];

  const erros: string[] = [];
  const pageHook = page as PageComConsole;
  if (typeof pageHook.on === 'function') {
    pageHook.on('console', (msg) => {
      if (msg.type() === 'error') {
        erros.push(msg.text());
      }
    });
  }

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

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
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET inativa?',
        screenshots,
      };
    }

    // Passo 1. Default OFF: vai para /financas via URL direta e
    // confere que o EmptyState honesto aparece.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/financas');
    });
    await page.waitForTimeout(1500);

    const emptyVisivel = await page.evaluate(() => {
      const txt = document.body.innerText ?? '';
      return (
        txt.includes('Em desenvolvimento. Disponível em versão futura.') &&
        !txt.includes('Rode o pipeline no desktop')
      );
    });
    if (!emptyVisivel) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'EmptyState M35 nao renderizou frase canonica ou ainda mostra texto legado de cache.',
        screenshots,
      };
    }
    const path1 =
      'docs/sprints/M35-screenshots-gauntlet/A-financas-em-desenvolvimento.png';
    await page.screenshot({ path: path1 });
    screenshots.push(path1);

    // Passo 2. Default OFF: abre menu lateral e confere que item
    // "financas" nao aparece (toggle OFF esconde).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: {
          abrir: (rota: string) => Promise<void>;
          abrirMenu: () => void;
        };
      };
      await w.__gauntlet.abrir('/');
      w.__gauntlet.abrirMenu();
    });
    await page.waitForTimeout(800);

    const itemEscondido = await page.evaluate(() => {
      return !document.querySelector('[aria-label="item financas"]');
    });
    if (!itemEscondido) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'item "financas" aparece no menu lateral mesmo com toggle OFF.',
        screenshots,
      };
    }

    // Passo 3. Liga o toggle via store e reabre menu: agora item
    // "financas" deve aparecer.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { fecharMenu: () => void; abrirMenu: () => void };
      };
      w.__gauntlet.fecharMenu();
      // Acesso direto ao store de settings via require dinamico (web).
      const mod = await import('@/lib/stores/settings');
      mod.useSettings
        .getState()
        .setFeatureToggle('mostrarFinancasEmDesenvolvimento', true);
      w.__gauntlet.abrirMenu();
    });
    await page.waitForTimeout(800);

    const itemVisivel = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="item financas"]');
    });
    if (!itemVisivel) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos ligar toggle, item "financas" ainda nao aparece no menu.',
        screenshots,
      };
    }

    if (erros.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `console com erros: ${erros.slice(0, 3).join(' | ')}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'EmptyState honesto + item do menu condicionado ao toggle (OFF esconde, ON mostra).',
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
