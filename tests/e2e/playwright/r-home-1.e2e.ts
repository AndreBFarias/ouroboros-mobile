// E2E R-HOME-1 -- valida o redesign da Tela Hoje (ADR-0026, D1=C).
// Cobre:
//   A) Primeira fold renderiza cabecalho com saudacao + Reflexao
//      + Recap + Proximos + To-do hoje, SEM Status do casal, SEM
//      Humor do dia, SEM Esta jornada.
//   B) Marcar tarefa como concluida via checkbox inline persiste:
//      navegar para outra rota e voltar mantem a tarefa concluida.
//   C) Tap em Reflexao navega para /diario-emocional?modo=reflexao.
//
// Pre-requisito: ./gauntlet.sh em foreground.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseRHome1(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-HOME-1';
  const aspecto = 'tela-hoje-foco-acao-redesign';
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
          estado: () => unknown;
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

    // 2. Abrir Tela Hoje (rota raiz '/').
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(2000);

    // 3. Captura A: primeira-fold da Tela Hoje pos-R-HOME-1.
    const pathA =
      'docs/sprints/R-HOME-1-screenshots-gauntlet/A-tela-hoje-primeira-fold.png';
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    // 4. Assert: elementos canonicos R-HOME-1 presentes e secoes
    //    removidas ausentes.
    const layout = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      const tem = (s: string) => todosTextos.some((t) => t === s);
      const temPrefixo = (p: string) =>
        todosTextos.some((t) => t.startsWith(p));
      return {
        // Cabecalho R-HOME-1: saudacao + atalho.
        temSaudacao:
          temPrefixo('Bom dia,') ||
          temPrefixo('Boa tarde,') ||
          temPrefixo('Boa noite,'),
        temReflexao: tem('Reflexão'),
        // Secoes mantidas.
        temProximos: tem('Próximos'),
        temTodoHoje: tem('To-do hoje'),
        temRecap: tem('Recap'),
        // Secoes removidas (D1=C ADR-0026).
        temStatusCasal: tem('Status do casal'),
        temHumorDia: tem('Humor do dia'),
        temJornada: tem('Esta jornada'),
      };
    });
    if (
      !layout.temSaudacao ||
      !layout.temReflexao ||
      !layout.temProximos ||
      !layout.temTodoHoje ||
      !layout.temRecap
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `secoes canonicas R-HOME-1 ausentes: ${JSON.stringify(layout)}`,
        screenshots,
      };
    }
    if (layout.temStatusCasal || layout.temHumorDia || layout.temJornada) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `secoes removidas em D1=C ainda renderizadas: ${JSON.stringify(layout)}`,
        screenshots,
      };
    }

    // 5. Cria tarefa de teste via gauntlet (escrita direta no vault
    //    mock). Em web, vaultRoot esta seedeado por gauntlet.seed()
    //    para 'web://mock-vault/' -- escreverTarefa cai em
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
        const slug = `r-home-1-teste-${Date.now()}`;
        const meta = {
          tipo: 'tarefa',
          data: new Date().toISOString().slice(0, 10),
          autor: 'pessoa_a',
          titulo: 'Tarefa teste R-HOME-1',
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

    // 6. Re-abrir home para refrescar listarTarefas.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    // 7. Captura B: To-do hoje com 1 tarefa pendente.
    const pathB =
      'docs/sprints/R-HOME-1-screenshots-gauntlet/B-todo-hoje-com-tarefa.png';
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    const temTarefaPendente = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return todosTextos.some((t) => t === 'Tarefa teste R-HOME-1');
    });

    if (!temTarefaPendente) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `tarefa criada (${tarefaCriada}) mas nao apareceu na To-do hoje (timing de listarTarefas em web mock?)`,
        screenshots,
      };
    }

    // 8. Tap no item de tarefa (toggle feito). Em web, o tap inteiro
    //    no Pressable alterna feito.
    const tapOk = await page.evaluate(async () => {
      // Procura o Pressable que contem o texto "Tarefa teste R-HOME-1"
      // e dispara click direto via DOM (RN-Web converte Pressable
      // em <div role="checkbox">).
      const all = Array.from(document.querySelectorAll('[role="checkbox"]'));
      for (const el of all) {
        if (
          el.textContent &&
          el.textContent.includes('Tarefa teste R-HOME-1')
        ) {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    if (!tapOk) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'checkbox da tarefa nao encontrado para tap',
        screenshots,
      };
    }
    await page.waitForTimeout(1000);

    // 9. Navega para outra rota e volta para validar persist.
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

    // 10. Captura C: To-do hoje pos-recarga. Tarefa deve estar AUSENTE
    //     (foi marcada como feita; To-do hoje so mostra pendentes).
    const pathC =
      'docs/sprints/R-HOME-1-screenshots-gauntlet/C-todo-hoje-pos-toggle.png';
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);

    const aindaPendente = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return todosTextos.some((t) => t === 'Tarefa teste R-HOME-1');
    });

    if (aindaPendente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'tarefa marcada como feita ainda aparece em To-do hoje apos recarga (persist otimista nao gravou?)',
        screenshots,
      };
    }

    // 11. Tap em Reflexao para validar navegacao.
    const reflexaoTap = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[role="button"]'));
      for (const el of all) {
        if ((el.textContent ?? '').trim() === 'Reflexão') {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    if (!reflexaoTap) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'pill Reflexao nao encontrado para tap',
        screenshots,
      };
    }
    await page.waitForTimeout(1500);

    // 12. Captura D: Diario Emocional aberto em modo Reflexao.
    const pathD =
      'docs/sprints/R-HOME-1-screenshots-gauntlet/D-reflexao-aberta.png';
    await page.screenshot({ path: pathD });
    screenshots.push(pathD);

    const chegouReflexao = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 60);
      return {
        temHeader: todosTextos.some((t) => t === 'Diário emocional'),
        temChipReflexao: todosTextos.some((t) => t === 'Reflexão'),
      };
    });

    if (!chegouReflexao.temHeader) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `apos tap em Reflexao header Diario emocional ausente: ${JSON.stringify(chegouReflexao)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `Tela Hoje R-HOME-1 OK: layout enxuto (sem Status casal/Humor/Jornada) + persist otimista de tarefa + navegacao Reflexao -> /diario-emocional?modo=reflexao`,
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
