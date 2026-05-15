// E2E M27.3 -- boot screen sem oscilacao via latch global
// (useAppPronto + useBootStatus). Reload em /humor, monitora
// [aria-label="loader ouroboros"] por 60s e conta transicoes.
// Esperado: 1 unica transicao (presente -> ausente). Nunca volta.
//
// Diferenca do M27.1: aquele cobria 8s e validava o useRef guard
// local em _layout.tsx. M27.3 cobre janela longa (60s) com latch
// em store global e usa __gauntlet.aguardarBoot() / tempoDeBoot()
// para correlacionar com as APIs de auditoria.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM27_3(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M27.3';
  const aspecto = 'boot-suspense';
  const screenshots: string[] = [];

  try {
    // 1. Carrega o gauntlet (instala window.__gauntlet).
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset antes de seed (CONTRACT secao 7 + spec do executor).
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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO nao ativa?',
        screenshots,
      };
    }

    // 3. Reload em / (rota raiz; e onde o BiometriaGate +
    //    SessaoBootGate + useFonts mais oscilavam em sessao fresh).
    await page.goto('http://localhost:8081/');

    // 4. Aguarda boot completo via API gauntlet (timeout 60s).
    const tempoBoot = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          aguardarBoot: (timeoutMs?: number) => Promise<boolean>;
          tempoDeBoot: () => number | null;
        };
      };
      if (!w.__gauntlet) return -1;
      const ok = await w.__gauntlet.aguardarBoot(60000);
      if (!ok) return -1;
      return w.__gauntlet.tempoDeBoot() ?? -1;
    });

    if (tempoBoot < 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'aguardarBoot retornou false em 60s -- boot nao completou',
        screenshots,
      };
    }

    // 5. Conta transicoes do loader por 60s adicionais. Esperado:
    //    como aguardarBoot ja resolveu, o loader ja esta ausente
    //    no inicio do sample; queremos provar que NUNCA mais
    //    aparece (zero transicoes ausente -> presente).
    const transicoes = await page.evaluate(async () => {
      let anterior: boolean | null = null;
      let transicoesAusenteParaPresente = 0;
      let totalTransicoes = 0;
      // 60 amostras de 1s = 60s. Granularidade suficiente -- a
      // oscilacao residual do M27.1 acontecia em janelas de 200ms+.
      for (let i = 0; i < 60; i++) {
        const presente = !!document.querySelector(
          '[aria-label="loader ouroboros"]'
        );
        if (anterior !== null && anterior !== presente) {
          totalTransicoes++;
          if (!anterior && presente) {
            transicoesAusenteParaPresente++;
          }
        }
        anterior = presente;
        await new Promise((r) => setTimeout(r, 1000));
      }
      return { transicoesAusenteParaPresente, totalTransicoes };
    });

    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-${aspecto}.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    if (transicoes.transicoesAusenteParaPresente > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `loader voltou ${transicoes.transicoesAusenteParaPresente}x apos boot completo (60s sample). Latch quebrou.`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `boot em ${tempoBoot}ms; ${transicoes.totalTransicoes} transicoes em 60s pos-boot, 0 reaparicoes do loader.`,
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
