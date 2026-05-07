// E2E I-ALARME (M-SAVE-ALARME-VALIDA, 2026-05-07): valida save
// resilient da Tela de novo alarme em /alarmes/novo. Cobre o fluxo
// canonico ate o tap em "Salvar" sem crash. Channel notification
// (expo-notifications scheduleNotificationAsync) NAO funciona em
// web - o agendamento vira no-op via Platform.OS guard em
// alarmesNotificacoes.ts. O que importa aqui:
//   1. Rota /alarmes/novo monta com FAB / form acessivel.
//   2. Preencher titulo + selecionar recorrencia semanal nao crasha.
//   3. Tap "Salvar" dispara o caminho canonico (vaultUriJoin +
//      markdown/alarme-<slug>.md + agendarAlarme no-op web) sem
//      travar em loader infinito (comTimeout 10s do helper canonico
//      @/lib/util/comTimeout).
//   4. __gauntlet.estado() permanece consultavel pos-tap.
//
// Validacao real do channel notif + .md no Vault SAF Android fica
// para a sprint humana adb (§5 do spec).
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-SAVE-ALARME-VALIDA-screenshots-gauntlet';

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

async function abrirNovoAlarme(page: PlaywrightPageLike): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { abrir: (r: string) => Promise<void> };
    };
    return w.__gauntlet.abrir('/alarmes/novo');
  });
  await page.waitForTimeout(1500);
}

async function formMontou(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    return !!document.querySelector(
      'input[aria-label="titulo do alarme"]'
    );
  });
}

async function preencherTituloAcordar(
  page: PlaywrightPageLike
): Promise<boolean> {
  // Closure inline-a o texto 'Acordar' (mesmo valor do screenshot
  // empirico do spec). PlaywrightPageLike.evaluate aceita apenas
  // funcoes zero-arg (template.e2e.ts:27).
  return page.evaluate(() => {
    const input = document.querySelector(
      'input[aria-label="titulo do alarme"]'
    ) as HTMLInputElement | null;
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    setter?.call(input, 'Acordar');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
}

async function tapSalvar(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
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

export default async function caseSaveAlarme(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SAVE-ALARME-VALIDA';
  const aspecto = 'save-alarme-resilient-recorrencias';
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

    await abrirNovoAlarme(page);

    if (!(await formMontou(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'form de novo alarme nao montou (input titulo ausente em /alarmes/novo)',
        screenshots,
      };
    }

    const formShot = `${SCREENSHOT_DIR}/A-alarme-form.png`;
    await page.screenshot({ path: formShot });
    screenshots.push(formShot);

    const preencheu = await preencherTituloAcordar(page);
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

    // Recorrencia default 'semanal' com dias_semana=[1,2,3,4,5] e
    // formValido=true ja garante que o botao Salvar esta habilitado.
    const semanalShot = `${SCREENSHOT_DIR}/A-alarme-semanal.png`;
    await page.screenshot({ path: semanalShot });
    screenshots.push(semanalShot);

    const salvouTap = await tapSalvar(page);
    if (!salvouTap) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao Salvar nao encontrado em /alarmes/novo',
        screenshots,
      };
    }
    // Aguarda o save (web mock + comTimeout default 10s; em web vira
    // no-op rapido).
    await page.waitForTimeout(1500);

    const salvoShot = `${SCREENSHOT_DIR}/A-alarme-salvo.png`;
    await page.screenshot({ path: salvoShot });
    screenshots.push(salvoShot);

    if (!(await estadoSemCrash(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          '__gauntlet.estado() lancou apos tap Salvar (caminho golden quebrou)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'form /alarmes/novo montou; titulo "Acordar" + recorrencia semanal default + Salvar nao crasha; estado consultavel pos-tap. Channel notif validado em humana adb (§5).',
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
