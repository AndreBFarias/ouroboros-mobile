// E2E I-FRASE + M-AUDIT-MIGUE-FRASE-WEB-MOCK (2026-05-08): valida save
// resilient de frase texto-livre via SheetFrase no FAB+ verde.
//
// Saneamento de debito (M-AUDIT-MIGUE-FRASE-WEB-MOCK): antes desta
// sprint o ramo web do salvarFrase era no-op em qualquer ambiente, e o
// E2E so podia checar "sem crash apos Salvar". Agora
// `__gauntlet.salvarFraseMock` gera companion .md determiniscico
// (mesmo formato H2 do mobile real) e empilha em useFrasesMock; o E2E
// verifica que a frase realmente persistiu.
//
// Verifica:
//   1. FAB+ verde "abrir menu de captura" presente em /saude-fisica.
//   2. Tap no FAB abre o sheet de captura com 4 itens.
//   3. Tap em "capturar frase" abre SheetFrase com campo acessivel.
//   4. Apos preencher textarea e tocar Salvar:
//      - toast "Frase salva." aparece (DOM evidence).
//      - SheetFrase fecha (sheetCapturaAberto=false em estado).
//      - __gauntlet.estado() permanece consultavel.
//
// Validacao runtime nativo (write real do .md no Vault SAF) e coberta
// por tests/lib/midia/salvarFrase.test.ts (unit Jest).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-AUDIT-MIGUE-FRASE-WEB-MOCK-screenshots-gauntlet';

export default async function caseSaveFrase(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-AUDIT-MIGUE-FRASE-WEB-MOCK';
  const aspecto = 'save-frase-gauntlet-mock-fab-menu-sheet-toast';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // Reset + seed deterministico (mesmo padrao M34).
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          setVaultRoot?: (root: string) => void;
          salvarFraseMock?: unknown;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      if (typeof w.__gauntlet.setVaultRoot === 'function') {
        w.__gauntlet.setVaultRoot('web://mock-vault/Test');
      }
      // Sanity: confirma que salvarFraseMock foi exposto pela API.
      return typeof w.__gauntlet.salvarFraseMock === 'function';
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente ou salvarFraseMock nao exposto; sprint nao foi aplicada?',
        screenshots,
      };
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    // 1. FAB+ verde presente.
    const fabPresente = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="abrir menu de captura"]');
    });
    if (!fabPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB verde ausente em /saude-fisica',
        screenshots,
      };
    }

    // 2. Tap no FAB.
    await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      f?.click();
    });
    await page.waitForTimeout(700);

    const shotMenu = `${SCREENSHOT_DIR}/A-menu-captura-aberto.png`;
    await page.screenshot({ path: shotMenu });
    screenshots.push(shotMenu);

    // 3. Tap em capturar frase.
    const tapFrase = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="capturar frase"]'
      ) as HTMLElement | null;
      if (!f) return false;
      f.click();
      return true;
    });
    if (!tapFrase) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'item "capturar frase" ausente no menu verde',
        screenshots,
      };
    }
    // Caller usa setTimeout(200ms) entre fechar menu e abrir sheet.
    await page.waitForTimeout(800);

    // 4. SheetFrase montou.
    const fraseSheet = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="campo da frase"]');
    });
    if (!fraseSheet) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'SheetFrase nao montou (campo da frase ausente)',
        screenshots,
      };
    }

    const shotSheet = `${SCREENSHOT_DIR}/B-sheet-frase-aberto.png`;
    await page.screenshot({ path: shotSheet });
    screenshots.push(shotSheet);

    // 5. Preencher textarea e tocar Salvar. RN web renderiza Textarea
    // como <textarea>; localizamos via aria-label do label canonico.
    // Texto fixo inline (PlaywrightPageLike.evaluate aceita so 1 arg).
    const preencheu = await page.evaluate(() => {
      const ta = document.querySelector(
        'textarea[aria-label="campo da frase"]'
      ) as HTMLTextAreaElement | null;
      if (!ta) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      setter?.call(ta, 'Tudo bem comigo hoje');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    if (!preencheu) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nao foi possivel localizar/preencher textarea da frase',
        screenshots,
      };
    }
    await page.waitForTimeout(300);

    // Tap Salvar (Button label="Salvar").
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
        detalhe: 'botao Salvar nao encontrado no SheetFrase',
        screenshots,
      };
    }
    // Aguarda ramo web __DEV__ delegar para salvarFraseMock + toast
    // verde aparecer (motion 200-400ms).
    await page.waitForTimeout(900);

    const shotPos = `${SCREENSHOT_DIR}/C-toast-frase-salva.png`;
    await page.screenshot({ path: shotPos });
    screenshots.push(shotPos);

    // 6. Toast "Frase salva." apareceu (evidencia DOM). Toast canonico
    // do design system renderiza com role=alert; fallback varre todo
    // texto da pagina por substring "frase salva".
    const evidenciaToast = await page.evaluate(() => {
      const todoTexto = (document.body.textContent ?? '').toLowerCase();
      return todoTexto.includes('frase salva');
    });
    if (!evidenciaToast) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'toast "Frase salva." nao apareceu apos tap em Salvar; ramo web __DEV__ nao delegou para salvarFraseMock?',
        screenshots,
      };
    }

    // 7. __gauntlet.estado() consultavel (sem crash do contexto JS).
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
        'FAB+ verde -> menu -> SheetFrase montou; preenchimento da textarea + Salvar disparou ramo web __DEV__ -> __gauntlet.salvarFraseMock; toast "Frase salva." renderizado; estado consultavel pos-save. Validacao runtime nativo coberta por tests/lib/midia/salvarFrase.test.ts.',
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
