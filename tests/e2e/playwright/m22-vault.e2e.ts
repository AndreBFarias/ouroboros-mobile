// E2E M22 -- vault auto-criado. Pos-seed o vaultRoot deve ser
// 'web://mock-vault/Ouroboros'. Confirma via __gauntlet.estado()
// e captura screenshot do dashboard.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseM22(page: PlaywrightPageLike): Promise<ResultadoE2E> {
  const sprint = 'M22';
  const aspecto = 'vault-auto-criado';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const estado = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { reset: () => void; seed: () => void; estado: () => { vaultRoot: string | null } };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      return w.__gauntlet.estado();
    });

    const path = 'docs/validacao-gauntlet-2026-05-03/screenshots/M22/A-vault-setado.png';
    await page.screenshot({ path });
    screenshots.push(path);

    if (estado.vaultRoot !== 'web://mock-vault/Ouroboros') {
      return { sprint, aspecto, status: 'FAIL', detalhe: `vaultRoot=${estado.vaultRoot}`, screenshots };
    }
    return { sprint, aspecto, status: 'PASS', detalhe: 'vaultRoot=web://mock-vault/Ouroboros', screenshots };
  } catch (err) {
    return { sprint, aspecto, status: 'FAIL', detalhe: `erro: ${(err as Error).message}`, screenshots };
  }
}
