// E2E AUDIT-P2-9 — a rota /settings/sobre tem entrada de usuario e o
// bloco Sobre do rodape de Configuracoes e o componente compartilhado.
//
// O achado: app/settings/index.tsx tinha uma copia local homonima de
// SecaoSobre, sem Build nem Commit, e nenhum router.push para
// /settings/sobre. A unica navegacao existente era o bypass
// __gauntlet.abrir num E2E. Este caso prova o contrario dos dois:
//   1. no rodape de Configuracoes aparecem Versao, Build e Commit;
//   2. o toque em "Detalhes e creditos" leva a tela dedicada, que traz
//      o mini-changelog e os creditos CC BY 4.0 das trilhas do Recap.
//
// A linha "Ver no GitHub" e condicional (src/components/settings/
// SecaoSobre.tsx guarda por APP_REPO_URL.length > 0) e app.json nao
// tem expo.extra.repoUrl, entao ela NAO renderiza — sao quatro linhas
// no rodape, nao cinco. A ausencia e o comportamento correto: antes a
// copia local renderizava o botao e chamava Linking.openURL('').
//
// Como executar (automacao de browser):
//   1. EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
//   2. Abrir http://localhost:8081/_dev/gauntlet
//   3. Executar este caso via automacao de browser.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

export default async function caseAuditP29SettingsSobreDuplicado(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P2-9-SETTINGS-SOBRE-DUPLICADO';
  const aspecto = 'settings-sobre-entrada';
  const dir =
    'docs/sprints/AUDIT-P2-9-SETTINGS-SOBRE-DUPLICADO-screenshots-gauntlet';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

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
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // Passo 1: Configuracoes. Unico uso de __gauntlet.abrir no caso —
    // a tela de origem e o ponto de partida, nao o alvo do teste.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/settings');
    });
    await page.waitForTimeout(1000);

    const rodape = await page.evaluate(() => {
      function tem(label: string): boolean {
        return !!document.querySelector(`[aria-label="${label}"]`);
      }
      return {
        secaoSobre: tem('secao sobre'),
        linhaVersao: tem('linha info versão'),
        linhaBuild: tem('linha info build'),
        linhaCommit: tem('linha info commit'),
        linhaLicenca: tem('linha info licença'),
        botaoGitHub: tem('abrir repositorio no github'),
        linkTelaSobre: tem('abrir tela sobre'),
      };
    });

    const pathSettings = `${dir}/A-settings-rodape-sobre.png`;
    await page.screenshot({ path: pathSettings, fullPage: true });
    screenshots.push(pathSettings);

    const falhas: string[] = [];
    if (!rodape.secaoSobre) falhas.push('secao sobre ausente em Configuracoes');
    if (!rodape.linhaVersao) falhas.push('linha Versao ausente');
    if (!rodape.linhaBuild) falhas.push('linha Build ausente (copia local?)');
    if (!rodape.linhaCommit) falhas.push('linha Commit ausente (copia local?)');
    if (!rodape.linhaLicenca) falhas.push('linha Licenca ausente');
    if (!rodape.linkTelaSobre) {
      falhas.push('link "abrir tela sobre" ausente: rota sem entrada');
    }

    if (falhas.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: falhas.join('; '),
        screenshots,
      };
    }

    // Passo 2: chegar a tela dedicada por toque, sem bypass.
    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="abrir tela sobre"]'
      ) as HTMLElement | null;
      el?.click();
    });
    await page.waitForTimeout(1200);

    const tela = await page.evaluate(() => {
      function tem(label: string): boolean {
        return !!document.querySelector(`[aria-label="${label}"]`);
      }
      return {
        blocoSobre: tem('bloco sobre'),
        linhaBuild: tem('linha info build'),
        linhaCommit: tem('linha info commit'),
        secaoMudancas: tem('secao o que mudou'),
        nVersoes: document.querySelectorAll('[aria-label^="versao "]').length,
        creditosMusicas: tem('creditos musicas recap'),
      };
    });

    const pathSobre = `${dir}/B-tela-sobre-por-toque.png`;
    await page.screenshot({ path: pathSobre, fullPage: true });
    screenshots.push(pathSobre);

    if (!tela.blocoSobre) falhas.push('bloco sobre ausente na tela dedicada');
    if (!tela.linhaBuild) falhas.push('linha Build ausente na tela dedicada');
    if (!tela.linhaCommit) falhas.push('linha Commit ausente na tela dedicada');
    if (!tela.secaoMudancas) falhas.push('secao "O que mudou" ausente');
    if (tela.nVersoes < 1) falhas.push('RELEASE_NOTES sem nenhuma entrada');
    if (!tela.creditosMusicas) {
      falhas.push('atribuicao CC BY 4.0 das trilhas do Recap ausente');
    }

    if (falhas.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: falhas.join('; '),
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        `rodape com Versao/Build/Commit/Licenca (github ` +
        `${rodape.botaoGitHub ? 'presente' : 'ausente: repoUrl vazio'}); ` +
        `tela sobre alcancada por toque com ${tela.nVersoes} entradas de ` +
        `changelog e creditos CC BY 4.0`,
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
