// E2E M-GAUNTLET-SEED-V2 -- valida que apos seedComDados('humores-30d')
// o heatmap em /humor renderiza celulas coloridas (count > 0). Sem o
// seed, o cache do Vault esta ausente em web mock e a tela mostra
// EmptyState. Com o seed, useHumorMock injeta celulas sintetiscas
// e useHumorHeatmap monta cache local sobreposto.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseSeedV2Heatmap(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-GAUNTLET-SEED-V2';
  const aspecto = 'heatmap-humores-30d';
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
        detalhe: 'window.__gauntlet ausente; rodar via ./gauntlet.sh',
        screenshots,
      };
    }

    // Plug fixture humores-30d nas stores mock.
    const seedDadosOk = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: {
          seedComDados: (
            f: 'humores-30d' | 'diarios-3' | 'eventos-7'
          ) => Promise<void>;
        };
      };
      await w.__gauntlet.seedComDados('humores-30d');
      return true;
    });
    if (!seedDadosOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'seedComDados("humores-30d") falhou (API ausente?)',
        screenshots,
      };
    }

    // Navega para /humor.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/humor');
    });
    await page.waitForTimeout(1500);

    // Conta celulas do heatmap. HumorHeatmap renderiza cada celula
    // com aria-label "celula <YYYY-MM-DD> humor <nivel>" (ver
    // src/components/data/HumorHeatmap.tsx, labelA11y). Celulas vazias
    // ficam "celula vazia"; aqui filtramos so as preenchidas.
    const contagem = await page.evaluate(() => {
      const labels = document.querySelectorAll('[aria-label^="celula 20"]');
      return labels.length;
    });

    const sshot = 'docs/sprints/M-GAUNTLET-SEED-V2-screenshots-gauntlet/A-heatmap-colorido.png';
    await page.screenshot({ path: sshot, fullPage: false });
    screenshots.push(sshot);

    if (contagem === 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'heatmap renderizou 0 celulas. Verificar useHumorMock plug em useHumorHeatmap, e tambem se aria-label do HumorHeatmap mudou.',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `heatmap colorido com ${contagem} celulas apos seedComDados('humores-30d')`,
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
