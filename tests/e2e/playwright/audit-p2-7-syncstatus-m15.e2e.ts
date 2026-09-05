// Caso E2E AUDIT-P2-7-SYNCSTATUS-M15: o card de status de sync do Vault
// existe na secao "Pasta atual" de /settings/vault e muda de estado
// conforme o vault mock esta configurado ou nao.
//
// Estrutura copiada de tests/e2e/playwright/e2e-template.ts. Executado
// via automacao de browser no Gauntlet, nao por Jest (jest.config
// testMatch filtra *.test.ts).
//
// DUAS ARMADILHAS DESTE CASO, ambas verificadas no codigo do Gauntlet
// antes de escrever o arquivo:
//
//   1. Nao da' para usar `__gauntlet.reset()` como o estado "sem pasta".
//      reset() poe onboarding.done = false (src/lib/dev/gauntlet.ts:323)
//      e o OnboardingGuard (app/_layout.tsx), com MODO_DEV_WEB ligado no
//      Gauntlet, reage a essa dependencia chamando autoSeedDev(), que
//      reaplica o seed e devolve vaultRoot = 'web://mock-vault/Ouroboros'.
//      O screenshot "sem pasta" sairia com a pasta seedada. Caminho
//      usado aqui: seed() primeiro (done = true, guard silencioso) e
//      depois setVaultRoot(null) para zerar so' o vault.
//      `seed({ vaultRoot: null })` NAO serve: o `??` de gauntlet.ts:292
//      substitui null pelo default.
//
//   2. Nao recarregar a pagina entre os dois estados. O seed usa
//      setState direto e bypassa o persist -- reload perde tudo
//      (documentado em gauntlet.ts:295-297). Como o card e alimentado
//      por useEffect com dependencia [vaultRoot], mudar o store ja'
//      re-renderiza sozinho.
//
// Assert de TEXTO, nunca de COR: em web verificarSyncStatus devolve
// sempre 'desconhecido' (syncStatus.ts:43 checa Platform.OS === 'web'),
// entao a cor e a mesma com e sem pasta. O que distingue os dois
// estados na web e a copy. A heuristica de mtime real e a de
// .stversions/ so' sao observaveis em Nivel B (emulador) ou C (celular).
//
// Comentarios sem acento (convencao shell/CI).

import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

interface GauntletWeb {
  seed: () => void;
  reset: () => void;
  setVaultRoot: (root: string | null) => void;
  abrir: (rota: string) => Promise<unknown>;
}

const DIR_SHOTS = 'docs/sprints/AUDIT-P2-7-SYNCSTATUS-M15-screenshots-gauntlet';

export default async function case_audit_p2_7_syncstatus_m15(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P2-7-SYNCSTATUS-M15';
  const aspecto = 'card-status-sync-vault';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Seed deterministico. reset() antes so' para isolar os demais
    //    stores; o estado "sem pasta" e produzido no passo 4.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletWeb };
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

    // 3. Abrir a sub-tela do Vault (navegacao interna, sem page.goto).
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletWeb };
      await w.__gauntlet.abrir('/settings/vault');
    });
    await page.waitForTimeout(1200);

    // 4. Estado A: com pasta configurada. Em web o servico devolve
    //    'desconhecido', entao a copy esperada e a de plataforma.
    const comPasta = await page.evaluate(() =>
      document.body.innerText.includes(
        'Sincronização indisponível nesta plataforma.'
      )
    );
    const shotComPasta = `${DIR_SHOTS}/01-com-pasta.png`;
    await page.screenshot({ path: shotComPasta });
    screenshots.push(shotComPasta);
    if (!comPasta) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Com vaultRoot seedado, o card de status nao apareceu na secao "Pasta atual".',
        screenshots,
      };
    }

    // 5. Estado B: zerar so' o vaultRoot. O useEffect do bloco reage a
    //    dependencia [vaultRoot] e troca a copy sem reload.
    await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet: GauntletWeb };
      w.__gauntlet.setVaultRoot(null);
    });
    await page.waitForTimeout(800);

    const semPasta = await page.evaluate(() =>
      document.body.innerText.includes('Sem pasta para verificar.')
    );
    const shotSemPasta = `${DIR_SHOTS}/02-sem-pasta.png`;
    await page.screenshot({ path: shotSemPasta });
    screenshots.push(shotSemPasta);
    if (!semPasta) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Sem vaultRoot, o card nao trocou para a copy de pasta ausente.',
        screenshots,
      };
    }

    // 6. Guarda da lacuna 3 do ceticismo: a copy do card tem que ser
    //    distinta da do BlocoPathAtual, senao query por texto casa dois
    //    nos e o assert vira ambiguo.
    const copiesDistintas = await page.evaluate(() => {
      const t = document.body.innerText;
      return (
        t.includes('Nenhuma pasta configurada.') &&
        t.includes('Sem pasta para verificar.')
      );
    });
    if (!copiesDistintas) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Card e bloco de path deveriam ter copies distintas na mesma secao.',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Card de status de sync renderizado em /settings/vault e reagindo a troca de vaultRoot.',
      screenshots,
    };
  } catch (e) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `Excecao no caso: ${String(e)}`,
      screenshots,
    };
  }
}
