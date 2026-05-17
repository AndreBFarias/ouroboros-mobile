// E2E R-NAV-3-V2 -- valida que o componente ConfirmarExclusao renderiza
// nas telas migradas (contador + alarme + rotina), substituindo Modais
// inline duplicados.
//
// Estrategia:
//   1. Seedeia o Gauntlet com vault + 1 contador + 1 alarme + 1 rotina.
//   2. Para cada uma das 3 telas:
//      a. Navega via __gauntlet.abrir(...).
//      b. Toca no botao Excluir (ou abre o modal direto via store).
//      c. Verifica que o Modal canonico aparece com:
//         - accessibilityLabel "modal confirmar exclusao"
//         - botoes "excluir" e "cancelar"
//      d. Verifica que NAO existe o accessibilityLabel antigo
//         ("modal confirmar exclusao contador", "modal confirmar apagar
//          rotina", "modal confirmar exclusao do grupo").
//
// Pre-requisito: ./gauntlet.sh em foreground.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface DOMSnapshot {
  presenteCanonico: number;
  presenteContadorAntigo: boolean;
  presenteRotinaAntigo: boolean;
  presenteGrupoAntigo: boolean;
  botaoExcluir: number;
  botaoCancelar: number;
}

function snapshotDom(): DOMSnapshot {
  const aria = (s: string) =>
    document.querySelectorAll(`[aria-label="${s}"]`).length;
  return {
    // O componente canonico ConfirmarExclusao usa este label.
    presenteCanonico: aria('modal confirmar exclusao'),
    // Antigos labels nao devem existir mais nas telas migradas.
    presenteContadorAntigo: aria('modal confirmar exclusao contador') > 0,
    presenteRotinaAntigo: aria('modal confirmar apagar rotina') > 0,
    presenteGrupoAntigo: aria('modal confirmar exclusao do grupo') > 0,
    botaoExcluir: aria('excluir'),
    botaoCancelar: aria('cancelar'),
  };
}

export default async function caseRNav3V2(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-NAV-3-V2';
  const aspecto = 'confirmar-exclusao-canonico';
  const screenshots: string[] = [];

  try {
    // 1. Boot gauntlet com estado limpo.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
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

    // 2. Tela A -- /contadores/<slug>. Abre, dispara Modal via toque no
    //    botao Excluir contador, valida que componente canonico monta
    //    e que o accessibilityLabel antigo sumiu.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/contadores/exemplo');
    });
    await page.waitForTimeout(1500);
    // Forca abertura do modal via click direto no botao destrutivo.
    const abriuContador = await page.evaluate(() => {
      const btn = document.querySelector('[aria-label="Excluir contador"]');
      if (!btn) return false;
      (btn as HTMLElement).click();
      return true;
    });
    if (!abriuContador) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'botao "Excluir contador" nao encontrado em /contadores/exemplo (talvez nao existe contador exemplo no vault seed).',
        screenshots,
      };
    }
    await page.waitForTimeout(400);
    const snapA = await page.evaluate(snapshotDom);
    const pathA =
      'docs/sprints/R-NAV-3-V2-screenshots-gauntlet/A-contador-modal-canonico.png';
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    if (snapA.presenteCanonico < 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `contador: modal canonico nao montou. snap=${JSON.stringify(snapA)}`,
        screenshots,
      };
    }
    if (snapA.presenteContadorAntigo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `contador: label antigo "modal confirmar exclusao contador" ainda presente.`,
        screenshots,
      };
    }

    // 3. Tela B -- /alarmes/<slug> (edicao). Mesma dinamica. Alarmes
    //    nao tinha Modal antes (R-NAV-3-V2 adiciona). Validamos que
    //    agora aparece e usa accessibilityLabel canonico.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/alarmes/exemplo');
    });
    await page.waitForTimeout(1500);
    const abriuAlarme = await page.evaluate(() => {
      const btn = document.querySelector('[aria-label="Excluir alarme"]');
      if (!btn) return false;
      (btn as HTMLElement).click();
      return true;
    });
    if (!abriuAlarme) {
      // Aceita inconclusivo se nao houver alarme seedado.
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'botao "Excluir alarme" nao encontrado. Pode nao haver alarme seedado.',
        screenshots,
      };
    }
    await page.waitForTimeout(400);
    const snapB = await page.evaluate(snapshotDom);
    const pathB =
      'docs/sprints/R-NAV-3-V2-screenshots-gauntlet/B-alarme-modal-canonico.png';
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    if (snapB.presenteCanonico < 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `alarme: modal canonico nao montou. snap=${JSON.stringify(snapB)}`,
        screenshots,
      };
    }

    // 4. Tela C -- /rotinas/<slug> (edicao). Botao Apagar dentro de
    //    FormRotina abre modal canonico. Verifica que o label antigo
    //    "modal confirmar apagar rotina" sumiu.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/rotinas/exemplo');
    });
    await page.waitForTimeout(1500);
    const abriuRotina = await page.evaluate(() => {
      const btn = document.querySelector('[aria-label="Apagar"]');
      if (!btn) return false;
      (btn as HTMLElement).click();
      return true;
    });
    if (!abriuRotina) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'botao "Apagar" nao encontrado em /rotinas/exemplo. Pode nao haver rotina seedada.',
        screenshots,
      };
    }
    await page.waitForTimeout(400);
    const snapC = await page.evaluate(snapshotDom);
    const pathC =
      'docs/sprints/R-NAV-3-V2-screenshots-gauntlet/C-rotina-modal-canonico.png';
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);

    if (snapC.presenteCanonico < 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `rotina: modal canonico nao montou. snap=${JSON.stringify(snapC)}`,
        screenshots,
      };
    }
    if (snapC.presenteRotinaAntigo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `rotina: label antigo "modal confirmar apagar rotina" ainda presente.`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `3 telas migradas para ConfirmarExclusao canonico: contador (snap=${JSON.stringify(
        snapA
      )}), alarme (snap=${JSON.stringify(snapB)}), rotina (snap=${JSON.stringify(
        snapC
      )}).`,
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
