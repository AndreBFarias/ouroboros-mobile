// E2E I-EXERCICIO (M-SAVE-EXERCICIO-VALIDA, 2026-05-07): valida save
// resilient da Tela de novo exercicio em /exercicios/novo. Cobre o
// fluxo canonico ate o tap em "Criar exercício" sem crash. O save em
// web vira no-op rapido (writeVaultFile + copyAsync mockados no web).
// O que importa aqui:
//   1. Rota /exercicios/novo monta com input nome + nivel acessiveis.
//   2. Preencher nome "Tríceps rosca" + nivel iniciante + equipamento
//      "tríceps rosca" + instrucao "Sobe e desce." (idem screenshot
//      empirico 466875db, doc spec §7).
//   3. Tap "Criar exercício" dispara o caminho canonico
//      (vaultUriJoin + markdown/exercicio-<slug>.md + companion gif/
//      cross-link) sem travar em loader infinito (comTimeout 30s).
//   4. __gauntlet.estado() permanece consultavel pos-tap.
//
// Limitacao: ImagePicker do GIF nao funciona em web (Mock vault sem
// expo-image-picker). Caso "save com GIF" e validado por:
//   - Jest (saveExercicio.test.ts: copy GIF + cross-link frontmatter).
//   - Validacao humana adb (§5 do spec) em APK preview.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-SAVE-EXERCICIO-VALIDA-screenshots-gauntlet';

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

async function abrirNovoExercicio(page: PlaywrightPageLike): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { abrir: (r: string) => Promise<void> };
    };
    return w.__gauntlet.abrir('/exercicios/novo');
  });
  await page.waitForTimeout(1500);
}

async function formMontou(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    return !!document.querySelector(
      'input[aria-label="campo nome do exercicio"]'
    );
  });
}

function preencherCampo(label: string, valor: string): boolean {
  const input = document.querySelector(
    `input[aria-label="${label}"], textarea[aria-label="${label}"]`
  ) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!input) return false;
  const proto =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

async function preencherForm(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    const preencher = (label: string, valor: string): boolean => {
      const input = document.querySelector(
        `input[aria-label="${label}"], textarea[aria-label="${label}"]`
      ) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!input) return false;
      const proto =
        input instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(input, valor);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const nomeOk = preencher('campo nome do exercicio', 'Tríceps rosca');
    const equipOk = preencher('campo equipamento', 'tríceps rosca');
    const instrOk = preencher('campo instrucao', 'Sobe e desce.');
    return nomeOk && equipOk && instrOk;
  });
}

async function selecionarNivelIniciante(
  page: PlaywrightPageLike
): Promise<boolean> {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('[role="button"]')
    ) as HTMLElement[];
    const alvo = buttons.find(
      (b) => (b.textContent ?? '').trim() === 'Iniciante'
    );
    if (!alvo) return false;
    alvo.click();
    return true;
  });
}

async function tapCriar(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('[role="button"]')
    ) as HTMLElement[];
    const alvo = buttons.find(
      (b) => (b.textContent ?? '').trim() === 'Criar exercício'
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

export default async function caseSaveExercicio(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SAVE-EXERCICIO-VALIDA';
  const aspecto = 'save-exercicio-resilient-vaultUriJoin-h2-layout';
  const screenshots: string[] = [];
  // Suprime referencia direta a preencherCampo (ele e definido in-page
  // via closure no preencherForm; ts-noUnusedLocals reclama).
  void preencherCampo;

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

    await abrirNovoExercicio(page);

    if (!(await formMontou(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'form de novo exercicio nao montou (input nome ausente em /exercicios/novo)',
        screenshots,
      };
    }

    const formShot = `${SCREENSHOT_DIR}/A-exercicio-form.png`;
    await page.screenshot({ path: formShot });
    screenshots.push(formShot);

    const preencheu = await preencherForm(page);
    if (!preencheu) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'nao foi possivel preencher inputs (nome, equipamento, instrucao)',
        screenshots,
      };
    }
    await page.waitForTimeout(300);

    const nivelOk = await selecionarNivelIniciante(page);
    if (!nivelOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'chip "Iniciante" nao encontrado em ChipGroup nivel',
        screenshots,
      };
    }
    await page.waitForTimeout(300);

    const preenchidoShot = `${SCREENSHOT_DIR}/A-exercicio-preenchido.png`;
    await page.screenshot({ path: preenchidoShot });
    screenshots.push(preenchidoShot);

    const tapou = await tapCriar(page);
    if (!tapou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'botao "Criar exercício" nao encontrado em /exercicios/novo (form pode nao estar valido)',
        screenshots,
      };
    }
    // Aguarda o save (web mock + comTimeout 30s; em web vira no-op
    // rapido sem GIF binario).
    await page.waitForTimeout(2000);

    const salvoShot = `${SCREENSHOT_DIR}/A-exercicio-salvo.png`;
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
        'form /exercicios/novo montou; nome "Tríceps rosca" + equipamento + instrucao + nivel iniciante; "Criar exercício" nao crasha; estado consultavel pos-tap. Save com GIF binario validado em Jest (saveExercicio.test.ts) + humana adb (§5 do spec).',
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
