// E2E M34.1 -- BottomSheet acima do FABMenu (z-index 30 vs 10).
// Verifica:
//   1. Navega ate a tab Memorias e abre SheetFrase pelo FAB verde.
//   2. Localiza o botao "Cancelar" do rodape do sheet.
//   3. Localiza o FABMenu roxo (overlay global, z=10).
//   4. Compara z-index computado: sheet >= 30, FABMenu <= 10.
//   5. Compara bounding rects: o ponto central do botao Cancelar nao
//      pode estar coberto pelo FABMenu (elementFromPoint deve devolver
//      o botao, nao o FAB).
//   6. Console sem erros novos durante o fluxo.
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

interface RetanguloRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centroX: number;
  centroY: number;
}

export default async function caseM341SheetAcimaFab(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M34.1';
  const aspecto = 'sheet-acima-fab';
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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO inativa?',
        screenshots,
      };
    }

    // Vai para a tab Memorias.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    // Confere que FABMenu (overlay global roxo, esquerda inferior)
    // esta presente antes de abrir o sheet.
    const fabMenuPre = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu lateral"]'
      ) as HTMLElement | null;
      return !!f;
    });
    if (!fabMenuPre) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FABMenu (abrir menu lateral) ausente antes de abrir sheet',
        screenshots,
      };
    }

    // Tap no FAB verde (canto direito) para abrir MenuCapturaVerde.
    const fabVerdeOk = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      if (!f) return false;
      f.click();
      return true;
    });
    if (!fabVerdeOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB verde "abrir menu de captura" ausente',
        screenshots,
      };
    }
    await page.waitForTimeout(700);

    // Tap em "capturar frase" abre o SheetFrase.
    const fraseOk = await page.evaluate(() => {
      const it = document.querySelector(
        '[aria-label="capturar frase"]'
      ) as HTMLElement | null;
      if (!it) return false;
      it.click();
      return true;
    });
    if (!fraseOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Item "capturar frase" ausente no MenuCapturaVerde',
        screenshots,
      };
    }
    await page.waitForTimeout(900);

    // Confirma que SheetFrase montou.
    const sheetMontou = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="campo da frase"]');
    });
    if (!sheetMontou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'SheetFrase nao montou (campo da frase ausente)',
        screenshots,
      };
    }

    const abertoShot =
      'docs/sprints/M34.1-screenshots-gauntlet/A-sheet-aberto.png';
    await page.screenshot({ path: abertoShot });
    screenshots.push(abertoShot);

    // Localiza o container do sheet via aria-label do mock OU via o
    // proprio campo da frase, subindo a arvore ate achar elemento
    // com z-index numerico definido. Em web puro do gorhom, o
    // container raiz tem position:absolute + zIndex herdado da
    // containerStyle prop.
    const zIndexes = await page.evaluate(() => {
      // Acha o container do sheet: ancestral do "campo da frase"
      // que tenha zIndex computado >= 1.
      const campo = document.querySelector(
        '[aria-label="campo da frase"]'
      ) as HTMLElement | null;
      if (!campo) return null;

      let no: HTMLElement | null = campo;
      let zSheet: number | null = null;
      let alturaPercorrida = 0;
      while (no && alturaPercorrida < 30) {
        const zCss = getComputedStyle(no).zIndex;
        const zNum = Number.parseInt(zCss, 10);
        if (!Number.isNaN(zNum) && zNum > 0) {
          zSheet = Math.max(zSheet ?? 0, zNum);
        }
        no = no.parentElement;
        alturaPercorrida++;
      }

      // FABMenu: overlay global. Sobe na arvore ate achar zIndex.
      const fab = document.querySelector(
        '[aria-label="abrir menu lateral"]'
      ) as HTMLElement | null;
      let zFab: number | null = null;
      if (fab) {
        let n2: HTMLElement | null = fab;
        let h2 = 0;
        while (n2 && h2 < 30) {
          const zCss = getComputedStyle(n2).zIndex;
          const zNum = Number.parseInt(zCss, 10);
          if (!Number.isNaN(zNum) && zNum > 0) {
            zFab = Math.max(zFab ?? 0, zNum);
          }
          n2 = n2.parentElement;
          h2++;
        }
      }

      return { zSheet, zFab };
    });

    if (!zIndexes) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Nao foi possivel computar z-indexes (campo da frase ausente)',
        screenshots,
      };
    }

    if (zIndexes.zSheet === null || zIndexes.zSheet < 30) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `zIndex do sheet ${zIndexes.zSheet} < 30 (esperado >= 30 para ficar acima do FABMenu)`,
        screenshots,
      };
    }
    if (zIndexes.zFab !== null && zIndexes.zFab >= zIndexes.zSheet) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `zIndex do FABMenu ${zIndexes.zFab} >= zIndex do sheet ${zIndexes.zSheet} (FAB cobriria sheet)`,
        screenshots,
      };
    }

    // Validacao geometrica: o ponto central do botao "Cancelar" do
    // SheetFrase NAO pode ser coberto pelo FABMenu. Usa
    // elementFromPoint para confirmar topo do z-stack.
    const cobertura = await page.evaluate(() => {
      const cancelar = document.querySelector(
        '[aria-label="cancelar frase"]'
      ) as HTMLElement | null;
      const fab = document.querySelector(
        '[aria-label="abrir menu lateral"]'
      ) as HTMLElement | null;
      if (!cancelar) return { ok: false, motivo: 'cancelar ausente' };

      const r1 = cancelar.getBoundingClientRect();
      const c1: RetanguloRect = {
        left: Math.round(r1.left),
        top: Math.round(r1.top),
        right: Math.round(r1.right),
        bottom: Math.round(r1.bottom),
        width: Math.round(r1.width),
        height: Math.round(r1.height),
        centroX: Math.round(r1.left + r1.width / 2),
        centroY: Math.round(r1.top + r1.height / 2),
      };

      let c2: RetanguloRect | null = null;
      if (fab) {
        const r2 = fab.getBoundingClientRect();
        c2 = {
          left: Math.round(r2.left),
          top: Math.round(r2.top),
          right: Math.round(r2.right),
          bottom: Math.round(r2.bottom),
          width: Math.round(r2.width),
          height: Math.round(r2.height),
          centroX: Math.round(r2.left + r2.width / 2),
          centroY: Math.round(r2.top + r2.height / 2),
        };
      }

      // Hit-test: o que o navegador devolve no centro do botao?
      const noTopo = document.elementFromPoint(c1.centroX, c1.centroY);
      const cancelarContemTopo =
        noTopo === cancelar || cancelar.contains(noTopo);

      return {
        ok: cancelarContemTopo,
        motivo: cancelarContemTopo
          ? 'hit-test no centro do Cancelar devolve o proprio botao'
          : `hit-test devolve outro elemento (${
              (noTopo as HTMLElement | null)?.getAttribute('aria-label') ??
              (noTopo as HTMLElement | null)?.tagName ??
              'desconhecido'
            })`,
        rectCancelar: c1,
        rectFab: c2,
      };
    });

    if (!cobertura.ok) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Botao Cancelar coberto: ${cobertura.motivo}`,
        screenshots,
      };
    }

    const validShot =
      'docs/sprints/M34.1-screenshots-gauntlet/B-cancelar-acessivel.png';
    await page.screenshot({ path: validShot });
    screenshots.push(validShot);

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
      detalhe: `zSheet=${zIndexes.zSheet} > zFab=${zIndexes.zFab}; ${cobertura.motivo}`,
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
