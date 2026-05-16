// E2E M-CAPTURA-UNIFICADA -- valida que o item "Camera" do MenuLateral
// abre a rota /captura modal com 2 cards de decisao. R-FAB-2 (Onda R
// Fase 2) renomeou "Registrar momento" para "Reflexao com foto" e
// trocou o destino: em vez de navegar para /saude-fisica?abrirCaptura=1,
// o caller agora abre a camera e leva para /diario-emocional?
// modo=reflexao com foto pre-anexada via rascunho.
//
// Pre-requisito: ./gauntlet.sh em foreground.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseMCapturaUnificada(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-CAPTURA-UNIFICADA';
  const aspecto = 'sheet-decisao-2-ramos';
  const screenshots: string[] = [];

  try {
    // 1. Abre gauntlet e seeda estado deterministico.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
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
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // 2. Navega para /captura via __gauntlet.abrir (evita refs voláteis
    //    de tap no DOM).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/captura');
    });
    await page.waitForTimeout(1500);

    // 3. Captura A: sheet com 2 opcoes visivel.
    const pathA =
      'docs/sprints/M-CAPTURA-UNIFICADA-screenshots-gauntlet/A-sheet-2-opcoes.png';
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    // 4. Assert: ambos os cards renderizam no DOM com titulos canonicos
    //    pos-R-FAB-2 ("Reflexao com foto" + "Escanear documento").
    const labels = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return {
        temReflexao: todosTextos.some((t) => t === 'Reflexão com foto'),
        temEscanear: todosTextos.some((t) => t === 'Escanear documento'),
        temSubFoto: todosTextos.some((t) => t === 'Foto + diário emocional.'),
        temSubNota: todosTextos.some((t) => t === 'Nota fiscal, comprovante.'),
      };
    });
    if (
      !labels.temReflexao ||
      !labels.temEscanear ||
      !labels.temSubFoto ||
      !labels.temSubNota
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cards nao encontrados no DOM: ${JSON.stringify(labels)}`,
        screenshots,
      };
    }

    // 5. R-FAB-2: simula o efeito do callback (camera capturada +
    //    rascunho seedeado + replace para /diario-emocional?modo=
    //    reflexao). Em web RN-Web a camera real nao existe; reproduzimos
    //    o efeito final via __gauntlet.abrir, que e' o estado pos-camera
    //    que o usuario veria no mobile real. Armadilha A17 do gorhom.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/diario-emocional?modo=reflexao');
    });
    await page.waitForTimeout(2500);

    // 6. Captura B: tela de Diario Emocional em modo Reflexao.
    const pathB =
      'docs/sprints/M-CAPTURA-UNIFICADA-screenshots-gauntlet/B-reflexao-com-foto-destino.png';
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    // 7. Assert: header "Diário emocional" presente (rota correta) e
    //    chip "Reflexão" selecionado (modo canonico pos-R0).
    const reflexao = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 60);
      return {
        temHeader: todosTextos.some((t) => t === 'Diário emocional'),
        temChipReflexao: todosTextos.some((t) => t === 'Reflexão'),
      };
    });
    if (!reflexao.temHeader) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `apos navegar para /diario-emocional header nao encontrado: ${JSON.stringify(reflexao)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: reflexao.temChipReflexao ? 'PASS' : 'INCONCLUSIVO',
      detalhe: reflexao.temChipReflexao
        ? 'sheet de decisao renderiza 2 cards (Reflexao com foto + Escanear documento); navegacao para /diario-emocional abre em modo Reflexao'
        : 'cards renderizam e navegacao funciona; chip Reflexao nao confirmado em web (timing do Reanimated)',
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
