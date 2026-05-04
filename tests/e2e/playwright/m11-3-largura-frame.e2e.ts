// E2E M11.3 -- valida que o grid de fotos respeita o frame mobile
// 412dp em web. Apos seed + adicionarFotoMock x4, mede a largura
// das thumbs renderizadas; cada thumb deve ter ~ floor((412 - 40 - 16) / 3)
// = 118-126dp (margem para arredondamento e diferencas de scale).
// Se hook useLarguraFrame falhasse e dim.width retornasse 1280
// (viewport desktop), thumb seria ~ 400dp e o teste falha.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM113LarguraFrame(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M11.3';
  const aspecto = 'largura-frame';
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
        detalhe: 'window.__gauntlet ausente',
        screenshots,
      };
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/memoria');
    });
    await page.waitForTimeout(1500);

    const tabClicada = await page.evaluate(() => {
      const t = document.querySelector('[aria-label="tab fotos"]') as HTMLElement | null;
      if (!t) return false;
      t.click();
      return true;
    });
    if (!tabClicada) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'tab fotos nao encontrada',
        screenshots,
      };
    }
    await page.waitForTimeout(700);

    // Insere 4 thumbs para preencher a primeira linha (3 cols) + 1 na 2a.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { adicionarFotoMock: () => Promise<void> };
      };
      for (let i = 0; i < 4; i += 1) {
        await w.__gauntlet.adicionarFotoMock();
      }
      await new Promise((r) => setTimeout(r, 800));
    });

    const out = 'docs/sprints/M11.3-screenshots-gauntlet/A-grid-fotos-3-cols.png';
    await page.screenshot({ path: out });
    screenshots.push(out);

    // Mede a largura da primeira thumb. Em frame 412 com padding 40
    // e gap 16 (2 gaps) -> (412 - 40 - 16) / 3 = 118.66 -> floor 118.
    // Toleramos 100 a 160 para acomodar variacoes de spacing/scale.
    const medidas = await page.evaluate(() => {
      const thumbs = Array.from(
        document.querySelectorAll('[aria-label^="foto galeria-manual"]')
      ) as HTMLElement[];
      if (thumbs.length === 0) return null;
      const widths = thumbs.map((t) => t.getBoundingClientRect().width);
      const maxRight = Math.max(
        ...thumbs.map((t) => t.getBoundingClientRect().right)
      );
      return { widths, maxRight, total: thumbs.length };
    });

    if (!medidas) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nenhuma thumb encontrada apos 4 adicionarFotoMock',
        screenshots,
      };
    }

    // Frame 412dp centrado em viewport. Borda direita do frame ~ (vw + 412) / 2.
    // Para vw=1280: borda direita = 846. Toleramos ate 870 (margem ainda
    // do frame com a sombra/scrollbar).
    const w0 = medidas.widths[0];
    const dentroDoLimite = w0 >= 100 && w0 <= 160;
    if (!dentroDoLimite) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `thumb width=${w0.toFixed(1)}px fora da faixa 100-160 (esperado ~118 para frame 412); larguras=${JSON.stringify(medidas.widths)}; useLarguraFrame nao aplicou`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `grid 3 cols com thumb ~${w0.toFixed(0)}px (esperado ~118 em frame 412); ${medidas.total} thumbs renderizadas; right max=${medidas.maxRight.toFixed(0)}px`,
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
