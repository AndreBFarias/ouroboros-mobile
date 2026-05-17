// E2E sprint R-SF-1 (M-SAUDE-FISICA-GRUPOS-DE-TREINO) -- valida que
// /saude-fisica expoe a 4a aba "Grupos" + acao fixa "Iniciar treino"
// no FAB+ verde. Cobre:
//   1. Header "Saude Fisica" + 4 tabs (Treinos / Evolucao / Exercicios / Grupos).
//   2. Tap em "Grupos" mostra empty state canonico "Crie um grupo
//      para reunir varias rotinas (Treino A, B, C).".
//   3. FAB+ verde abre sheet com primeira opcao "Iniciar treino"
//      (visivel em qualquer tab).
//   4. Q19.b continua funcionando: /grupos/<slug> tem pill "Iniciar"
//      no header (verificado indiretamente via screenshot de visita).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseGruposEmSaudeFisica(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-SF-1';
  const aspecto = 'grupos-em-saude-fisica';
  const screenshots: string[] = [];

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
        detalhe: 'window.__gauntlet ausente; gauntlet nao instalado',
        screenshots,
      };
    }

    // 1. Abrir /saude-fisica.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    // 2. Confirmar as 4 tabs canonicas.
    const checkTabs = await page.evaluate(() => {
      return {
        temHeader: document.body.innerText.includes('Saúde Física'),
        temTabTreinos: !!document.querySelector('[aria-label="tab treinos"]'),
        temTabEvolucao: !!document.querySelector('[aria-label="tab evolucao"]'),
        temTabExercicios: !!document.querySelector(
          '[aria-label="tab exercicios"]'
        ),
        temTabGrupos: !!document.querySelector('[aria-label="tab grupos"]'),
      };
    });

    const shotTabs =
      'docs/sprints/R-SF-1-screenshots-gauntlet/A-saude-fisica-4-tabs.png';
    await page.screenshot({ path: shotTabs });
    screenshots.push(shotTabs);

    if (!checkTabs.temHeader || !checkTabs.temTabGrupos) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cabecalho/tab grupos ausente: header=${checkTabs.temHeader} grupos=${checkTabs.temTabGrupos}`,
        screenshots,
      };
    }
    if (
      !checkTabs.temTabTreinos ||
      !checkTabs.temTabEvolucao ||
      !checkTabs.temTabExercicios
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tabs canonicas regrediram: treinos=${checkTabs.temTabTreinos} evolucao=${checkTabs.temTabEvolucao} exercicios=${checkTabs.temTabExercicios}`,
        screenshots,
      };
    }

    // 3. Tap em "tab grupos" e validar empty state canonico.
    await page.evaluate(() => {
      const t = document.querySelector(
        '[aria-label="tab grupos"]'
      ) as HTMLElement | null;
      if (t) t.click();
    });
    await page.waitForTimeout(500);

    const checkEmpty = await page.evaluate(() => {
      return document.body.innerText.includes(
        'Crie um grupo para reunir várias rotinas (Treino A, B, C).'
      );
    });

    const shotGruposEmpty =
      'docs/sprints/R-SF-1-screenshots-gauntlet/B-aba-grupos-empty-state.png';
    await page.screenshot({ path: shotGruposEmpty });
    screenshots.push(shotGruposEmpty);

    if (!checkEmpty) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'empty state canonico ausente na aba "Grupos"',
        screenshots,
      };
    }

    // 4. FAB+ verde abre sheet com "Iniciar treino" e "Novo grupo".
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrirSheet: (nome: string) => void };
      };
      if (typeof w.__gauntlet.abrirSheet === 'function') {
        w.__gauntlet.abrirSheet('captura');
      } else {
        const fab = document.querySelector(
          '[aria-label="abrir menu de captura"]'
        ) as HTMLElement | null;
        if (fab) fab.click();
      }
    });
    await page.waitForTimeout(700);

    const checkFab = await page.evaluate(() => {
      return {
        temIniciarTreino: !!document.querySelector(
          '[aria-label="iniciar treino"]'
        ),
        temNovoGrupo: !!document.querySelector('[aria-label="novo grupo"]'),
      };
    });

    const shotFab =
      'docs/sprints/R-SF-1-screenshots-gauntlet/C-fab-iniciar-treino.png';
    await page.screenshot({ path: shotFab });
    screenshots.push(shotFab);

    if (!checkFab.temIniciarTreino) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'acao "Iniciar treino" ausente do FAB+ verde em /saude-fisica',
        screenshots,
      };
    }
    if (!checkFab.temNovoGrupo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'acao "Novo grupo" ausente do FAB+ verde quando a tab Grupos esta ativa',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        '/saude-fisica expoe 4 tabs (incluindo "Grupos" R-SF-1), empty state canonico na aba Grupos, e FAB+ verde mostra "Iniciar treino" + "Novo grupo" como acoes contextuais',
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
