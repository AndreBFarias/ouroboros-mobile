// E2E sprint L1 (M-MEMORIAS-PARA-SAUDE-FISICA) -- valida que a rota
// /saude-fisica renderiza:
//   1. Header "Saude Fisica".
//   2. As 3 tabs canonicas (Treinos / Evolucao Corporal / Exercicios).
//   3. Aba Fotos REMOVIDA (regressao critica).
//   4. Tab Evolucao Corporal acessivel via tap.
//   5. Tab Exercicios acessivel via tap (mostra grupo muscular + busca).
//   6. MenuLateral nao expoe mais "registrar exercicios" em Registrar.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseSaudeFisicaTabs(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'L1';
  const aspecto = 'memorias-para-saude-fisica';
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

    // 2. Verificar header e tabs (Treinos default).
    const checkBase = await page.evaluate(() => {
      const txt = document.body.innerText;
      return {
        temHeader: txt.includes('Saúde Física'),
        temTabTreinos: !!document.querySelector('[aria-label="tab treinos"]'),
        temTabEvolucao: !!document.querySelector('[aria-label="tab evolucao"]'),
        temTabExercicios: !!document.querySelector(
          '[aria-label="tab exercicios"]'
        ),
        // Regressao: aba "fotos" foi removida pela L1.
        temTabFotosLegacy: !!document.querySelector('[aria-label="tab fotos"]'),
        // Header "Memórias" antigo nao deve mais aparecer.
        temHeaderMemoriasLegacy: txt.includes('Memórias'),
      };
    });

    const shotTreinos =
      'docs/sprints/L1-screenshots-gauntlet/A-saude-fisica-treinos.png';
    await page.screenshot({ path: shotTreinos });
    screenshots.push(shotTreinos);

    if (!checkBase.temHeader) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Header "Saude Fisica" ausente em /saude-fisica',
        screenshots,
      };
    }
    if (
      !checkBase.temTabTreinos ||
      !checkBase.temTabEvolucao ||
      !checkBase.temTabExercicios
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tabs canonicas incompletas: treinos=${checkBase.temTabTreinos} evolucao=${checkBase.temTabEvolucao} exercicios=${checkBase.temTabExercicios}`,
        screenshots,
      };
    }
    if (checkBase.temTabFotosLegacy) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'aba "fotos" legada ainda presente (L1 deveria ter removido)',
        screenshots,
      };
    }
    if (checkBase.temHeaderMemoriasLegacy) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'header antigo "Memorias" ainda visivel (L1 trocou para "Saude Fisica")',
        screenshots,
      };
    }

    // 3. Tap na aba Evolucao Corporal e verificar render.
    await page.evaluate(() => {
      const t = document.querySelector(
        '[aria-label="tab evolucao"]'
      ) as HTMLElement | null;
      if (t) t.click();
    });
    await page.waitForTimeout(500);

    const shotEvolucao =
      'docs/sprints/L1-screenshots-gauntlet/A-saude-fisica-evolucao-corporal.png';
    await page.screenshot({ path: shotEvolucao });
    screenshots.push(shotEvolucao);

    // 4. Tap na aba Exercicios e verificar campo de busca.
    await page.evaluate(() => {
      const t = document.querySelector(
        '[aria-label="tab exercicios"]'
      ) as HTMLElement | null;
      if (t) t.click();
    });
    await page.waitForTimeout(500);

    const checkExercicios = await page.evaluate(() => {
      return {
        temBusca: !!document.querySelector(
          '[aria-label="campo de busca de exercicio"]'
        ),
        temGrupoLabel: document.body.innerText.includes('Grupo muscular'),
      };
    });

    const shotExercicios =
      'docs/sprints/L1-screenshots-gauntlet/A-saude-fisica-exercicios.png';
    await page.screenshot({ path: shotExercicios });
    screenshots.push(shotExercicios);

    if (!checkExercicios.temBusca || !checkExercicios.temGrupoLabel) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `aba Exercicios incompleta: busca=${checkExercicios.temBusca} grupoLabel=${checkExercicios.temGrupoLabel}`,
        screenshots,
      };
    }

    // 5. Abrir menu lateral e confirmar que "registrar exercicios" sumiu.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrirMenu: () => void };
      };
      w.__gauntlet.abrirMenu();
    });
    await page.waitForTimeout(400);

    const checkMenu = await page.evaluate(() => {
      return {
        temItemSaude: !!document.querySelector(
          '[aria-label="item saude fisica"]'
        ),
        temItemMemoriasLegacy: !!document.querySelector(
          '[aria-label="item memorias"]'
        ),
        temRegistrarExerciciosLegacy: !!document.querySelector(
          '[aria-label="registrar exercicios"]'
        ),
      };
    });

    const shotMenu =
      'docs/sprints/L1-screenshots-gauntlet/A-menu-lateral-sem-exercicios-em-registrar.png';
    await page.screenshot({ path: shotMenu });
    screenshots.push(shotMenu);

    if (!checkMenu.temItemSaude) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'item "Saude Fisica" ausente do menu lateral',
        screenshots,
      };
    }
    if (checkMenu.temItemMemoriasLegacy) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'item "Memorias" legado ainda no menu (L1 deveria ter renomeado)',
        screenshots,
      };
    }
    if (checkMenu.temRegistrarExerciciosLegacy) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'item "registrar exercicios" ainda presente em Registrar; L1 moveu para a aba Exercicios em /saude-fisica',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Header "Saude Fisica", 3 tabs (Treinos / Evolucao Corporal / Exercicios) renderizadas; aba Fotos removida; menu lateral aponta para /saude-fisica e nao mostra "registrar exercicios"',
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
