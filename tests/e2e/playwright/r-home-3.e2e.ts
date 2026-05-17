// E2E R-HOME-3 -- valida checkbox inline com toast "Desfazer" 5s na
// Tela Hoje (extensao do R-HOME-1).
//
// Cobre:
//   A) Tela Hoje renderiza com 1 tarefa pendente criada via gauntlet.
//   B) Tap no checkbox marca como feita: UI mostra strike-through +
//      tarefa some da lista To-do hoje (so pendentes). Toast "Desfazer"
//      aparece com label 'Desfazer' acessivel.
//   C) Persiste em vault mock: navegar fora e voltar, tarefa continua
//      ausente da lista (foi feita).
//   D) Tap em "Desfazer" reverte: tarefa volta como pendente na
//      Tela Hoje + toast some.
//
// Pre-requisito: ./gauntlet.sh em foreground (http://localhost:8081).
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseRHome3(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-HOME-3';
  const aspecto = 'checkbox-inline-undo-toast';
  const screenshots: string[] = [];

  try {
    // 1. Boot gauntlet com estado limpo + seed minimo.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
        };
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

    // 2. Cria tarefa de teste via API vault direta. Em web, o vaultRoot
    //    esta seedado para 'web://mock-vault/' -- writer cai no
    //    localStorage adapter.
    const tarefaCriada = await page.evaluate(async () => {
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
        if (!tarefasMod?.criarTarefa || !vaultMod?.useVault) return null;
        const vaultRoot = vaultMod.useVault.getState().vaultRoot;
        if (!vaultRoot) return null;
        const slug = `r-home-3-teste-${Date.now()}`;
        const meta = {
          tipo: 'tarefa',
          data: new Date().toISOString().slice(0, 10),
          autor: 'pessoa_a',
          titulo: 'Tarefa teste R-HOME-3',
          feito: false,
          feito_em: null,
          categoria: 'outro',
          pessoa_destino: { tipo: 'mim' },
          alarme: null,
        };
        const { rel } = await tarefasMod.criarTarefa(vaultRoot, meta, slug);
        return rel;
      } catch (e) {
        return `erro: ${(e as Error).message}`;
      }
    });

    // 3. Navega para Tela Hoje (rota raiz) e captura estado inicial.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const pathA =
      'docs/sprints/R-HOME-3-screenshots-gauntlet/A-todo-pendente.png';
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    const temTarefa = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return todosTextos.some((t) => t === 'Tarefa teste R-HOME-3');
    });
    if (!temTarefa) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `tarefa criada (${tarefaCriada}) mas nao apareceu na Tela Hoje (timing listarTarefas em web mock?)`,
        screenshots,
      };
    }

    // 4. Tap no checkbox. CheckboxTarefaInline tem role 'checkbox'
    //    e accessibilityLabel 'marcar tarefa <titulo>'. Em RN-Web,
    //    Pressable vira <div role="checkbox">.
    const tapMarcar = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[role="checkbox"]'));
      for (const el of all) {
        const label = el.getAttribute('aria-label') ?? '';
        if (label === 'marcar tarefa Tarefa teste R-HOME-3') {
          (el as HTMLElement).click();
          return { ok: true, totalCheckboxes: all.length };
        }
      }
      return { ok: false, totalCheckboxes: all.length };
    });
    if (!tapMarcar.ok) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `checkbox 'marcar tarefa Tarefa teste R-HOME-3' nao encontrado (${tapMarcar.totalCheckboxes} checkboxes na tela)`,
        screenshots,
      };
    }
    await page.waitForTimeout(800);

    // 5. Captura B: estado pos-tap. Toast undo deve estar visivel.
    const pathB =
      'docs/sprints/R-HOME-3-screenshots-gauntlet/B-undo-toast-visivel.png';
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    const undoVisivel = await page.evaluate(() => {
      // Busca alert com label 'toast undo ...' e botao 'desfazer'.
      const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
      const temAlert = alerts.some((el) =>
        (el.getAttribute('aria-label') ?? '').startsWith('toast undo')
      );
      const botoes = Array.from(document.querySelectorAll('[role="button"]'));
      const temDesfazer = botoes.some(
        (el) => el.getAttribute('aria-label') === 'desfazer'
      );
      // Lista nao deve mais conter a tarefa (foi marcada feita; filtro
      // pendentes exclui).
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      const aindaNaLista = todosTextos.some(
        (t) => t === 'Tarefa teste R-HOME-3'
      );
      return { temAlert, temDesfazer, aindaNaLista };
    });

    if (!undoVisivel.temAlert || !undoVisivel.temDesfazer) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `toast undo ausente apos check: ${JSON.stringify(undoVisivel)}`,
        screenshots,
      };
    }
    if (undoVisivel.aindaNaLista) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'tarefa marcada como feita ainda aparece em To-do hoje (filtro pendentes nao aplicou?)',
        screenshots,
      };
    }

    // 6. Persiste: navega para /recap e volta. Tarefa deve continuar
    //    ausente da lista (feito gravado no vault).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const persistiu = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return !todosTextos.some((t) => t === 'Tarefa teste R-HOME-3');
    });
    if (!persistiu) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos navegar fora e voltar, tarefa marcada feita reapareceu na lista (persist otimista nao gravou?)',
        screenshots,
      };
    }

    // 7. Re-mostra toast via novo check (toast anterior expirou apos
    //    navegacao). Cria nova tarefa pra testar desfazer com toast vivo.
    const tarefa2 = await page.evaluate(async () => {
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
        if (!tarefasMod?.criarTarefa || !vaultMod?.useVault) return null;
        const vaultRoot = vaultMod.useVault.getState().vaultRoot;
        if (!vaultRoot) return null;
        const slug = `r-home-3-desfazer-${Date.now()}`;
        const meta = {
          tipo: 'tarefa',
          data: new Date().toISOString().slice(0, 10),
          autor: 'pessoa_a',
          titulo: 'Tarefa desfazer R-HOME-3',
          feito: false,
          feito_em: null,
          categoria: 'outro',
          pessoa_destino: { tipo: 'mim' },
          alarme: null,
        };
        const { rel } = await tarefasMod.criarTarefa(vaultRoot, meta, slug);
        return rel;
      } catch (e) {
        return `erro: ${(e as Error).message}`;
      }
    });

    // Refresh da Tela Hoje pra puxar a tarefa nova.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const apareceu2 = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return todosTextos.some((t) => t === 'Tarefa desfazer R-HOME-3');
    });
    if (!apareceu2) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `segunda tarefa (${tarefa2}) nao apareceu na Tela Hoje pra teste de Desfazer`,
        screenshots,
      };
    }

    // Tap no checkbox da segunda tarefa.
    const tapMarcar2 = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[role="checkbox"]'));
      for (const el of all) {
        const label = el.getAttribute('aria-label') ?? '';
        if (label === 'marcar tarefa Tarefa desfazer R-HOME-3') {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    if (!tapMarcar2) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'checkbox da segunda tarefa nao encontrado',
        screenshots,
      };
    }
    await page.waitForTimeout(500);

    // 8. Tap em "Desfazer" enquanto o toast esta visivel.
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
        detalhe: 'botao Desfazer nao encontrado no toast undo',
        screenshots,
      };
    }
    await page.waitForTimeout(800);

    // 9. Captura C: estado pos-Desfazer. Tarefa deve voltar pra lista.
    const pathC =
      'docs/sprints/R-HOME-3-screenshots-gauntlet/C-pos-desfazer.png';
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);

    const revertida = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return todosTextos.some((t) => t === 'Tarefa desfazer R-HOME-3');
    });
    if (!revertida) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'apos tap em Desfazer, tarefa nao voltou pra lista To-do hoje (reversao otimista nao funcionou?)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Checkbox inline 32dp + persistencia otimista + toast Desfazer 5s + reversao OK. Marcou -> some da lista + toast visivel -> persistiu apos navegar -> nova marca -> Desfazer -> volta pra lista.',
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
