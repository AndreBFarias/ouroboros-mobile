// E2E R-HOME-2 -- secao Proximos mescla agenda Google + alarmes locais.
//
// Cenarios cobertos:
//   1. Fixture 2 eventos + 1 alarme -- ordem temporal correta.
//      Eventos sao injetados via __gauntlet.setEventosAgendaMock
//      (R-INFRA-GAUNTLET-AGENDA-MOCK, 2026-05-17). Alarmes sao
//      injetados via __gauntlet.setArquivoMock (mesma sprint).
//   2. Graceful fallback sem OAuth -- somente alarmes/tarefas (sem
//      eventos no vaultMock).
//
// Asserts comportamentais (nao apenas visuais):
//   - Titulo "Próximos" presente.
//   - Em (1): 3 itens (limite hard), ordem cronologica.
//   - Em (2): empty state ou somente alarmes/tarefas, sem crash de auth.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseRHome2(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-HOME-2';
  const aspecto = 'proximos-eventos-merge';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // CENARIO 1: 2 eventos agenda + 1 alarme -> 3 itens em ordem.
    // Eventos: 30min (Cafe da manha), 3h (Reuniao). Alarme: 1.5h
    // (Medicacao) entre os dois eventos. Janela hard 4h.
    // Resultado esperado em ordem: Cafe, Medicacao, Reuniao.
    //
    // IMPORTANTE: usar __gauntlet.abrir() para SPA-navigate sem
    // recarregar a pagina. page.goto() destroi o useVaultMock
    // in-memory e perde os eventos injetados.
    await page.evaluate(() => {
      type AgendaEvento = {
        id: string;
        pessoa: 'pessoa_a' | 'pessoa_b';
        titulo: string;
        inicio: string;
        fim: string;
        local?: string;
        fonte: 'google_calendar';
        sincronizado_em: string;
      };
      const w = globalThis as unknown as {
        __gauntlet: {
          reset: () => void;
          seed: () => void;
          setOnboardingDone: (b: boolean) => void;
          setEventosAgendaMock: (
            pessoa: 'pessoa_a' | 'pessoa_b',
            eventos: AgendaEvento[]
          ) => number;
          setArquivoMock: (uri: string, conteudo: string) => void;
          abrir: (rota: string) => Promise<void>;
        };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setOnboardingDone(true);

      const agora = new Date();

      // Calcula ISO BRT (offset -03:00) deterministico independente
      // do TZ do host do CI.
      const isoBRT = (offsetHoras: number, offsetMin: number = 0): string => {
        const total = new Date(
          agora.getTime() + offsetHoras * 3600_000 + offsetMin * 60_000
        );
        const local = new Date(total.getTime() + -180 * 60_000);
        const y = local.getUTCFullYear();
        const m = String(local.getUTCMonth() + 1).padStart(2, '0');
        const d = String(local.getUTCDate()).padStart(2, '0');
        const hh = String(local.getUTCHours()).padStart(2, '0');
        const mm = String(local.getUTCMinutes()).padStart(2, '0');
        return `${y}-${m}-${d}T${hh}:${mm}:00-03:00`;
      };

      // 2 eventos: 30min e 3h no futuro.
      const eventos: AgendaEvento[] = [
        {
          id: 'ev-cafe',
          pessoa: 'pessoa_a',
          titulo: 'Cafe da manha',
          inicio: isoBRT(0, 30),
          fim: isoBRT(1, 30),
          fonte: 'google_calendar',
          sincronizado_em: isoBRT(-1),
        },
        {
          id: 'ev-reuniao',
          pessoa: 'pessoa_a',
          titulo: 'Reuniao tarde',
          inicio: isoBRT(3),
          fim: isoBRT(4),
          fonte: 'google_calendar',
          sincronizado_em: isoBRT(-1),
        },
      ];
      w.__gauntlet.setEventosAgendaMock('pessoa_a', eventos);

      // Alarme 1.5h no futuro. Layout: markdown/alarmes-<slug>.md.
      const alarmeHora = (() => {
        const t = new Date(agora.getTime() + 90 * 60_000);
        const local = new Date(t.getTime() + -180 * 60_000);
        const hh = String(local.getUTCHours()).padStart(2, '0');
        const mm = String(local.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      })();
      const alarmeFm = [
        '---',
        'tipo: alarme',
        'slug: medicacao',
        'titulo: Medicação',
        `horario: ${alarmeHora}`,
        'recorrencia: diaria',
        'dias_semana: []',
        'tag: medicacao',
        'som: gentle',
        'ativo: true',
        'snooze_minutos: 5',
        `criado_em: ${isoBRT(-24)}`,
        'ultimo_disparo: null',
        'notification_ids: []',
        'snooze_id: null',
        '---',
        '',
      ].join('\n');
      const VAULT = 'web://mock-vault/Ouroboros';
      // Path canonico singular: markdown/alarme-<slug>.md (R-INFRA-
      // GAUNTLET-AGENDA-MOCK 2026-05-17 -- bug pre-existente do
      // E2E original usava plural 'alarmes-' que matchesFeaturePrefix
      // ainda casava por startsWith, mas o schema/path canonico
      // documentado em src/lib/vault/paths.ts:163 e' singular).
      w.__gauntlet.setArquivoMock(
        `${VAULT}/markdown/alarme-medicacao.md`,
        alarmeFm
      );

      // SPA navigate -- preserva useVaultMock in-memory.
      void w.__gauntlet.abrir('/');
    });

    await page.waitForTimeout(7000);

    const txtCenario1 = await page.evaluate(() => document.body.innerText);
    const temProximosTitulo = txtCenario1.includes('Próximos');
    const temCafe = txtCenario1.includes('Cafe da manha');
    const temMedicacao = txtCenario1.includes('Medicação');
    const temReuniao = txtCenario1.includes('Reuniao tarde');

    // Verifica ordem: posicao do Cafe < Medicacao < Reuniao.
    const posCafe = txtCenario1.indexOf('Cafe da manha');
    const posMedicacao = txtCenario1.indexOf('Medicação');
    const posReuniao = txtCenario1.indexOf('Reuniao tarde');
    const ordemOk =
      posCafe >= 0 &&
      posMedicacao > posCafe &&
      posReuniao > posMedicacao;

    const path1 = 'docs/sprints/R-HOME-2-screenshots-gauntlet/A-mescla-agenda-alarme.png';
    await page.screenshot({ path: path1, fullPage: true });
    screenshots.push(path1);

    if (!temProximosTitulo || !temCafe || !temMedicacao || !temReuniao) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cenario 1: proximos=${temProximosTitulo} cafe=${temCafe} medicacao=${temMedicacao} reuniao=${temReuniao}`,
        screenshots,
      };
    }
    if (!ordemOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cenario 1: ordem invalida cafe@${posCafe} medicacao@${posMedicacao} reuniao@${posReuniao}`,
        screenshots,
      };
    }

    // CENARIO 2: graceful fallback sem OAuth (sem eventos no vaultMock).
    // Apenas 1 alarme; secao mostra so esse item, sem mensagem de
    // erro de autenticacao (auth e da rota /agenda).
    //
    // Volta para /_dev/gauntlet primeiro (page.goto -- reset total
    // do vaultMock implicito ao reload), depois injeta e SPA-navigate
    // para /.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: {
          reset: () => void;
          seed: () => void;
          setOnboardingDone: (b: boolean) => void;
          setArquivoMock: (uri: string, conteudo: string) => void;
          abrir: (rota: string) => Promise<void>;
        };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setOnboardingDone(true);

      const VAULT = 'web://mock-vault/Ouroboros';
      const agora = new Date();
      const alarmeHora = (() => {
        const t = new Date(agora.getTime() + 60 * 60_000);
        const local = new Date(t.getTime() + -180 * 60_000);
        const hh = String(local.getUTCHours()).padStart(2, '0');
        const mm = String(local.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      })();
      // AlarmeTagSchema e' enum fechado ('medicacao' | 'treino' |
      // 'outro'). 'outro' cobre catch-all sem aceitar texto livre
      // -- nao podemos usar 'hidratacao' (resultaria em safeParse
      // falhando e o alarme nao seria listado).
      const fm = [
        '---',
        'tipo: alarme',
        'slug: agua',
        'titulo: Tomar água',
        `horario: ${alarmeHora}`,
        'recorrencia: diaria',
        'dias_semana: []',
        'tag: outro',
        'som: gentle',
        'ativo: true',
        'snooze_minutos: 5',
        'criado_em: 2026-05-01T08:00:00-03:00',
        'ultimo_disparo: null',
        'notification_ids: []',
        'snooze_id: null',
        '---',
        '',
      ].join('\n');
      // Path canonico singular alarme-<slug>.md (ver coment cenario 1).
      w.__gauntlet.setArquivoMock(`${VAULT}/markdown/alarme-agua.md`, fm);
      void w.__gauntlet.abrir('/');
    });

    await page.waitForTimeout(7000);

    const txtCenario2 = await page.evaluate(() => document.body.innerText);
    const temProximos2 = txtCenario2.includes('Próximos');
    const temAgua = txtCenario2.includes('Tomar água');
    const semCafe2 = !txtCenario2.includes('Cafe da manha');
    // Nao deve mostrar mensagem de erro de auth aqui (auth e da /agenda).
    const semErroAuth =
      !txtCenario2.toLowerCase().includes('erro de autentic') &&
      !txtCenario2.toLowerCase().includes('reconectar');

    const path2 = 'docs/sprints/R-HOME-2-screenshots-gauntlet/B-fallback-sem-oauth.png';
    await page.screenshot({ path: path2, fullPage: true });
    screenshots.push(path2);

    if (!temProximos2 || !temAgua || !semCafe2 || !semErroAuth) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cenario 2: proximos=${temProximos2} agua=${temAgua} semCafe=${semCafe2} semErroAuth=${semErroAuth}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        '2 cenarios PASS: mescla 2 eventos + 1 alarme em ordem cronologica + graceful fallback sem OAuth',
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
