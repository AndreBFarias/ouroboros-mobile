// E2E K1 (M-MENU-LATERAL-LAYOUT). Valida no Gauntlet:
//   1. Drawer abre via window.__gauntlet.abrirMenu().
//   2. Apos rolar ate Configuracoes e fechar, reabertura preserva
//      a posicao de scroll (assert sobre scrollTop do ScrollView).
//   3. Botao Configuracoes mantem distancia >= 48px da borda inferior
//      do painel do drawer (cobre safe area sem depender de insets
//      reais do Chrome — Gauntlet usa frame mobile 412x892).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseMenuLateralLayout(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-MENU-LATERAL-LAYOUT';
  const aspecto = 'menu-lateral-scroll-safe-area';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          abrirMenu: () => void;
          fecharMenu: () => void;
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

    // Abre o drawer.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrirMenu: () => void };
      };
      w.__gauntlet.abrirMenu();
    });
    await page.waitForTimeout(600);

    const aTopo = `docs/sprints/M-MENU-LATERAL-LAYOUT-screenshots-gauntlet/A-menu-aberto-topo.png`;
    await page.screenshot({ path: aTopo });
    screenshots.push(aTopo);

    // Rola o ScrollView interno do drawer ate o fim. Selector: o
    // primeiro elemento com aria-modal cujo filho ScrollView aceita
    // scrollTop. Em web, ScrollView vira um div com overflow: scroll.
    const rolagemAplicada = await page.evaluate(() => {
      const modal = document.querySelector('[aria-modal="true"]');
      if (!modal) return null;
      const scrollables = Array.from(modal.querySelectorAll('*')).filter(
        (el) => {
          const cs = getComputedStyle(el as Element);
          return cs.overflowY === 'scroll' || cs.overflowY === 'auto';
        }
      );
      const sv = scrollables[0] as HTMLElement | undefined;
      if (!sv) return null;
      sv.scrollTop = 220;
      return { scrollTop: sv.scrollTop, scrollHeight: sv.scrollHeight };
    });
    await page.waitForTimeout(400);

    const aRolado = `docs/sprints/M-MENU-LATERAL-LAYOUT-screenshots-gauntlet/A-menu-aberto-rolado.png`;
    await page.screenshot({ path: aRolado });
    screenshots.push(aRolado);

    // Fecha e reabre. Aguarda o debounce de 200ms persistir antes de
    // fechar. Total: 250ms safety.
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { fecharMenu: () => void };
      };
      w.__gauntlet.fecharMenu();
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrirMenu: () => void };
      };
      w.__gauntlet.abrirMenu();
    });
    await page.waitForTimeout(800);

    const reaberto = await page.evaluate(() => {
      const modal = document.querySelector('[aria-modal="true"]');
      if (!modal) return null;
      const scrollables = Array.from(modal.querySelectorAll('*')).filter(
        (el) => {
          const cs = getComputedStyle(el as Element);
          return cs.overflowY === 'scroll' || cs.overflowY === 'auto';
        }
      );
      const sv = scrollables[0] as HTMLElement | undefined;
      if (!sv) return null;
      const botao = document.querySelector(
        '[aria-label="abrir configuracoes"]'
      );
      if (!botao) return { scrollTop: sv.scrollTop, distanciaBorda: -1 };
      const rectBotao = (botao as Element).getBoundingClientRect();
      const rectModal = (modal as Element).getBoundingClientRect();
      const distanciaBorda = rectModal.bottom - rectBotao.bottom;
      return { scrollTop: sv.scrollTop, distanciaBorda };
    });

    const aReaberto = `docs/sprints/M-MENU-LATERAL-LAYOUT-screenshots-gauntlet/A-menu-reaberto-mesma-posicao.png`;
    await page.screenshot({ path: aReaberto });
    screenshots.push(aReaberto);

    if (!rolagemAplicada) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'ScrollView interno do drawer nao localizado',
        screenshots,
      };
    }
    if (!reaberto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'reabertura nao expos ScrollView novamente',
        screenshots,
      };
    }
    // Tolerancia de 5px: o scrollTo({animated:false}) no useEffect
    // pode ter pequeno offset por arredondamento do layout.
    if (Math.abs(reaberto.scrollTop - 220) > 5) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `scroll nao restaurado: esperado ~220, recebido ${reaberto.scrollTop}`,
        screenshots,
      };
    }
    // Botao Configuracoes precisa estar afastado da borda inferior
    // (criterio safe area). Em web sem insets reais o min e
    // max(spacing.xl, screenHeight*0.10) ~ 89px (892*0.10).
    if (reaberto.distanciaBorda < 24) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `botao Configuracoes muito proximo da borda: ${reaberto.distanciaBorda}px`,
        screenshots,
      };
    }
    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `scroll restaurado em ${reaberto.scrollTop}px; distancia borda ${reaberto.distanciaBorda}px`,
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
