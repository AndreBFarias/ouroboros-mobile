// E2E AUDIT-P1-7 -- os dois defeitos com superficie na UI.
//
// Caso A (item 1, Tela Hoje): alarme MENSAL configurado para um dia que
// nao e hoje nao pode aparecer no card "Proximos". O card derivava o dia
// do mes do dia de HOJE, entao um alarme do dia 5 era anunciado em todos
// os dias do mes -- enquanto a notificacao real tocava no dia certo.
// Controle na mesma tela: um alarme mensal cujo dia configurado E' hoje
// continua aparecendo (prova que o card esta vivo e a assercao negativa
// nao e vacua).
//
// Caso B (item 3, Recap): cinco marcos gravados no mesmo minuto (o que
// verificarMarcosAuto produz numa execucao: os 5 criterios saem do mesmo
// laco com o mesmo nowIso) tinham ids identicos. O id vira `key` de
// lista e `accessibilityLabel` do card, entao a duplicata e observavel
// no DOM: contamos os aria-label "conquista <id>" e exigimos que o
// numero de rotulos DISTINTOS seja igual ao numero de cards.
//
// Itens 2 (agendamento de alarme vencido) e 4 (idempotencia do sync de
// agenda) nao tem superficie no Gauntlet -- API nativa de notificacao e
// I-O de Vault. Ficam cobertos por Jest.
//
// Como executar:
//   scripts/e2e-web.sh --grep audit-p1-7-bugs-medios.e2e.ts
//
// Comentarios sem acento (convencao shell/CI).
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const DIR =
  'docs/sprints/AUDIT-P1-7-BUGS-MEDIOS-screenshots-gauntlet';
const TITULO_FORA = 'Consulta mensal outro dia';
const TITULO_HOJE = 'Consulta mensal hoje';

