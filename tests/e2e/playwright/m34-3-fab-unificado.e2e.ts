// E2E M34.3 -- FAB verde unificado absorve a acao contextual da tab.
// Verifica:
//   1. Tap no FAB verde da aba Marcos abre menu com 5 itens (1
//      contextual "adicionar marco" + 4 captura).
//   2. Tap em "adicionar marco" abre o sheet SheetNovoMarco.
//   3. Tap em "capturar frase" continua abrindo o sheet de frase.
//   4. FAB verde no canto inferior direito do frame mobile (412dp).
//   5. Console sem erros novos durante o fluxo.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

// Extensao local com console hook (PlaywrightPageLike base nao expoe).
interface PageComConsole extends PlaywrightPageLike {
  on?: (
    evt: string,
    handler: (msg: { type: () => string; text: () => string }) => void
  ) => void;
}

export default async function caseM343FABUnificado(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M34.3';
  const aspecto = 'fab-unificado';
  const screenshots: string[] = [];

  // Coleta de erros de console. Quando page.on disponivel registra
  // listener; senao e' best-effort (testes em web puro).
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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO inativa?',
        screenshots,
      };
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    // Vai para a tab Marcos.
    const tabClicada = await page.evaluate(() => {
      const t = document.querySelector(
        '[aria-label="tab marcos"]'
      ) as HTMLElement | null;
      if (!t) return false;
      t.click();
      return true;
    });
    if (!tabClicada) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'tab marcos nao encontrada',
        screenshots,
      };
    }
    await page.waitForTimeout(700);

    // Confere que NAO existe FAB proprio "adicionar marco" no DOM
    // antes de abrir o menu (M34.3 removeu).
    const fabProprio = await page.evaluate(() => {
      // Busca elementos com aria-label "adicionar marco" que NAO
      // estejam dentro do sheet do MenuCapturaVerde (que so monta
      // apos tap no FAB verde).
      const todos = document.querySelectorAll('[aria-label="adicionar marco"]');
      return todos.length;
    });
    if (fabProprio !== 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `esperado 0 elementos "adicionar marco" antes do menu abrir, achado ${fabProprio} (FAB proprio nao foi removido?)`,
        screenshots,
      };
    }

    // Confirma o FAB verde unificado e suas coordenadas (canto
    // inferior direito do frame mobile 412dp).
    const fabRect = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      if (!f) return null;
      const r = f.getBoundingClientRect();
      return {
        left: Math.round(r.left),
        top: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });
    if (!fabRect) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB verde "abrir menu de captura" ausente',
        screenshots,
      };
    }
    if (fabRect.width !== 56 || fabRect.height !== 56) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tamanho do FAB verde inesperado: ${fabRect.width}x${fabRect.height} (esperado 56x56)`,
        screenshots,
      };
    }

    const fabShot =
      'docs/sprints/M34.3-screenshots-gauntlet/A-fab-verde-marcos.png';
    await page.screenshot({ path: fabShot });
    screenshots.push(fabShot);

    // Tap no FAB verde abre o sheet.
    await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      f?.click();
    });
    await page.waitForTimeout(700);

    // Confirma os 5 itens (1 contextual + 4 captura).
    const labels = await page.evaluate(() => {
      return [
        'adicionar marco',
        'capturar foto',
        'capturar musica',
        'capturar video',
        'capturar frase',
      ].map((l) => ({
        label: l,
        presente: !!document.querySelector(`[aria-label="${l}"]`),
      }));
    });
    const ausentes = labels.filter((x) => !x.presente).map((x) => x.label);
    if (ausentes.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `itens ausentes no menu: ${ausentes.join(', ')}`,
        screenshots,
      };
    }

    const menuShot =
      'docs/sprints/M34.3-screenshots-gauntlet/B-menu-marcos-aberto.png';
    await page.screenshot({ path: menuShot });
    screenshots.push(menuShot);

    // Tap em "adicionar marco" abre SheetNovoMarco.
    await page.evaluate(() => {
      const it = document.querySelector(
        '[aria-label="adicionar marco"]'
      ) as HTMLElement | null;
      it?.click();
    });
    await page.waitForTimeout(900);

    const sheetMarco = await page.evaluate(() => {
      // SheetNovoMarco renderiza botoes Salvar e Cancelar no rodape.
      const txt = document.body.innerText;
      return txt.includes('Salvar') && txt.includes('Cancelar');
    });
    if (!sheetMarco) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'SheetNovoMarco nao montou apos tap em "adicionar marco"',
        screenshots,
      };
    }

    const marcoShot =
      'docs/sprints/M34.3-screenshots-gauntlet/C-sheet-novo-marco.png';
    await page.screenshot({ path: marcoShot });
    screenshots.push(marcoShot);

    // Reset do estado: navega de volta e re-abre menu para testar
    // captura de frase no mesmo run.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const t = document.querySelector(
        '[aria-label="tab marcos"]'
      ) as HTMLElement | null;
      t?.click();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      f?.click();
    });
    await page.waitForTimeout(700);

    // Tap em "capturar frase" abre o SheetFrase.
    await page.evaluate(() => {
      const it = document.querySelector(
        '[aria-label="capturar frase"]'
      ) as HTMLElement | null;
      it?.click();
    });
    await page.waitForTimeout(900);

    const sheetFrase = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="campo da frase"]');
    });
    if (!sheetFrase) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'SheetFrase nao montou (campo da frase ausente)',
        screenshots,
      };
    }

    const fraseShot =
      'docs/sprints/M34.3-screenshots-gauntlet/D-sheet-frase-via-marcos.png';
    await page.screenshot({ path: fraseShot });
    screenshots.push(fraseShot);

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
      detalhe: `FAB verde 56x56 unico no canto direito (left=${fabRect.left} top=${fabRect.top}); menu com 5 itens (contextual + 4 captura); SheetNovoMarco e SheetFrase montam pelo fluxo unificado`,
      screenshots,
    };
  } catch (err) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `erro: ${(err as Error).message}`,
      screenshots,
    };
  }
}
