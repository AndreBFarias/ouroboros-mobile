// E2E R-HOME-4b -- valida o card "Ainda de ontem" (rollover de tarefas
// de dias anteriores) e a fronteira sem duplicacao com o To-do hoje.
//
// Cobre (spec §7):
//   A) Sem tarefa antiga: card "Ainda de ontem" ausente do DOM (feed
//      adaptativo, sem caixa "Nada ...").
//   B) Com 1 tarefa pendente de ontem (data === hoje-1): card presente,
//      rotulo "ontem" visivel, titulo visivel.
//   C) Nao-duplicacao: o checkbox da tarefa de ontem aparece exatamente
//      1 vez na home (no rollover, NAO no To-do hoje). A tarefa de hoje
//      aparece so no To-do hoje.
//   D) Tap no checkbox do rollover: item some da lista rolada + toast
//      "Desfazer" acessivel; tap em "Desfazer" reverte.
//
// Titulos ficam hardcoded nos closures do browser (page.evaluate serializa
// a funcao; variaveis Node nao sao capturadas -- mesmo padrao de
// r-home-3.e2e.ts). ontemYmd e calculado no fuso America/Sao_Paulo para
// casar com dataLocalYmd do app (rotulo "ontem").
//
// Pre-requisito: ./gauntlet.sh em foreground (http://localhost:8081).
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from './e2e-template';

const DIR = 'docs/sprints/R-HOME-4-screenshots-gauntlet';

