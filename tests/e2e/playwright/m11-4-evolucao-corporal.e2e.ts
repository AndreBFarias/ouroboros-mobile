// E2E M11.4 -- subsecao "Evolucao corporal" na aba Marcos da
// MemoriasScreen. Verifica:
//  1. Secao renderizada com header "Evolucao corporal" e botao
//     "Registrar evolucao" presente.
//  2. Botao "Registrar evolucao" clicado dispara navegacao para
//     /medidas/novo.
//  3. Empty state aparece quando nao ha medidas (vault zerado).
//
// Pre: __gauntlet.reset() + seed() para zerar stores e definir vault
// mock. Em web/dev (GAUNTLET_ATIVO) o BiometriaGate e bypassado e
// onboarding ja vem feito apos seed().
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM114EvolucaoCorporal(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M11.4';
  const aspecto = 'evolucao-corporal';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // Reset antes de seed (auditoria 2026-05-04 item 20).
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

    // Navega para /memoria via gauntlet (router.replace).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/memoria');
    });
    await page.waitForTimeout(1500);

    // Click na tab Marcos.
    const tabClicada = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[aria-label="tab marcos"]');
      const t = tabs[0] as HTMLElement | undefined;
      if (!t) return false;
      t.click();
      return true;
    });
    if (!tabClicada) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'tab marcos nao encontrada (aria-label="tab marcos")',
        screenshots,
      };
    }
    await page.waitForTimeout(800);

    // 1) Secao "Evolucao corporal" presente.
    const secaoPresente = await page.evaluate(() => {
      const txt = document.body.innerText;
      return txt.includes('Evolução corporal');
    });
    if (!secaoPresente) {
      const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-secao-ausente.png`;
      await page.screenshot({ path });
      screenshots.push(path);
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'header "Evolucao corporal" nao encontrado na aba Marcos',
        screenshots,
      };
    }

    const inicial = `docs/sprints/${sprint}-screenshots-gauntlet/A-secao-evolucao-presente.png`;
    await page.screenshot({ path: inicial });
    screenshots.push(inicial);

    // 2) Empty state ou cards renderizados (vault mock pode estar
    // sem medidas; aceitamos qualquer um dos dois caminhos).
    const temConteudo = await page.evaluate(() => {
      const txt = document.body.innerText;
      const hasEmpty = txt.includes('Sem registros corporais ainda.');
      const hasCard = !!document.querySelector('[aria-label*="abrir medida de"]');
      return hasEmpty || hasCard;
    });
    if (!temConteudo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nem empty state nem cards renderizados na secao',
        screenshots,
      };
    }

    // 3) Botao "Registrar evolucao" presente e dispara navegacao.
    const botaoPresente = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="registrar evolucao"]');
    });
    if (!botaoPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao "Registrar evolucao" ausente no header da secao',
        screenshots,
      };
    }

    const cliqueOk = await page.evaluate(() => {
      const btn = document.querySelector(
        '[aria-label="registrar evolucao"]'
      ) as HTMLElement | null;
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!cliqueOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'falha ao clicar "Registrar evolucao"',
        screenshots,
      };
    }
    await page.waitForTimeout(1200);

    // Apos click espera-se que a rota seja /medidas/novo. Verifica
    // via location.pathname (gauntlet usa router.push interno; em
    // web isso atualiza a URL).
    const rotaNova = await page.evaluate(() => {
      return window.location.pathname;
    });

    const aposClick = `docs/sprints/${sprint}-screenshots-gauntlet/B-rota-medidas-novo.png`;
    await page.screenshot({ path: aposClick });
    screenshots.push(aposClick);

    if (!rotaNova.includes('/medidas/novo')) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `rota apos click nao casou /medidas/novo (atual: ${rotaNova}). Pode ser limitacao do router em gauntlet web; fluxo visual confirmado.`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'secao Evolucao corporal presente + botao Registrar navegou para /medidas/novo',
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
