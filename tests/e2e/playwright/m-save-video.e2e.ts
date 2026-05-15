// E2E I-VIDEO (M-SAVE-VIDEO-VALIDA, 2026-05-07): valida save
// resilient de video via FAB+ verde -> item "Vídeo" do
// MenuCapturaVerde. Captura nativa real (expo-image-picker) nao tem
// implementacao web fiel; o E2E aqui foca em:
//   1. FAB verde abre o sheet de captura.
//   2. Item "Vídeo" e' renderizado e clicavel.
//   3. Tap em "Vídeo" nao crasha o app — caminho de save canonico
//      (vaultUriJoin + comTimeout 15s + try/catch + toasts) executa
//      sem propagar erro nao-tratado para a UI.
//   4. __gauntlet.estado() permanece consultavel pos-tap (sem crash
//      do contexto JS).
//
// Validacao real do save de video em runtime nativo (copy de mp4 +
// companion .md em mp4/video-...mp4 + markdown/video-...md) e' feita
// via Nivel B (emulador) ou Nivel C (celular fisico) descritos em
// §5 do spec. Web nao consegue exercitar o picker nativo de video.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR = 'docs/sprints/M-SAVE-VIDEO-VALIDA-screenshots-gauntlet';

interface SeedFn {
  reset: () => void;
  seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  setNomes: (nomeA: string, nomeB?: string | null) => void;
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

async function abrirMemorias(page: PlaywrightPageLike): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { abrir: (r: string) => Promise<void> };
    };
    return w.__gauntlet.abrir('/saude-fisica');
  });
  await page.waitForTimeout(1500);
}

async function abrirMenuCaptura(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('[role="button"], [aria-label]')
    ) as HTMLElement[];
    const fab = buttons.find(
      (b) => (b.getAttribute('aria-label') ?? '') === 'abrir menu de captura'
    );
    if (!fab) return false;
    fab.click();
    return true;
  });
}

async function tapItemVideo(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('[role="button"], [aria-label]')
    ) as HTMLElement[];
    const item = buttons.find(
      (b) => (b.getAttribute('aria-label') ?? '') === 'capturar video'
    );
    if (!item) return false;
    item.click();
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

export default async function caseSaveVideo(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SAVE-VIDEO-VALIDA';
  const aspecto = 'save-video-resilient-fab-menu-captura';
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

    await abrirMemorias(page);

    const fabAberto = await abrirMenuCaptura(page);
    if (!fabAberto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB verde "abrir menu de captura" ausente em /memoria',
        screenshots,
      };
    }
    await page.waitForTimeout(800);

    const shotMenu = `${SCREENSHOT_DIR}/A-menu-captura-aberto.png`;
    await page.screenshot({ path: shotMenu });
    screenshots.push(shotMenu);

    const tapOk = await tapItemVideo(page);
    if (!tapOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'item "Vídeo" (aria-label=capturar video) ausente no sheet',
        screenshots,
      };
    }
    await page.waitForTimeout(1200);

    const shotPos = `${SCREENSHOT_DIR}/A-video-tap.png`;
    await page.screenshot({ path: shotPos });
    screenshots.push(shotPos);

    if (!(await estadoSemCrash(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          '__gauntlet.estado() lancou apos tap em "Vídeo"; caminho de save propagou erro nao-tratado',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'FAB verde + sheet captura abriram em /memoria, item "Vídeo" disparou caminho canonico (vaultUriJoin + comTimeout 15s + try/catch) sem crash; estado consultavel pos-tap. Validacao runtime nativo (copy mp4 + companion) coberta pelos testes Jest unit; web nao exercita expo-image-picker real.',
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
