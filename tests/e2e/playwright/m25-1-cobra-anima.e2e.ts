// E2E M25.1 -- animacao da cobra. Le o atributo 'transform' dos
// 3 aneis em 6 amostras separadas por 250ms cada. Se TODAS as
// amostras retornam 'rotate(0 160 160)' (mesmo angulo), animacao
// nao roda em web -- FAIL. Bug descoberto: rotacao parada.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM25_1(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M25.1';
  const aspecto = 'cobra-anima';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: { reset: () => void; seed: () => void };
      };
      w.__gauntlet?.reset();
      w.__gauntlet?.seed();
    });
    await page.goto('http://localhost:8081/humor');
    await page.waitForTimeout(500);

    const samples = await page.evaluate(async () => {
      const ler = () => {
        const svg = document.querySelector('[aria-label="loader ouroboros"] svg');
        if (!svg) return null;
        const gs = svg.querySelectorAll('g');
        return Array.from(gs).map(g => g.getAttribute('transform')).filter(Boolean);
      };
      const out: Array<{ t: number; transforms: (string | null)[] | null }> = [];
      for (let i = 0; i < 6; i++) {
        out.push({ t: i * 250, transforms: ler() });
        await new Promise(r => setTimeout(r, 250));
      }
      return out;
    });

    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M25.1/A-fail-rotate-zero.png';
    await page.screenshot({ path });
    screenshots.push(path);

    const validos = samples.filter(s => s.transforms);
    const angulos = new Set(
      validos.flatMap(s => s.transforms!.filter(t => t && t.startsWith('rotate')))
    );
    if (validos.length === 0) {
      return { sprint, aspecto, status: 'INCONCLUSIVO', detalhe: 'loader nao foi observado durante medicao', screenshots };
    }
    if (angulos.size <= 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `animacao nao varia em web: angulos unicos=${[...angulos].join(',')}`,
        screenshots,
      };
    }
    return { sprint, aspecto, status: 'PASS', detalhe: `${angulos.size} angulos distintos observados`, screenshots };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
