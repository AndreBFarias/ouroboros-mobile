// E2E M-SHEET-MODAL-SNAP -- valida que rotas modais (humor-rapido,
// eventos, diario-emocional) abrem o BottomSheet expandido (snap
// alvo) ao montar, em vez de ficar travado em y=windowH (Armadilha
// A17 reincidente em Gauntlet).
//
// Estrategia: navegar a cada uma das 3 rotas, aguardar mount + DOM
// patch (timeouts internos do wrapper em src/components/ui/BottomSheet
// rodam em 250/750/1500ms), e verificar que:
//   1. Existe um container hosting do sheet com transform matrix
//      cuja translateY (ty) esta proximo do esperado:
//        - humor-rapido (snap 70%): ty ~= winH * 0.30
//        - eventos (snap 80%):     ty ~= winH * 0.20
//        - diario-emocional (90%): ty ~= winH * 0.10
//   2. O primeiro <input type="range"> (slider de Humor / Intensidade /
//      Como foi?) tem getBoundingClientRect().top < winH / 2 -- isto e,
//      caiu na metade SUPERIOR do viewport (sheet expandido cobre
//      mais de 50% da tela).
//
// Ambas as condicoes precisam passar nas 3 rotas para o caso ser PASS.
// Falha em qualquer rota = FAIL com detalhe especificando qual ty
// esta fora do alvo.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface RotaAlvo {
  rota: string;
  snapPct: number;
  rotulo: string;
}

const ROTAS: RotaAlvo[] = [
  { rota: '/humor-rapido', snapPct: 70, rotulo: 'humor-rapido' },
  { rota: '/eventos', snapPct: 80, rotulo: 'eventos' },
  { rota: '/diario-emocional', snapPct: 90, rotulo: 'diario-emocional' },
];

// Tolerancia em px para a posicao do sheet (ty real vs esperado).
// 24px cobre arredondamento do gorhom + browser pixel ratio.
const TOLERANCIA_TY_PX = 24;

export default async function caseSheetModalSnap(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SHEET-MODAL-SNAP';
  const aspecto = 'sheets-abrem-expandidos';
  const screenshots: string[] = [];

  try {
    // 1. Boot do Gauntlet
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
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET inativa',
        screenshots,
      };
    }

    // 2. Para cada rota: navegar, aguardar DOM patch, medir.
    const falhas: string[] = [];
    for (const alvo of ROTAS) {
      await page.goto(`http://localhost:8081${alvo.rota}`);
      // 2.5s cobre 250ms (primeiro patch) + 750ms (segundo) + 1500ms
      // (terceiro). Sheet ja deve estar posicionado ate la.
      await page.waitForTimeout(2500);

      const medida = await page.evaluate(() => {
        const winH = window.innerHeight;
        // Captura o menor ty positivo entre containers com matrix
        // que cobrem area significativa. Evita catch de transforms
        // em backdrops, fades, ou marca de loader.
        let melhorTy: number | null = null;
        const todos = document.querySelectorAll('div');
        for (const el of Array.from(todos)) {
          const cs = getComputedStyle(el);
          const tr = cs.transform;
          if (!tr || tr === 'none' || !tr.startsWith('matrix(')) continue;
          // Regex via constructor (A24 -- defensivo contra NativeWind 4
          // confundir literais com seletores Tailwind arbitrarios).
          const re = new RegExp(
            '^matrix\\(\\s*1,\\s*0,\\s*0,\\s*1,\\s*0,\\s*(-?\\d+\\.?\\d*)\\)$'
          );
          const m = tr.match(re);
          if (!m) continue;
          const ty = parseFloat(m[1]);
          if (!Number.isFinite(ty) || ty <= 0 || ty >= winH) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 200 || r.height < 100) continue;
          if (melhorTy === null || ty < melhorTy) melhorTy = ty;
        }

        // Busca primeiro slider visivel.
        let primeiroSliderTop: number | null = null;
        const sliders = document.querySelectorAll('input[type="range"]');
        if (sliders.length > 0) {
          const r = (sliders[0] as Element).getBoundingClientRect();
          primeiroSliderTop = r.top;
        }

        return { winH, sheetTy: melhorTy, primeiroSliderTop };
      });

      const tyEsperado = medida.winH * (1 - alvo.snapPct / 100);
      const tyOk =
        medida.sheetTy !== null &&
        Math.abs(medida.sheetTy - tyEsperado) < TOLERANCIA_TY_PX;
      const sliderOk =
        medida.primeiroSliderTop !== null &&
        medida.primeiroSliderTop < medida.winH / 2;

      const path = `docs/sprints/M-SHEET-MODAL-SNAP-screenshots-gauntlet/A-${alvo.rotulo}.png`;
      await page.screenshot({ path });
      screenshots.push(path);

      if (!tyOk) {
        falhas.push(
          `${alvo.rotulo}: ty=${medida.sheetTy ?? 'null'} esperado=${tyEsperado.toFixed(0)} (snap ${alvo.snapPct}% de ${medida.winH}px)`
        );
      }
      if (!sliderOk) {
        falhas.push(
          `${alvo.rotulo}: primeiroSliderTop=${medida.primeiroSliderTop ?? 'null'} >= winH/2 (${medida.winH / 2})`
        );
      }
    }

    if (falhas.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Falhas: ${falhas.join('; ')}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: 'sheets em humor-rapido/eventos/diario-emocional abrem no snap esperado; primeiro slider em metade superior',
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
