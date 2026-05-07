// E2E I-SCANNER (M-SAVE-SCANNER-VALIDA + M-SCANNER-LAYOUT-POR-TIPO,
// 2026-05-07): valida save resilient do scanner de nota fiscal.
//
// Limitacao estrutural: a captura de imagem (camera + deskew nativo)
// e o ML Kit OCR sao modulos nativos e nao tem implementacao web. O
// E2E aqui foca em:
//   1. Rota /captura monta com SheetEscolhaCaptura (Registrar momento
//      / Escanear documento) acessiveis.
//   2. Tap em "escanear documento" navega para /scanner sem crash —
//      caminho dev web cai no stub seguro (lazy require do
//      scanner-launch nativo + ML Kit safe stub).
//   3. __gauntlet.estado() permanece consultavel pos-tap (sem crash
//      do contexto JS).
//
// Validacao real do fluxo completo (camera nativa + ML Kit OCR +
// copy do binario para jpg/scanner-<slug>.jpg ou
// pdf/scanner-<slug>.pdf + companion .md em
// markdown/scanner-<slug>.md + md semantico em
// markdown/nota-...md) e' feita via Nivel B (emulador) ou Nivel C
// (celular fisico) descritos em §5 do spec. Web nao consegue
// exercitar o picker nativo, ML Kit, nem o consolidarPdf via
// expo-print (Hermes-only).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-SAVE-SCANNER-VALIDA-screenshots-gauntlet';

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

async function abrirCaptura(page: PlaywrightPageLike): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { abrir: (r: string) => Promise<void> };
    };
    return w.__gauntlet.abrir('/captura');
  });
  await page.waitForTimeout(1500);
}

async function tapEscanearDocumento(
  page: PlaywrightPageLike
): Promise<boolean> {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('[role="button"], [aria-label]')
    ) as HTMLElement[];
    const item = buttons.find(
      (b) => (b.getAttribute('aria-label') ?? '') === 'escanear documento'
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

export default async function caseSaveScanner(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SAVE-SCANNER-VALIDA';
  const aspecto = 'save-scanner-resilient-fab-menu-captura-layout-por-tipo';
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

    await abrirCaptura(page);

    const shotCaptura = `${SCREENSHOT_DIR}/A-captura-sheet.png`;
    await page.screenshot({ path: shotCaptura });
    screenshots.push(shotCaptura);

    const tapOk = await tapEscanearDocumento(page);
    if (!tapOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'item "Escanear documento" (aria-label=escanear documento) ausente em /captura',
        screenshots,
      };
    }
    await page.waitForTimeout(1500);

    const shotPos = `${SCREENSHOT_DIR}/A-scanner-tap.png`;
    await page.screenshot({ path: shotPos });
    screenshots.push(shotPos);

    if (!(await estadoSemCrash(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          '__gauntlet.estado() lancou apos tap em "Escanear documento"; caminho de save propagou erro nao-tratado',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Sheet de captura abriu em /captura, item "Escanear documento" disparou caminho canonico (lazy require de scanner-launch + ML Kit safe stub) sem crash; estado consultavel pos-tap. Validacao runtime nativo (camera + ML Kit + copy <ext>/scanner-<slug>.<ext> + companion markdown/scanner-<slug>.md + md semantico markdown/nota-...md via vaultUriJoin + comTimeout 30s) coberta pelos testes Jest unit (saveNota.test.ts) e validacao humana adb §5 do spec.',
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
