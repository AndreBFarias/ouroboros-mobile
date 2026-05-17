// E2E R-HOME-2 -- secao Proximos mescla agenda Google + alarmes locais.
//
// Cenarios cobertos:
//   1. Fixture 2 eventos + 1 alarme -- ordem temporal correta.
//      Eventos sao injetados direto no vaultMock (in-memory) para
//      simular o cache do OAuth Calendar sync sem precisar de rede.
//      Alarmes vem do seed default + adicionados via vaultMock.
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
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: {
          reset: () => void;
          seed: () => void;
          setOnboardingDone: (b: boolean) => void;
        };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setOnboardingDone(true);

      // Injeta eventos diretamente no vaultMock simulando cache OAuth.
      // Eventos: 08:30 (Cafe da manha), 11:00 (Reuniao).
      // Alarme: 09:30 (Medicacao).
      // Resultado esperado em ordem: Cafe, Medicacao, Reuniao.
      const wMock = globalThis as unknown as {
        useVaultMock?: {
          getState: () => {
            setArquivo: (uri: string, conteudo: string) => void;
          };
        };
      };
      if (!wMock.useVaultMock) return;
      const setArquivo = wMock.useVaultMock.getState().setArquivo;
      const VAULT = 'web://mock-vault/Ouroboros';
      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const dia = String(agora.getDate()).padStart(2, '0');
      const ymd = `${ano}-${mes}-${dia}`;

      // Calcula hora atual em BRT (offset -03:00). Para o teste
      // funcionar deterministico mesmo em diferentes TZs do host
      // do CI, usamos hora local + 1h, +1.5h, +3h.
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

      // Evento 1: 30 min no futuro.
      const ev1Inicio = isoBRT(0, 30);
      const ev1Frontmatter = [
        '---',
        'id: ev-cafe',
        'pessoa: pessoa_a',
        'titulo: Cafe da manha',
        `inicio: ${ev1Inicio}`,
        `fim: ${isoBRT(1, 30)}`,
        'fonte: google_calendar',
        `sincronizado_em: ${isoBRT(-1)}`,
        '---',
        '',
      ].join('\n');
      setArquivo(
        `${VAULT}/markdown/agenda-pessoa_a-${ymd}-ev-cafe.md`,
        ev1Frontmatter
      );

      // Evento 2: 3h no futuro (ainda dentro janela 4h).
      const ev2Inicio = isoBRT(3);
      const ev2Frontmatter = [
        '---',
        'id: ev-reuniao',
        'pessoa: pessoa_a',
        'titulo: Reuniao tarde',
        `inicio: ${ev2Inicio}`,
        `fim: ${isoBRT(4)}`,
        'fonte: google_calendar',
        `sincronizado_em: ${isoBRT(-1)}`,
        '---',
        '',
      ].join('\n');
      setArquivo(
        `${VAULT}/markdown/agenda-pessoa_a-${ymd}-ev-reuniao.md`,
        ev2Frontmatter
      );

      // Alarme: 1.5h no futuro (entre os dois eventos).
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
      setArquivo(`${VAULT}/markdown/alarmes-medicacao.md`, alarmeFm);
    });

    await page.goto('http://localhost:8081/');
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

    const path1 = 'docs/sprints/R-HOME-2-screenshots-gauntlet/A-mescla-3-itens.png';
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
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: {
          reset: () => void;
          seed: () => void;
          setOnboardingDone: (b: boolean) => void;
        };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setOnboardingDone(true);

      // Sem eventos no vaultMock. Apenas alarme.
      const wMock = globalThis as unknown as {
        useVaultMock?: {
          getState: () => {
            setArquivo: (uri: string, conteudo: string) => void;
          };
        };
      };
      if (!wMock.useVaultMock) return;
      const setArquivo = wMock.useVaultMock.getState().setArquivo;
      const VAULT = 'web://mock-vault/Ouroboros';
      const agora = new Date();
      const alarmeHora = (() => {
        const t = new Date(agora.getTime() + 60 * 60_000);
        const local = new Date(t.getTime() + -180 * 60_000);
        const hh = String(local.getUTCHours()).padStart(2, '0');
        const mm = String(local.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      })();
      const fm = [
        '---',
        'tipo: alarme',
        'slug: agua',
        'titulo: Tomar água',
        `horario: ${alarmeHora}`,
        'recorrencia: diaria',
        'dias_semana: []',
        'tag: hidratacao',
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
      setArquivo(`${VAULT}/markdown/alarmes-agua.md`, fm);
    });

    await page.goto('http://localhost:8081/');
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
