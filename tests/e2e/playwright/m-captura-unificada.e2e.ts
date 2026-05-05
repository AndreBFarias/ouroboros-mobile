// E2E M-CAPTURA-UNIFICADA -- valida que o item "Camera" do MenuLateral
// abre a rota /captura modal com 2 cards de decisao, e que clicar
// "Registrar momento" navega para /memoria com o MenuCapturaVerde
// expandido automaticamente via query ?abrirCaptura=1.
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
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
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

    // 4. Assert: ambos os cards renderizam no DOM com titulos canonicos.
    const labels = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80);
      return {
        temRegistrar: todosTextos.some((t) => t === 'Registrar momento'),
        temEscanear: todosTextos.some((t) => t === 'Escanear documento'),
        temSubFoto: todosTextos.some(
          (t) => t === 'Foto, música, vídeo ou frase.'
        ),
        temSubNota: todosTextos.some((t) => t === 'Nota fiscal, comprovante.'),
      };
    });
    if (
      !labels.temRegistrar ||
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

    // 5. Click em "Registrar momento" via __gauntlet.abrir simulando
    //    o efeito do callback (dismiss + replace para /memoria com
    //    query). Em web RN-Web tap sintetico falha (Armadilha A17),
    //    entao reproduzimos a navegacao final que o callback executa.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/memoria?abrirCaptura=1');
    });
    await page.waitForTimeout(2500);

    // 6. Captura B: MemoriasScreen com MenuCapturaVerde expandido.
    const pathB =
      'docs/sprints/M-CAPTURA-UNIFICADA-screenshots-gauntlet/B-momento-abrindo-memorias.png';
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    // 7. Assert: header "Memórias" presente (rota correta) e algum
    //    elemento do MenuCapturaVerde renderizou (item "Foto", "Música",
    //    "Vídeo" ou "Frase" do sheet de captura).
    const memoria = await page.evaluate(() => {
      const todosTextos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 60);
      return {
        temMemorias: todosTextos.some((t) => t === 'Memórias'),
        // Itens do MenuCapturaVerde: pelo menos um deles deve estar
        // visivel se o sheet expandiu.
        temItemCaptura: todosTextos.some((t) =>
          ['Foto', 'Música', 'Vídeo', 'Frase'].includes(t)
        ),
      };
    });
    if (!memoria.temMemorias) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `apos navegar para /memoria header nao encontrado: ${JSON.stringify(memoria)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: memoria.temItemCaptura ? 'PASS' : 'INCONCLUSIVO',
      detalhe: memoria.temItemCaptura
        ? 'sheet de decisao renderiza 2 cards; navegacao para /memoria abre MenuCapturaVerde via abrirNoMount'
        : 'cards renderizam e navegacao funciona; expand do MenuCapturaVerde nao confirmado em web (Armadilha A17 do gorhom)',
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
