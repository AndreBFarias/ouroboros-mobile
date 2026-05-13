// E2E Q17.d -- bloco "Importados de Conexao Saude" em Evolucao.
// Verifica:
//  1. CardHCResumo NAO renderiza quando toggle healthConnectSync esta
//     off (default).
//  2. CardHCResumo CONTINUA oculto quando toggle ON mas nenhuma
//     permission HC concedida (no web mock retorna lista vazia).
//
// Limitacao web: react-native-health-connect retorna mock sem dados,
// entao a validacao do card POPULADO so e possivel em runtime no
// celular real com HC conectado. Este E2E cobre a guarda dupla
// (toggle + permissions) que evita poluir a UI.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseQ17dEvolucaoHcResumo(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'Q17';
  const aspecto = 'q17d-evolucao-hc-resumo';
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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO inativa?',
        screenshots,
      };
    }

    // 1) Toggle off (default seed). Abre /saude-fisica → aba evolucao
    // e confirma que o bloco HC nao aparece.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      document
        .querySelectorAll('[aria-label="Bottom sheet backdrop"]')
        .forEach((b) => {
          try {
            (b as HTMLElement).click();
          } catch {
            // ignora
          }
        });
      const tab = document.querySelector(
        '[aria-label="tab evolucao"]'
      ) as HTMLElement | null;
      tab?.click();
    });
    await page.waitForTimeout(800);

    const blocoOcultoOff = await page.evaluate(() => {
      return !document.body.innerText.includes('importados de Conexao Saude');
    });
    const pathOff = `docs/sprints/Q17-screenshots-gauntlet/q17d-e2e-A-toggle-off.png`;
    await page.screenshot({ path: pathOff });
    screenshots.push(pathOff);
    if (!blocoOcultoOff) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'CardHCResumo apareceu mesmo com toggle off (deveria estar oculto)',
        screenshots,
      };
    }

    // 2) Toggle ON sem permissions: bloco continua oculto pela segunda
    // guarda (listarPermissoesConcedidas retorna []).
    await page.evaluate(() => {
      const raw = localStorage.getItem('ouroboros.settings.v2');
      if (!raw) return;
      const obj = JSON.parse(raw) as {
        state?: { featureToggles?: Record<string, boolean> };
      };
      if (obj.state?.featureToggles) {
        obj.state.featureToggles.healthConnectSync = true;
        localStorage.setItem('ouroboros.settings.v2', JSON.stringify(obj));
      }
    });

    await page.goto('http://localhost:8081/saude-fisica');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      document
        .querySelectorAll('[aria-label="Bottom sheet backdrop"]')
        .forEach((b) => {
          try {
            (b as HTMLElement).click();
          } catch {
            // ignora
          }
        });
      const tab = document.querySelector(
        '[aria-label="tab evolucao"]'
      ) as HTMLElement | null;
      tab?.click();
    });
    await page.waitForTimeout(1200);

    const blocoOcultoOn = await page.evaluate(() => {
      return !document.body.innerText.includes('importados de Conexao Saude');
    });
    const pathOn = `docs/sprints/Q17-screenshots-gauntlet/q17d-e2e-B-toggle-on-sem-perm.png`;
    await page.screenshot({ path: pathOn });
    screenshots.push(pathOn);
    if (!blocoOcultoOn) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'CardHCResumo apareceu com toggle ON e sem permissions (segunda guarda falhou)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'CardHCResumo oculto em ambos os estados (toggle off / toggle on sem permissions) — guarda dupla funcional',
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
