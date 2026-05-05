// E2E M-VAULT-MD-FIX-evento-fotos -- valida que a tela /eventos
// renderiza com bypass do gauntlet (vaultRoot mock) e que o bloco
// FotosBlock fica visivel no DOM. A copia real para
// media/fotos/<...> + companion .md so acontece em mobile real
// (saveEvento via expo-file-system/legacy); aqui o E2E confirma
// que a porta de entrada da feature (sheet, bloco fotos, botao
// registrar) esta presente sem regressao apos a refatoria.
//
// Nivel deste E2E: smoke web. Validacao runtime-real do path
// canonico (media/fotos/2026-04-29-eventos-0000-1.jpg + companion)
// vive em tests/lib/eventos/saveEvento.test.ts (Jest com mocks de
// expo-file-system/legacy).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseEventoFotos(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-VAULT-MD-FIX-evento-fotos';
  const aspecto = 'eventos-sheet-com-fotos';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: { reset: () => void; seed: () => void };
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
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa',
        screenshots,
      };
    }

    // Abre a tela de eventos (sheet 80%) via navegacao programatica.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/eventos');
    });
    await page.waitForTimeout(1500);

    // Confirma que o cabecalho da tela renderizou (header "Eventos").
    const headerPresente = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="eventos"]');
    });
    if (!headerPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'header "eventos" ausente -- tela nao montou apos abrir',
        screenshots,
      };
    }

    // Bloco fotos: o componente FotosBlock renderiza um botao para
    // abrir o picker. O bypass de bottom-sheet em web (A17) pode
    // travar a animacao mas o conteudo esta na arvore DOM.
    const blocoPresente = await page.evaluate(() => {
      // FotosBlock usa Button com label que contem "foto" / "Adicionar".
      // Verificacao defensiva: qualquer texto de "foto" no DOM.
      const txts = Array.from(document.querySelectorAll('div, span, button'));
      return txts.some((el) => /foto/i.test(el.textContent ?? ''));
    });
    if (!blocoPresente) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'bloco fotos ausente no DOM da tela /eventos',
        screenshots,
      };
    }

    const path =
      'docs/sprints/M-VAULT-MD-FIX-evento-fotos-screenshots-gauntlet/A-eventos-sheet.png';
    await page.screenshot({ path });
    screenshots.push(path);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'tela /eventos monta com header e bloco fotos visivel; copia para media/fotos/ + companion validada em saveEvento.test.ts',
      screenshots,
    };
  } catch (err) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `erro: ${(err as Error).message}`,
      screenshots,
    };
  }
}
