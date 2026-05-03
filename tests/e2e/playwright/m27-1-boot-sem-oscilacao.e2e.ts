// E2E M27.1 -- boot screen sem oscilacao. Polla
// [aria-label="loader ouroboros"] a cada 200ms por 8s e conta
// transicoes presente -> ausente -> presente. Esperado: 1 unica
// transicao (presente -> ausente). Bug descoberto: oscila.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM27_1(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M27.1';
  const aspecto = 'boot-sem-oscila';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/humor');
    await page.waitForTimeout(500);

    const transicoes = await page.evaluate(async () => {
      let anterior: boolean | null = null;
      let count = 0;
      for (let i = 0; i < 40; i++) {
        const presente = !!document.querySelector('[aria-label="loader ouroboros"]');
        if (anterior !== null && anterior !== presente) count++;
        anterior = presente;
        await new Promise(r => setTimeout(r, 200));
      }
      return count;
    });

    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M27.1/A-boot-oscila-em-humor.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (transicoes > 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `${transicoes} transicoes do loader em 8s (esperado <= 1) -- oscilacao confirmada`,
        screenshots,
      };
    }
    return { sprint, aspecto, status: 'PASS', detalhe: `${transicoes} transicoes em 8s`, screenshots };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
