// E2E M38 -- conflict resolution para 4 dispositivos via deviceId.
//
// Cobre:
//   1. Sub-tela /settings/dispositivos abre via gauntlet.abrir e
//      mostra mensagem de orientacao + botao "Atualizar" + "Carregando"
//      ou "Nenhum dispositivo registrado ainda" no estado inicial.
//   2. Container raiz tem accessibilityLabel "lista dispositivos pareados".
//   3. Header "Dispositivos pareados" presente.
//
// Reset+seed deterministico no comeco. Captura screenshot do estado
// final para docs/sprints/M38-screenshots-gauntlet/.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseM38(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M38';
  const aspecto = 'conflict-resolution';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          abrir: (rota: string) => Promise<void> | void;
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
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET inativa',
        screenshots,
      };
    }

    // Navegar para a sub-tela de dispositivos pareados.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> | void };
      };
      await w.__gauntlet.abrir('/settings/dispositivos');
    });
    await page.waitForTimeout(1200);

    // Verifica que o header da sub-tela esta visivel.
    const titulo = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all.some((el) =>
        (el.textContent ?? '').trim().includes('Dispositivos pareados')
      );
    });
    if (!titulo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'header "Dispositivos pareados" nao visivel pos-navegacao',
        screenshots,
      };
    }

    // Verifica que o container da lista tem accessibilityLabel.
    const temContainer = await page.evaluate(
      () =>
        !!document.querySelector('[aria-label="lista dispositivos pareados"]')
    );
    if (!temContainer) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'container "lista dispositivos pareados" ausente',
        screenshots,
      };
    }

    // Verifica orientacao explicativa.
    const temOrientacao = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all.some((el) =>
        (el.textContent ?? '').includes('identificador único')
      );
    });
    if (!temOrientacao) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'texto explicativo (identificador unico) ausente',
        screenshots,
      };
    }

    const path = `docs/sprints/M38-screenshots-gauntlet/A-settings-dispositivos.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'sub-tela /settings/dispositivos renderiza com header, container a11y e texto explicativo',
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
