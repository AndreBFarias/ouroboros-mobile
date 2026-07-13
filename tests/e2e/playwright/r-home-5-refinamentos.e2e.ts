// E2E R-HOME-5 -- refinamentos da Tela Hoje (family R-HOME-4).
//
// Cobre:
//   A) B4 stacking: apos marcar uma tarefa do To-do hoje, o toast
//      "Desfazer" aparece POR CIMA dos cards do feed. Prova: alem de
//      existir (role alert, aria-label iniciado por 'toast undo'),
//      document.elementFromPoint no CENTRO do balao devolve o proprio
//      balao (ou um descendente), nao um card atras -- e o botao
//      "Desfazer" (role button, label 'desfazer') tambem responde no
//      seu centro. Screenshot A-balao-por-cima.png.
//   B) N2 navegacao: o cabecalho "To-do hoje" ganhou o ">" (role button,
//      label 'abrir tarefas'). Tap nele abre a lista completa /todo
//      (URL /todo ou Header "Tarefas"). Screenshot B-abre-todo.png.
//
// Pre-requisito: ./gauntlet.sh em foreground (http://localhost:8081).
//
// Comentarios sem acento (convencao shell/CI).
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

// Cria uma tarefa pendente de HOJE via gauntlet (criarTarefaMock reusa o
// criarTarefa real; em web o writer cai no useVaultMock). O titulo vem de
// globalThis.__rhome5 (a interface minima de evaluate nao aceita
// argumentos de closure). Retorna o rel criado ou uma string de erro.
async function criarTarefaHoje(
  page: PlaywrightPageLike
): Promise<string | null> {
  return page.evaluate(async () => {
    try {
      const w = globalThis as unknown as {
        __gauntlet?: {
          criarTarefaMock: (
            meta?: Record<string, unknown>
          ) => Promise<{ rel: string } | null>;
        };
        __rhome5?: { titulo: string; slugPrefixo: string };
      };
      if (!w.__gauntlet?.criarTarefaMock) return null;
      const titulo = w.__rhome5?.titulo ?? 'Tarefa R-HOME-5';
      const r = await w.__gauntlet.criarTarefaMock({ titulo });
      return r?.rel ?? null;
    } catch (e) {
      return `erro: ${(e as Error).message}`;
    }
  });
}

export default async function caseRHome5(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-HOME-5';
  const aspecto = 'toast-por-cima-e-chevron-todo';
  const screenshots: string[] = [];
  const dir = 'docs/sprints/R-HOME-5-screenshots-gauntlet';

  try {
    // 1. Boot gauntlet limpo + seed.
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

    // 2. Parametros da tarefa A no escopo global (evaluate nao recebe args).
    await page.evaluate(() => {
      (globalThis as unknown as { __rhome5?: unknown }).__rhome5 = {
        titulo: 'Tarefa stacking R-HOME-5',
        slugPrefixo: 'r-home-5-stack',
      };
    });
    const tarefaA = await criarTarefaHoje(page);

    // 3. Abrir a Tela Hoje e confirmar que a tarefa apareceu.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const temTarefa = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return textos.some((t) => t === 'Tarefa stacking R-HOME-5');
    });
    if (!temTarefa) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `tarefa A criada (${tarefaA}) mas nao apareceu na Tela Hoje (timing web mock?)`,
        screenshots,
      };
    }

    // 4. Marcar a tarefa (checkbox role 'checkbox', label 'marcar tarefa X').
    const tapMarcar = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[role="checkbox"]'));
      for (const el of all) {
        if (
          (el.getAttribute('aria-label') ?? '') ===
          'marcar tarefa Tarefa stacking R-HOME-5'
        ) {
          (el as HTMLElement).click();
          return { ok: true, total: all.length };
        }
      }
      return { ok: false, total: all.length };
    });
    if (!tapMarcar.ok) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `checkbox da tarefa A nao encontrado (${tapMarcar.total} checkboxes)`,
        screenshots,
      };
    }
    await page.waitForTimeout(800);

    const pathA = `${dir}/A-balao-por-cima.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    // 5. Assert B4: o toast esta POR CIMA (elementFromPoint no centro
    //    devolve o balao ou um descendente) e o Desfazer responde.
    const stacking = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
      const toast = alerts.find((el) =>
        (el.getAttribute('aria-label') ?? '').startsWith('toast undo')
      ) as HTMLElement | undefined;
      if (!toast) return { ok: false, motivo: 'toast ausente' };
      const r = toast.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2);
      const cy = Math.round(r.top + r.height / 2);
      const topo = document.elementFromPoint(cx, cy);
      const porCima = !!topo && (topo === toast || toast.contains(topo));

      const botoes = Array.from(document.querySelectorAll('[role="button"]'));
      const desfazer = botoes.find(
        (el) => el.getAttribute('aria-label') === 'desfazer'
      ) as HTMLElement | undefined;
      let desfazerClicavel = false;
      if (desfazer) {
        const rb = desfazer.getBoundingClientRect();
        const bx = Math.round(rb.left + rb.width / 2);
        const by = Math.round(rb.top + rb.height / 2);
        const topoB = document.elementFromPoint(bx, by);
        desfazerClicavel =
          !!topoB && (topoB === desfazer || desfazer.contains(topoB));
      }
      return {
        ok: porCima && desfazerClicavel,
        porCima,
        desfazerClicavel,
        temDesfazer: !!desfazer,
      };
    });
    if (!stacking.ok) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `toast nao esta por cima ou Desfazer coberto: ${JSON.stringify(stacking)}`,
        screenshots,
      };
    }

    // 6. N2: criar tarefa B pendente para o card To-do hoje reaparecer
    //    (a A foi concluida) e o cabecalho com ">" ficar visivel.
    await page.evaluate(() => {
      (globalThis as unknown as { __rhome5?: unknown }).__rhome5 = {
        titulo: 'Tarefa chevron R-HOME-5',
        slugPrefixo: 'r-home-5-chevron',
      };
    });
    await criarTarefaHoje(page);
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    // 7. Tap no ">" do cabecalho To-do hoje (role button, label
    //    'abrir tarefas'). Sem "e mais N" no seed (0 rollover), e o unico.
    const tapChevron = await page.evaluate(() => {
      const botoes = Array.from(document.querySelectorAll('[role="button"]'));
      const alvo = botoes.find(
        (el) => el.getAttribute('aria-label') === 'abrir tarefas'
      ) as HTMLElement | undefined;
      if (!alvo) return { ok: false, total: botoes.length };
      alvo.click();
      return { ok: true, total: botoes.length };
    });
    if (!tapChevron.ok) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cabecalho To-do hoje sem ">" (role button 'abrir tarefas' ausente; ${tapChevron.total} botoes)`,
        screenshots,
      };
    }
    await page.waitForTimeout(1200);

    const pathB = `${dir}/B-abre-todo.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    const navegou = await page.evaluate(() => {
      const path =
        (globalThis as unknown as { location?: { pathname?: string } }).location
          ?.pathname ?? '';
      const temHeaderTarefas = Array.from(document.querySelectorAll('*')).some(
        (el) => (el.textContent ?? '').trim() === 'Tarefas'
      );
      return { path, temHeaderTarefas, ok: path.includes('todo') || temHeaderTarefas };
    });
    if (!navegou.ok) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tap no ">" nao abriu /todo: ${JSON.stringify(navegou)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'B4 OK: toast "Desfazer" por cima do feed (elementFromPoint no centro devolve o balao) e Desfazer clicavel. N2 OK: ">" do cabecalho To-do hoje abre /todo.',
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