export default async function caseAuditP1_7(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P1-7';
  const aspecto = 'alarme-mensal-e-ids-de-conquista';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // Passo 1: vault mock limpo (sem seed) para o card "Proximos" nao
    // disputar as 3 vagas com dados de fixture, e injecao dos 2 alarmes
    // mensais + 5 marcos do mesmo minuto.
    const preparo = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          setVaultRoot: (r: string) => void;
          setOnboardingDone: (b: boolean) => void;
          estado: () => { vaultRoot: string | null };
          setArquivoMock: (uri: string, conteudo: string) => void;
        };
      };
      const g = w.__gauntlet;
      if (!g) return null;
      g.reset();
      g.setVaultRoot('web://mock-vault/Ouroboros');
      g.setOnboardingDone(true);
      const raiz = g.estado().vaultRoot ?? 'web://mock-vault/Ouroboros';

      // Relogio local BRT (-03:00) sem depender do fuso do host.
      const agoraBrt = new Date(Date.now() + -180 * 60_000);
      const horaAtual = agoraBrt.getUTCHours();
      const diaHoje = agoraBrt.getUTCDate();
      if (horaAtual >= 23) {
        return { inconclusivo: 'faltam menos de 1h para a virada do dia BRT' };
      }
      // Disparo daqui a ~1h: dentro da janela de 4h do card.
      const hh = String(horaAtual + 1).padStart(2, '0');
      const horario = `${hh}:00`;
      // Dia configurado != hoje. Meio-dia na data_unica para que
      // getDate() seja estavel em qualquer fuso do runtime.
      const diaFora = diaHoje === 5 ? 12 : 5;

      const alarmeMd = (
        slug: string,
        titulo: string,
        dia: number
      ): string =>
        [
          '---',
          'tipo: alarme',
          `slug: ${slug}`,
          `titulo: ${titulo}`,
          `horario: "${horario}"`,
          'dias_semana: []',
          'recorrencia: mensal',
          `data_unica: 2026-01-${String(dia).padStart(2, '0')}T12:00:00-03:00`,
          'tag: outro',
          'som: gentle',
          'ativo: true',
          'snooze_minutos: 5',
          'criado_em: 2026-01-01T10:00:00-03:00',
          'ultimo_disparo: null',
          'notification_ids: []',
          'snooze_id: null',
          'historico_snoozes: []',
          'silenciar_sugestao_ate: null',
          '---',
          '',
        ].join('\n');

      g.setArquivoMock(
        `${raiz}/markdown/alarme-mensal-fora-p17.md`,
        alarmeMd('mensal-fora-p17', 'Consulta mensal outro dia', diaFora)
      );
      g.setArquivoMock(
        `${raiz}/markdown/alarme-mensal-hoje-p17.md`,
        alarmeMd('mensal-hoje-p17', 'Consulta mensal hoje', diaHoje)
      );

      // 5 marcos com o MESMO minuto e descricoes distintas -- retrato
      // fiel de uma execucao de verificarMarcosAuto.
      const y = agoraBrt.getUTCFullYear();
      const m = String(agoraBrt.getUTCMonth() + 1).padStart(2, '0');
      const d = String(diaHoje).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;
      const dataMarco = `${ymd}T10:15:00-03:00`;
      const descricoes = [
        'Tres treinos nesta semana.',
        'Voltou apos 6 dias parados.',
        'Sete dias acompanhando.',
        'Trinta dias sem gatilho.',
        'Primeira conquista desta semana.',
      ];
      descricoes.forEach((descricao, i) => {
        const md = [
          '---',
          'tipo: marco',
          `data: ${dataMarco}`,
          'autor: pessoa_a',
          `descricao: ${descricao}`,
          'tags: []',
          'auto: true',
          'origem: client',
          'para:',
          '  tipo: mim',
          '---',
          '',
        ].join('\n');
        g.setArquivoMock(`${raiz}/markdown/marco-${ymd}-criterio-${i}.md`, md);
      });

      return { horario, diaFora, diaHoje, marcos: descricoes.length };
    });

    if (preparo === null) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente; EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }
    if ('inconclusivo' in preparo) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `janela de execucao invalida: ${preparo.inconclusivo}`,
        screenshots,
      };
    }

    // Caso A: Tela Hoje.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/');
    });
    await page.waitForTimeout(5000);

    const home = await page.evaluate(() => {
      const txt = document.body.innerText;
      return {
        fora: txt.includes('Consulta mensal outro dia'),
        hoje: txt.includes('Consulta mensal hoje'),
      };
    });

    const pathHome = `${DIR}/A-proximos-sem-alarme-mensal-de-outro-dia.png`;
    await page.screenshot({ path: pathHome, fullPage: true });
    screenshots.push(pathHome);

    if (!home.hoje) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          `o alarme de controle (dia ${preparo.diaHoje}, ${preparo.horario}) nao apareceu no card "Proximos"; ` +
          'sem ele a assercao negativa do caso A seria vacua.',
        screenshots,
      };
    }
    if (home.fora) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          `alarme mensal do dia ${preparo.diaFora} apareceu em "Proximos" no dia ${preparo.diaHoje} ` +
          '(bug do item 1: o card usava o dia de hoje no lugar do dia configurado).',
        screenshots,
      };
    }

    // Caso B: Recap, secao Conquistas.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/recap');
    });
    await page.waitForTimeout(6000);

    const recap = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('[aria-label^="conquista "]')
      );
      const labels = nodes.map((n) => n.getAttribute('aria-label') ?? '');
      return { total: labels.length, distintos: new Set(labels).size };
    });

    const pathRecap = `${DIR}/B-recap-conquistas-ids-distintos.png`;
    await page.screenshot({ path: pathRecap, fullPage: true });
    screenshots.push(pathRecap);

    if (recap.total === 0) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'nenhum card de conquista renderizado no Recap; os 5 marcos injetados nao chegaram na secao (periodo ou leitura do vault mock).',
        screenshots,
      };
    }
    if (recap.distintos !== recap.total) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          `Recap renderizou ${recap.total} conquistas com apenas ${recap.distintos} ids distintos ` +
          '(bug do item 3: key duplicada no React).',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        `Home: alarme mensal do dia ${preparo.diaFora} fora do card "Proximos" no dia ${preparo.diaHoje}, ` +
        `controle do dia ${preparo.diaHoje} presente. ` +
        `Recap: ${recap.total} conquistas com ${recap.distintos} ids distintos.`,
      screenshots,
    };
  } catch (err) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `excecao: ${(err as Error).message}`,
      screenshots,
    };
  }
}
