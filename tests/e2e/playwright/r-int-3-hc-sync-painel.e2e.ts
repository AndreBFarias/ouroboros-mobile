// E2E sprint R-INT-3-HC-SYNC-PAINEL -- valida que a Tela 23
// /settings/integracoes renderiza o card Conexao Saude onde mora o painel
// "Sincronizacao" (status ultima sync por tipo + telemetria da ultima
// rodada + botao "Sincronizar agora").
//
// LIMITE CONHECIDO (documentado, identico ao E2E do toggle background):
// o painel so renderiza quando permissoes.length > 0 (HC conectado com
// permissoes concedidas). No Gauntlet web o modulo HC nativo esta ausente
// (verificarDisponibilidade -> 'unavailable'), entao a lista de permissoes
// fica vazia e o painel nao aparece -- estado correto. Logo este E2E
// assere o que e' assertavel em web:
//   1. /settings/integracoes abre com header "Integrações".
//   2. Card Conexao Saude presente (aria-label "card integracao health connect").
//   3. Card Meta diaria de passos presente (regressao R-INT-3-HC-NOTIF-META).
//   4. O painel de sync NAO aparece sem permissoes (gate correto).
// A validacao runtime do painel (ultima sync, telemetria, botao manual)
// e' coberta por teste de unidade que seeda o store real
// (tests/app/settings/integracoes-painel-sync.test.tsx) e exige
// dev-client/APK com HC conectado para o caminho visual completo.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseHcSyncPainel(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-INT-3-HC-SYNC-PAINEL';
  const aspecto = 'integracoes-painel-sync';
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
        detalhe: 'window.__gauntlet ausente; gauntlet nao instalado',
        screenshots,
      };
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/settings/integracoes');
    });
    await page.waitForTimeout(1500);

    const check = await page.evaluate(() => {
      return {
        temHeader: document.body.innerText.includes('Integrações'),
        temCardHC: !!document.querySelector(
          '[aria-label="card integracao health connect"]'
        ),
        temCardMeta: !!document.querySelector(
          '[aria-label="card meta de passos"]'
        ),
        // Sem permissoes HC nativas em web, o painel de sync NAO deve
        // aparecer (gate por permissoes.length > 0).
        temPainelSync: !!document.querySelector(
          '[aria-label="painel sincronizacao health connect"]'
        ),
      };
    });

    const shot =
      'docs/sprints/R-INT-3-HC-SYNC-PAINEL-screenshots-gauntlet/A-integracoes-card-hc.png';
    await page.screenshot({ path: shot });
    screenshots.push(shot);

    if (!check.temHeader || !check.temCardHC) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tela integracoes regrediu: header=${check.temHeader} cardHC=${check.temCardHC}`,
        screenshots,
      };
    }
    if (!check.temCardMeta) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'card meta de passos ausente (regressao R-INT-3-HC-NOTIF-META)',
        screenshots,
      };
    }
    if (check.temPainelSync) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'painel de sync apareceu sem permissoes HC (gate quebrado: deveria exigir permissoes.length > 0)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        '/settings/integracoes abre com header e card Conexao Saude. Painel "Sincronizacao" (ultima sync + telemetria + botao Sincronizar agora) gated por permissoes HC nativas, corretamente oculto em web. Caminho visual completo validado por teste de unidade com store real; runtime requer HC conectado em dev-client.',
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
