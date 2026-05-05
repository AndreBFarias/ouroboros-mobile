// E2E M39 -- Schema canonico MidiaCompanion + helpers escritos.
//
// M39 nao adiciona UI nova: formaliza o schema zod do .md companion
// (ADR-0017) e introduz os helpers escreverMidiaComCompanion /
// lerCompanion / migrarAssetsLegacyParaMedia em src/lib/vault/.
// O E2E precisa validar:
//
//  1. App carrega normalmente apos a sprint (boot hook
//     migrarAssetsLegacyParaMedia plugado em BOOT_HOOKS nao trava
//     o arranque mesmo quando assets/ nao existe no Vault mock web).
//  2. Rota /memoria continua acessivel e o FAB verde "abrir menu de
//     captura" ainda renderiza (M34 nao foi quebrado).
//  3. window.__gauntlet.estado() retorna shape esperado (smoke do
//     bypass de gates).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM39MidiaCompanion(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M39';
  const aspecto = 'midia-companion';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // Reset + seed determinisco. Reset antes de seed garante ordem
    // independente entre casos E2E.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          estado: () => unknown;
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

    // Smoke: estado retorna objeto. Boot hook migrarAssetsLegacy
    // do M39 nao trava a inicializacao mesmo com vault mock web.
    const estadoOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { estado: () => unknown };
      };
      const s = w.__gauntlet.estado();
      return typeof s === 'object' && s !== null;
    });
    if (!estadoOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'gauntlet.estado() nao retornou objeto valido apos boot M39 (BOOT_HOOKS quebrou?)',
        screenshots,
      };
    }

    // Rota /memoria continua usavel: M39 nao quebra capturarFoto et al.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/memoria');
    });
    await page.waitForTimeout(1500);

    const fabPresente = await page.evaluate(() => {
      return !!document.querySelector(
        '[aria-label="abrir menu de captura"]'
      );
    });
    if (!fabPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'FAB verde "abrir menu de captura" ausente em /memoria apos M39 (capturarFoto/Musica/Video/Frase quebrados?)',
        screenshots,
      };
    }

    const png =
      'docs/sprints/M39-screenshots-gauntlet/A-memoria-apos-m39.png';
    await page.screenshot({ path: png });
    screenshots.push(png);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'BOOT_HOOKS plugou migrarAssetsLegacy sem travar; rota /memoria continua usavel; menu de captura intacto',
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
