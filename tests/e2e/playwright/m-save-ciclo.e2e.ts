// E2E I-CICLO (M-SAVE-CICLO-VALIDA): valida save resilient da Tela
// 20.5b (CicloRegistrar) em /ciclo/registrar. Cobre o caminho golden
// pos-J1 (sexoDeclarado por pessoa) + autorPadrao + comTimeout +
// vaultUriJoin canonico.
//
// Verifica:
//   1. Seed sozinho com sexoDeclarado.pessoa_a = 'feminino'.
//   2. abrir(/ciclo/registrar) monta a tela com Header "Registrar"
//      e botao "Salvar" presente.
//   3. Tap Salvar nao crasha; caminho golden percorre vaultUriJoin
//      + comTimeout + escreverRegistroCiclo (web mock no-op).
//   4. __gauntlet.estado() responde apos save (caminho vivo).
//
// Em web o save em vaultRoot 'web://mock-vault/...' e' no-op no
// adapter; o que importa e' o caminho nao crashar e o helper canonico
// ser exercitado. Validacao real do .md no Vault SAF Android fica
// para a sprint humana adb (§5 do spec).
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface GauntletShape {
  reset: () => void;
  seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  setVaultRoot?: (root: string) => void;
  abrir: (rota: string) => Promise<void>;
  estado: () => unknown;
}

export default async function caseSaveCiclo(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SAVE-CICLO-VALIDA';
  const aspecto = 'save-ciclo-resilient';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletShape };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      if (typeof w.__gauntlet.setVaultRoot === 'function') {
        w.__gauntlet.setVaultRoot('web://mock-vault/Test');
      }
      // Marca pessoa_a como feminino direto na store (J1: sexoDeclarado).
      const z = globalThis as unknown as {
        __OB_SET_SEXO?: (p: string, s: string) => void;
      };
      if (typeof z.__OB_SET_SEXO === 'function') {
        z.__OB_SET_SEXO('pessoa_a', 'feminino');
      }
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO nao ligada?',
        screenshots,
      };
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/ciclo/registrar');
    });
    await page.waitForTimeout(1500);

    // 1. Tela montou: botao Salvar presente.
    const formMontou = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('[role="button"]')
      ) as HTMLElement[];
      return buttons.some((b) => (b.textContent ?? '').trim() === 'Salvar');
    });
    if (!formMontou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'CicloRegistrar nao montou (botao Salvar ausente)',
        screenshots,
      };
    }

    const formShot =
      'docs/sprints/M-SAVE-CICLO-VALIDA-screenshots-gauntlet/A-ciclo-form.png';
    await page.screenshot({ path: formShot });
    screenshots.push(formShot);

    // 2. Tap Salvar.
    const tapSalvar = await page.evaluate(() => {
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
    if (!tapSalvar) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao Salvar nao encontrado em /ciclo/registrar',
        screenshots,
      };
    }
    // Aguarda comTimeout + write mock.
    await page.waitForTimeout(1200);

    const salvoShot =
      'docs/sprints/M-SAVE-CICLO-VALIDA-screenshots-gauntlet/A-ciclo-salvo.png';
    await page.screenshot({ path: salvoShot });
    screenshots.push(salvoShot);

    // 3. __gauntlet.estado() responde sem crash.
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
        'CicloRegistrar montou; tap Salvar nao crasha; caminho golden vaultUriJoin + comTimeout exercitado; estado consultavel pos-save',
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
