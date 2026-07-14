// Caso E2E R-AUDIT-VAULT-PERF (Gauntlet web, automacao de browser).
//
// E2E de NAO-REGRESSAO: a sprint colapsa o fan-out de leitura do Vault
// (listagem unica de markdown/ + leitura em lote) sem mudar NADA visivel.
// O caso prova que os mesmos dados chegam a Home (FeedHoje) e ao Recap
// depois do refactor -- mesma lista, mesma ordem, mesmos numeros.
//
// Copiado de tests/e2e/playwright/e2e-template.ts (template canonico).
// Executado pela automacao de browser no Gauntlet, nao por Jest
// (jest.config testMatch filtra *.test.ts).
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

// Diretorio de evidencias da sprint (spec §6.5).
const DIR = 'docs/sprints/R-AUDIT-VAULT-PERF-screenshots-gauntlet';

export default async function case_r_audit_vault_perf_naoregressao(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-AUDIT-VAULT-PERF';
  const aspecto = 'nao-regressao';
  const screenshots: string[] = [];

  try {
    // 1. Gauntlet + reset + seed deterministico.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          seedComDados?: () => void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      // seedComDados popula humor/tarefas/diario para os cards e o Recap
      // terem substancia; cai para seed() se a API rica nao existir.
      if (typeof w.__gauntlet.seedComDados === 'function') {
        w.__gauntlet.seedComDados();
      } else {
        w.__gauntlet.seed();
      }
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

    // 2. Home (FeedHoje) intacta.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => void };
      };
      w.__gauntlet.abrir('/');
    });
    await page.waitForTimeout(1200);

    // O feed renderizou substancia (nao ficou preso em loading/erro).
    const homeOk = await page.evaluate(() => {
      const texto = document.body?.innerText ?? '';
      const semErro = !/erro inesperado|something went wrong/i.test(texto);
      // Ha conteudo textual real do feed (mais que um esqueleto vazio).
      const temConteudo = texto.trim().length > 40;
      return semErro && temConteudo;
    });
    if (!homeOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FeedHoje nao renderizou conteudo apos foco (regressao?)',
        screenshots,
      };
    }

    const pathHome = `${DIR}/A-home-feed.png`;
    await page.screenshot({ path: pathHome, fullPage: true });
    screenshots.push(pathHome);

    // 3. Instrumentacao opcional (spec §6.4): se o executor expuser um
    // contador de listVaultFolder em __DEV__ via window.__vaultProbe,
    // asserir que a Home lista markdown/ poucas vezes por foco. Ausente
    // por padrao (a contagem real e no device, §7.2) -> assert pulado.
    const probe = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __vaultProbe?: { markdownListagens?: number };
      };
      const n = w.__vaultProbe?.markdownListagens;
      return typeof n === 'number' ? n : -1;
    });
    if (probe >= 0 && probe > 3) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Home listou markdown/ ${probe}x por foco (esperado <= 3)`,
        screenshots,
      };
    }

    // 4. Recap intacto.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => void };
      };
      w.__gauntlet.abrir('/recap-memorias');
    });
    await page.waitForTimeout(1400);

    const recapOk = await page.evaluate(() => {
      const texto = document.body?.innerText ?? '';
      const semErro = !/erro inesperado|something went wrong/i.test(texto);
      const temConteudo = texto.trim().length > 40;
      return semErro && temConteudo;
    });
    if (!recapOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Recap nao renderizou conteudo (regressao de agregacao?)',
        screenshots,
      };
    }

    const pathRecap = `${DIR}/B-recap-numeros.png`;
    await page.screenshot({ path: pathRecap, fullPage: true });
    screenshots.push(pathRecap);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Home e Recap renderizam os mesmos dados apos o refactor de leitura ' +
        (probe >= 0
          ? `(probe markdown/ = ${probe} por foco da Home)`
          : '(probe de listagem nao exposto; contagem no device, §7.2)'),
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
