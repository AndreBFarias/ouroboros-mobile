// E2E AUDIT-P3-6: o toast "Desfazer" da Tela Hoje renderiza a mensagem
// ACENTUADA ('Tarefa concluída'), nao a forma sem acento que o validador
// PT-BR era cego para enxergar.
//
// Cenario que originou a sprint: mostrarUndo('Tarefa concluida', ...) e
// argumento posicional de funcao -- a quarta forma canonica de uma string
// chegar a tela, e a unica que os tres padroes de
// scripts/check_strings_ui_ptbr.py nao casavam. A string vazava para o
// usuario e o smoke continuava verde.
//
// O assert forte deste caso e a IGUALDADE EXATA do texto renderizado com
// 'Tarefa concluída'. Presenca do toast nao basta: sem acento o toast
// aparece igual, e era exatamente esse o bug.
//
// Onde o assert mira (e por que nao no container): o
// UndoOverlayHost (src/lib/hooks/useToastUndo.tsx) monta UM Animated.View
// com accessibilityRole="alert" + accessibilityLabel="toast undo <msg>",
// e DENTRO dele ficam dois nos: o <Text> da mensagem e o <Text>Desfazer</Text>
// do Pressable. O textContent do container seria 'Tarefa concluídaDesfazer'
// e nunca casaria igualdade exata -- por isso a leitura mira o PRIMEIRO
// filho do container (o <Text> da mensagem).
//
// Janela de 5s: src/lib/stores/toastUndo.ts define DEFAULT_TIMEOUT_MS =
// 5000 e um timer de modulo faz o dismiss automatico; alem disso
// mostrarUndo so dispara DEPOIS que `await marcarFeito(...)` resolve. Por
// isso o clique e a leitura acontecem no MESMO page.evaluate, com poll de
// 100ms e teto de 3000ms -- folga confortavel dentro dos 5000ms, sem
// depender de round-trip do harness.
//
// Politica de status (evita FAIL flaky derrubando o run inteiro, ver
// tests/e2e/harness/e2e-runner.spec.ts): problema de AMBIENTE ou de
// timing do vault mock (gauntlet ausente, tarefa nao renderizou, toast
// nao subiu) devolve INCONCLUSIVO -- a presenca do toast ja e' gate do
// caso r-home-3. FAIL fica reservado ao unico defeito que esta sprint
// existe para pegar: o toast subiu com o texto errado.
//
// Pre-requisito: ./gauntlet.sh em foreground (http://localhost:8081).
//
// Comentarios sem acento (convencao shell/CI).
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

// Titulo sem acento de proposito: ele e' interpolado no
// accessibilityLabel do checkbox ('marcar tarefa <titulo>', ver
// src/components/tarefas/CheckboxTarefaInline.tsx), e label de leitor de
// tela segue sem acento por convencao.
const TITULO = 'Tarefa do p3-6';
const MENSAGEM_ESPERADA = 'Tarefa concluída';
const DIR_SHOTS =
  'docs/sprints/AUDIT-P3-6-VALIDADOR-PTBR-ARG-POSICIONAL-screenshots-gauntlet';

interface GauntletMinimo {
  reset: () => void;
  seed: () => void;
  abrir: (rota: string) => Promise<void>;
  criarTarefaMock: (
    meta?: Record<string, unknown>
  ) => Promise<{ rel: string } | null>;
}

interface LeituraToast {
  erro?: string;
  textoMensagem?: string;
  textoContainer?: string;
  ariaLabel?: string;
}

export default async function caseToastUndoAcentuado(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P3-6-VALIDADOR-PTBR-ARG-POSICIONAL';
  const aspecto = 'toast-undo-mensagem-acentuada';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // 1. reset() -> seed() nesta ordem: criarTarefaMock aborta com warn
    //    se o vaultRoot mock nao estiver seedado.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // 2. Tarefa pendente de hoje. Os defaults de aplicarCriarTarefaMock
    //    (data = hoje, feito = false) sao exatamente o filtro de
    //    SecaoTodoHoje, entao basta o titulo.
    const criada = await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletMinimo };
      const out = await w.__gauntlet.criarTarefaMock({
        titulo: 'Tarefa do p3-6',
      });
      return out?.rel ?? null;
    });
    if (!criada) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'criarTarefaMock devolveu null (vaultRoot mock ausente?)',
        screenshots,
      };
    }

    // 3. Tela Hoje: o UndoOverlayHost mora no root de app/index.tsx, nao
    //    em /todo.
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletMinimo };
      await w.__gauntlet.abrir('/');
    });
    await page.waitForTimeout(1500);

    const shotA = `${DIR_SHOTS}/A-tarefa-pendente-em-todo-hoje.png`;
    await page.screenshot({ path: shotA });
    screenshots.push(shotA);

    // 4. Clique no checkbox + leitura do toast no MESMO evaluate, para a
    //    leitura acontecer dentro dos 5s de vida do toast.
    const leitura: LeituraToast = await page.evaluate(async () => {
      const alvo = Array.from(
        document.querySelectorAll('[role="checkbox"]')
      ).find(
        (el) => el.getAttribute('aria-label') === 'marcar tarefa Tarefa do p3-6'
      ) as HTMLElement | undefined;
      if (!alvo) {
        const total = document.querySelectorAll('[role="checkbox"]').length;
        return { erro: `checkbox da tarefa ausente (${total} na tela)` };
      }
      alvo.click();

      // mostrarUndo so roda depois do await marcarFeito(...). Poll de
      // 100ms, teto 3000ms (DEFAULT_TIMEOUT_MS do toast e' 5000ms).
      const limite = Date.now() + 3000;
      let toast: Element | null = null;
      while (Date.now() < limite) {
        const achado = Array.from(
          document.querySelectorAll('[role="alert"]')
        ).find((el) =>
          (el.getAttribute('aria-label') ?? '').startsWith('toast undo')
        );
        if (achado) {
          toast = achado;
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!toast) return { erro: 'toast undo nao apareceu em 3000ms' };

      // O primeiro filho e' o <Text> da mensagem; o segundo e' o
      // Pressable "Desfazer". Ler o container inteiro traria os dois.
      const noMensagem = toast.firstElementChild;
      if (!noMensagem) {
        return {
          erro:
            'toast sem filho elemento: estrutura do UndoOverlayHost mudou; ' +
            `container: '${(toast.textContent ?? '').trim()}'`,
        };
      }
      return {
        textoMensagem: (noMensagem.textContent ?? '').trim(),
        textoContainer: (toast.textContent ?? '').trim(),
        ariaLabel: toast.getAttribute('aria-label') ?? '',
      };
    });

    const shotB = `${DIR_SHOTS}/B-toast-undo-mensagem-acentuada.png`;
    await page.screenshot({ path: shotB });
    screenshots.push(shotB);

    if (leitura.erro) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: leitura.erro,
        screenshots,
      };
    }

    // 5. O assert da sprint. Igualdade exata: 'Tarefa concluida' reprova.
    if (leitura.textoMensagem !== MENSAGEM_ESPERADA) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          `toast renderizou '${leitura.textoMensagem}' e nao '${MENSAGEM_ESPERADA}' ` +
          `(container: '${leitura.textoContainer}'; aria-label: '${leitura.ariaLabel}'). ` +
          'Regra de Linguagem: string de UI vai sempre com acentuacao completa.',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `checkbox de "${TITULO}" marcado; toast undo renderizou exatamente '${MENSAGEM_ESPERADA}'`,
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