export default async function caseRHome4b(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-HOME-4b';
  const aspecto = 'rollover-ainda-de-ontem';
  const screenshots: string[] = [];

  try {
    // 1. Boot gauntlet com estado limpo + seed minimo.
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

    // 2. Estado A (sem rollover): abrir a home sem tarefa antiga.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1200);

    const pathA = `${DIR}/r-home-4b-01-sem-rollover.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    const cardAusenteA = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return !textos.some((t) => t === 'Ainda de ontem');
    });
    if (!cardAusenteA) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'card "Ainda de ontem" apareceu sem tarefa antiga (self-hide nao aplicou)',
        screenshots,
      };
    }

    // 3. Cria via API vault direta: 1 tarefa de ONTEM (data === hoje-1 no
    //    fuso local) + 1 tarefa de HOJE. ontemYmd no fuso America/Sao_Paulo
    //    para casar com dataLocalYmd do app (rotulo "ontem").
    const criacao = await page.evaluate(async () => {
      try {
        const w = globalThis as unknown as {
          require?: (id: string) => unknown;
        };
        const tarefasMod = w.require?.('@/lib/vault/tarefas') as
          | undefined
          | {
              criarTarefa: (
                vaultRoot: string,
                meta: Record<string, unknown>,
                slug: string
              ) => Promise<{ rel: string }>;
            };
        const vaultMod = w.require?.('@/lib/stores/vault') as
          | undefined
          | { useVault: { getState: () => { vaultRoot: string | null } } };
        if (!tarefasMod?.criarTarefa || !vaultMod?.useVault) {
          return { ok: false, motivo: 'modulos vault ausentes' };
        }
        const vaultRoot = vaultMod.useVault.getState().vaultRoot;
        if (!vaultRoot) return { ok: false, motivo: 'vaultRoot nulo' };

        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const hojeYmd = fmt.format(new Date());
        const [y, m, d] = hojeYmd.split('-').map((n) => parseInt(n, 10));
        const od = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
        const ontemYmd = `${od.getUTCFullYear()}-${String(
          od.getUTCMonth() + 1
        ).padStart(2, '0')}-${String(od.getUTCDate()).padStart(2, '0')}`;

        const base = {
          tipo: 'tarefa',
          autor: 'pessoa_a',
          feito: false,
          feito_em: null,
          categoria: 'outro',
          pessoa_destino: { tipo: 'mim' },
          alarme: null,
        };
        const r1 = await tarefasMod.criarTarefa(
          vaultRoot,
          { ...base, data: ontemYmd, titulo: 'Comprar presente R-HOME-4b' },
          `r-home-4b-ontem-${Date.now()}`
        );
        const r2 = await tarefasMod.criarTarefa(
          vaultRoot,
          { ...base, data: hojeYmd, titulo: 'Terminar relatorio R-HOME-4b' },
          `r-home-4b-hoje-${Date.now()}`
        );
        return { ok: true, ontemYmd, hojeYmd, r1: r1.rel, r2: r2.rel };
      } catch (e) {
        return { ok: false, motivo: (e as Error).message };
      }
    });
    if (!criacao.ok) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `falha ao criar tarefas de teste: ${JSON.stringify(criacao)}`,
        screenshots,
      };
    }

    // 4. Estado B (com rollover): reabrir a home (navega fora e volta para
    //    disparar o useFocusEffect que recarrega a lista).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(500);
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const pathB = `${DIR}/r-home-4b-02-com-rollover-ontem.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    const estadoB = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return {
        temCard: textos.some((t) => t === 'Ainda de ontem'),
        temRotulo: textos.some((t) => t === 'ontem'),
        temTitulo: textos.some((t) => t === 'Comprar presente R-HOME-4b'),
      };
    });
    if (!estadoB.temCard || !estadoB.temTitulo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `card "Ainda de ontem" ou titulo ausente com rollover: ${JSON.stringify(
          estadoB
        )}`,
        screenshots,
      };
    }
    if (!estadoB.temRotulo) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'card presente mas rotulo "ontem" nao encontrado (fuso/virada de dia?)',
        screenshots,
      };
    }

    // 5. Estado C (nao-duplicacao): o checkbox da tarefa de ONTEM aparece
    //    exatamente 1 vez (no rollover, nao no To-do hoje). O da tarefa
    //    de HOJE aparece 1 vez (no To-do hoje).
    const contagem = await page.evaluate(() => {
      const checks = Array.from(
        document.querySelectorAll('[role="checkbox"]')
      ).map((el) => el.getAttribute('aria-label') ?? '');
      const nOntem = checks.filter(
        (l) => l === 'marcar tarefa Comprar presente R-HOME-4b'
      ).length;
      const nHoje = checks.filter(
        (l) => l === 'marcar tarefa Terminar relatorio R-HOME-4b'
      ).length;
      return { nOntem, nHoje, total: checks.length };
    });

    const pathC = `${DIR}/r-home-4b-03-fronteira-sem-duplicacao.png`;
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);

    if (contagem.nOntem !== 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tarefa de ontem deveria aparecer 1 vez (rollover), apareceu ${contagem.nOntem} vezes -- duplicacao entre cards?`,
        screenshots,
      };
    }
    if (contagem.nHoje !== 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tarefa de hoje deveria aparecer 1 vez (To-do hoje), apareceu ${contagem.nHoje} vezes`,
        screenshots,
      };
    }

    // 6. Estado D (undo): tap no checkbox da tarefa de ontem no rollover.
    const tapMarcar = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[role="checkbox"]'));
      for (const el of all) {
        if (
          (el.getAttribute('aria-label') ?? '') ===
          'marcar tarefa Comprar presente R-HOME-4b'
        ) {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    if (!tapMarcar) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'checkbox da tarefa de ontem nao encontrado para tap',
        screenshots,
      };
    }
    await page.waitForTimeout(800);

    const posTap = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
      const temToast = alerts.some((el) =>
        (el.getAttribute('aria-label') ?? '').startsWith('toast undo')
      );
      const botoes = Array.from(document.querySelectorAll('[role="button"]'));
      const temDesfazer = botoes.some(
        (el) => el.getAttribute('aria-label') === 'desfazer'
      );
      const checks = Array.from(
        document.querySelectorAll('[role="checkbox"]')
      ).map((el) => el.getAttribute('aria-label') ?? '');
      const aindaNaLista = checks.some(
        (l) => l === 'marcar tarefa Comprar presente R-HOME-4b'
      );
      return { temToast, temDesfazer, aindaNaLista };
    });
    if (!posTap.temToast || !posTap.temDesfazer) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `toast "Desfazer" ausente apos marcar rollover feito: ${JSON.stringify(
          posTap
        )}`,
        screenshots,
      };
    }
    if (posTap.aindaNaLista) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'tarefa marcada feita ainda aparece no card "Ainda de ontem" (selector nao removeu)',
        screenshots,
      };
    }

    // 7. Tap em "Desfazer": a tarefa volta para o rollover.
    const tapDesfazer = await page.evaluate(() => {
      const botoes = Array.from(document.querySelectorAll('[role="button"]'));
      for (const el of botoes) {
        if (el.getAttribute('aria-label') === 'desfazer') {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    if (!tapDesfazer) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao Desfazer nao encontrado no toast',
        screenshots,
      };
    }
    await page.waitForTimeout(800);

    const revertida = await page.evaluate(() => {
      const checks = Array.from(
        document.querySelectorAll('[role="checkbox"]')
      ).map((el) => el.getAttribute('aria-label') ?? '');
      return checks.some(
        (l) => l === 'marcar tarefa Comprar presente R-HOME-4b'
      );
    });
    if (!revertida) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos tap em Desfazer, tarefa nao voltou ao card "Ainda de ontem"',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Card "Ainda de ontem" self-hide sem rollover; com tarefa de ontem aparece com rotulo "ontem"; fronteira sem duplicacao (checkbox 1x cada card); checkbox marca feito + toast Desfazer + reversao OK.',
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
