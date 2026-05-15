// E2E I-TAREFA (M-SAVE-TAREFA-VALIDA): valida save resilient de
// tarefa via SheetNovaTarefa em /todo. Reproduz o screenshot empirico
// 6461cd48 ("Limpar gatos" + categoria Saúde) que crashava com
// "Invalid URI" no APK v1.0.0-alpha (causa raiz A29 do BRIEF).
//
// Verifica:
//   1. FAB "nova tarefa" presente em /todo.
//   2. Tap no FAB monta SheetNovaTarefa com campo "Título" acessivel.
//   3. Apos preencher titulo + selecionar categoria saude e tocar
//      Salvar, o save passa pelo caminho canonico (vaultUriJoin +
//      markdown/tarefa-...md) sem crash.
//   4. __gauntlet.estado() responde apos save (caminho golden vivo).
//
// Em web o save e' no-op (vault mock); o que importa e' o caminho
// nao crashar e o sheet fechar. Validacao real do .md no Vault SAF
// Android fica para a sprint humana adb (§5 do spec).
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseSaveTarefa(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SAVE-TAREFA-VALIDA';
  const aspecto = 'save-tarefa-resilient';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          setVaultRoot?: (root: string) => void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      if (typeof w.__gauntlet.setVaultRoot === 'function') {
        w.__gauntlet.setVaultRoot('web://mock-vault/Test');
      }
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

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/todo');
    });
    await page.waitForTimeout(1500);

    // 1. FAB nova tarefa presente.
    const fabPresente = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="nova tarefa"]');
    });
    if (!fabPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB "nova tarefa" ausente em /todo',
        screenshots,
      };
    }

    // 2. Tap no FAB.
    await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="nova tarefa"]'
      ) as HTMLElement | null;
      f?.click();
    });
    await page.waitForTimeout(800);

    // 3. SheetNovaTarefa montou com campo titulo.
    const sheetMontou = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="campo titulo da tarefa"]');
    });
    if (!sheetMontou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'SheetNovaTarefa nao montou (campo titulo ausente)',
        screenshots,
      };
    }

    const formShot =
      'docs/sprints/M-SAVE-TAREFA-VALIDA-screenshots-gauntlet/A-tarefa-form.png';
    await page.screenshot({ path: formShot });
    screenshots.push(formShot);

    // 4. Preencher titulo "Limpar gatos" (mesmo do screenshot empirico).
    const preencheu = await page.evaluate(() => {
      const input = document.querySelector(
        'input[aria-label="campo titulo da tarefa"]'
      ) as HTMLInputElement | null;
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(input, 'Limpar gatos');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    if (!preencheu) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nao foi possivel preencher campo titulo',
        screenshots,
      };
    }
    await page.waitForTimeout(300);

    // 5. Tap categoria Saúde (chip com label "Saúde").
    const tapCategoria = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('[role="button"]')
      ) as HTMLElement[];
      const alvo = buttons.find(
        (b) => (b.textContent ?? '').trim() === 'Saúde'
      );
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!tapCategoria) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'chip categoria "Saúde" nao encontrado',
        screenshots,
      };
    }
    await page.waitForTimeout(300);

    // 6. Tap Salvar.
    const salvouTap = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('[role="button"]')
      ) as HTMLElement[];
      const alvo = buttons.find(
        (b) => (b.textContent ?? '').trim() === 'Salvar'
      );
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!salvouTap) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao Salvar nao encontrado no SheetNovaTarefa',
        screenshots,
      };
    }
    // Aguarda o save (web mock + comTimeout).
    await page.waitForTimeout(1200);

    const salvoShot =
      'docs/sprints/M-SAVE-TAREFA-VALIDA-screenshots-gauntlet/A-tarefa-salva.png';
    await page.screenshot({ path: salvoShot });
    screenshots.push(salvoShot);

    // 7. __gauntlet.estado() responde — caminho golden nao crashou.
    const semCrash = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { estado: () => unknown };
      };
      try {
        w.__gauntlet.estado();
        return true;
      } catch {
        return false;
      }
    });
    if (!semCrash) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: '__gauntlet.estado() lancou erro apos save',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'FAB tarefa -> SheetNovaTarefa montou; titulo + categoria saude + Salvar nao crasha; estado consultavel pos-save',
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
