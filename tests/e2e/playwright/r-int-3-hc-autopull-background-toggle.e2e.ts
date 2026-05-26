// E2E sprint R-INT-3-HC-AUTOPULL-BACKGROUND -- valida que a Tela 23
// /settings/integracoes renderiza e expoe o card Conexao Saude onde mora o
// toggle opt-in "Sincronizar em segundo plano".
//
// LIMITE CONHECIDO (documentado): o toggle so renderiza quando
// permissoes.length > 0 (HC conectado com permissoes concedidas). No Gauntlet
// web o modulo HC nativo esta ausente (verificarDisponibilidade ->
// 'unavailable'), entao a lista de permissoes fica vazia e o toggle nao
// aparece -- estado correto. Logo este E2E assere o que e' assertavel em web:
//   1. /settings/integracoes abre com header "Integrações".
//   2. Card Conexao Saude presente (aria-label "card integracao health connect").
//   3. Card Meta diaria de passos presente (regressao R-INT-3-HC-NOTIF-META).
// A validacao runtime do toggle ON->registro da task exige dev-client/APK com
// expo-task-manager + expo-background-task compilados (GATE DE BUILD NATIVO).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseHcAutopullBackgroundToggle(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-INT-3-HC-AUTOPULL-BACKGROUND';
  const aspecto = 'integracoes-toggle-background';
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
      };
    });

    const shot =
      'docs/sprints/R-INT-3-HC-AUTOPULL-BACKGROUND-screenshots-gauntlet/A-integracoes-card-hc.png';
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

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        '/settings/integracoes abre com header e card Conexao Saude (onde mora o toggle "Sincronizar em segundo plano" quando HC conectado). Toggle gated por permissoes HC nativas; validacao runtime do registro da task exige rebuild nativo.',
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
