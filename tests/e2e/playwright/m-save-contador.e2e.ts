// E2E I-CONTADOR (M-SAVE-CONTADOR-VALIDA, 2026-05-07): valida save
// resilient da Tela de novo contador em /contadores/novo. Cobre o
// fluxo canonico ate o tap em "Criar" sem crash. O save em web vira
// no-op rapido (StorageAccessFramework.deleteAsync e writeVaultFile
// tem fallback web em mock). O que importa aqui:
//   1. Rota /contadores/novo monta com input titulo acessivel.
//   2. Preencher titulo "Sem cigarro" + manter data inicio default
//      (hoje, capturada pelo DateTimePicker mounted state).
//   3. Tap "Criar" dispara o caminho canonico (vaultUriJoin +
//      markdown/contador-<slug>.md + listarContadores no slug
//      resolver) sem travar em loader infinito (comTimeout 10s).
//   4. __gauntlet.estado() permanece consultavel pos-tap.
//
// Reset preserva historico (BRIEF §1.8): validado via tests Jest
// (contadores.test.ts:'preserva historico de resets anteriores').
// E2E foca no fluxo de criacao porque /contadores/[slug] precisa de
// arquivo seedado no Vault, fora do escopo deste E2E.
//
// Validacao real do .md no Vault SAF Android fica para a sprint
// humana adb (§5 do spec).
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-SAVE-CONTADOR-VALIDA-screenshots-gauntlet';

interface SeedFn {
  reset: () => void;
  seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  setVaultRoot?: (root: string) => void;
  abrir: (rota: string) => Promise<void>;
  estado: () => unknown;
}

async function aplicarSeed(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    const w = globalThis as unknown as { __gauntlet?: SeedFn };
    if (!w.__gauntlet) return false;
    w.__gauntlet.reset();
    w.__gauntlet.seed();
    if (typeof w.__gauntlet.setVaultRoot === 'function') {
      w.__gauntlet.setVaultRoot('web://mock-vault/Test');
    }
    return true;
  });
}

async function abrirNovoContador(page: PlaywrightPageLike): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { abrir: (r: string) => Promise<void> };
    };
    return w.__gauntlet.abrir('/contadores/novo');
  });
  await page.waitForTimeout(1500);
}

async function formMontou(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    return !!document.querySelector(
      'input[aria-label="titulo do contador"]'
    );
  });
}

async function preencherTituloSemCigarro(
  page: PlaywrightPageLike
): Promise<boolean> {
  // Closure inline-a o texto 'Sem cigarro' (exemplo do spec). O
  // DateTimePicker default carrega data atual (hoje) automaticamente
  // via useState(() => new Date()).
  return page.evaluate(() => {
    const input = document.querySelector(
      'input[aria-label="titulo do contador"]'
    ) as HTMLInputElement | null;
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    setter?.call(input, 'Sem cigarro');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
}

async function tapCriar(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('[role="button"]')
    ) as HTMLElement[];
    const alvo = buttons.find(
      (b) => (b.textContent ?? '').trim() === 'Criar'
    );
    if (!alvo) return false;
    alvo.click();
    return true;
  });
}

async function estadoSemCrash(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
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
}

export default async function caseSaveContador(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SAVE-CONTADOR-VALIDA';
  const aspecto = 'save-contador-resilient-historico-preservado';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const seedOk = await aplicarSeed(page);
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

    await abrirNovoContador(page);

    if (!(await formMontou(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'form de novo contador nao montou (input titulo ausente em /contadores/novo)',
        screenshots,
      };
    }

    const formShot = `${SCREENSHOT_DIR}/A-contador-form.png`;
    await page.screenshot({ path: formShot });
    screenshots.push(formShot);

    const preencheu = await preencherTituloSemCigarro(page);
    if (!preencheu) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nao foi possivel preencher input titulo',
        screenshots,
      };
    }
    await page.waitForTimeout(300);

    const preenchidoShot = `${SCREENSHOT_DIR}/A-contador-preenchido.png`;
    await page.screenshot({ path: preenchidoShot });
    screenshots.push(preenchidoShot);

    const tapou = await tapCriar(page);
    if (!tapou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao Criar nao encontrado em /contadores/novo',
        screenshots,
      };
    }
    // Aguarda o save (web mock + comTimeout default 10s; em web vira
    // no-op rapido).
    await page.waitForTimeout(1500);

    const salvoShot = `${SCREENSHOT_DIR}/A-contador-criado.png`;
    await page.screenshot({ path: salvoShot });
    screenshots.push(salvoShot);

    if (!(await estadoSemCrash(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          '__gauntlet.estado() lancou apos tap Criar (caminho golden quebrou)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'form /contadores/novo montou; titulo "Sem cigarro" + data inicio default + Criar nao crasha; estado consultavel pos-tap. Reset preserva historico validado em tests Jest (BRIEF §1.8). Persistencia .md no SAF validada em humana adb (§5).',
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
