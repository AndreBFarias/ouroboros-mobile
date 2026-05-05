// E2E M-DEBITO-CATEGORIA-ICONE -- icone Lucide do header e da
// categoria selecionada em SheetNovaTarefa reflete a cor accent
// derivada de CATEGORIA_ACCENTS (paleta Dracula).
//
// Antes do fix: ambos os icones (header "Nova tarefa" + IconeCategoriaAtiva
// ao lado do label "Categoria") usavam color={colors.orange}
// hardcoded. Selecionar "Saude" deixava icone laranja em vez de
// vermelho; selecionar "Trabalho" deixava laranja em vez de cyan.
//
// Depois do fix: helper inline em SheetNovaTarefa.tsx resolve
//   accent = CATEGORIA_ACCENTS[categoria] ?? 'orange'
//   corCategoria = accent === 'ghost' ? muted : colors[accent]
// e aplica em ambos os pontos (header text + Lucide icon).
//
// Asserts (3 categorias amostradas, cobrindo tres dimensoes do
// mapeamento):
//   1. trabalho -> cyan rgb(139, 233, 253)
//   2. saude    -> red  rgb(255, 85, 85)
//   3. outro    -> ghost (muted) rgb(201, 201, 204)
//
// Em web, Lucide React exporta SVG com atributo stroke. O
// accessibilityLabel "icone categoria <slug>" vira aria-label no
// elemento svg. Captura via getComputedStyle do svg encontrado.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface PageComConsole extends PlaywrightPageLike {
  on?: (
    evt: string,
    handler: (msg: { type: () => string; text: () => string }) => void
  ) => void;
}

// Cor stroke esperada por slug. Cobre tres dimensoes: paleta semantica
// (cyan), critico (red) e ghost-neutro (muted).
const ESPERADO: ReadonlyArray<{
  slug: string;
  label: string;
  rgbRegex: RegExp;
  nomeCor: string;
}> = [
  { slug: 'trabalho', label: 'Trabalho', rgbRegex: /139,\s*233,\s*253/, nomeCor: 'cyan' },
  { slug: 'saude',    label: 'Saúde',    rgbRegex: /255,\s*85,\s*85/,   nomeCor: 'red' },
  { slug: 'outro',    label: 'Outro',    rgbRegex: /201,\s*201,\s*204/, nomeCor: 'muted (ghost)' },
];

export default async function caseMDebitoCategoriaIcone(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-DEBITO-CATEGORIA-ICONE';
  const aspecto = 'icone-reflete-accent-categoria';
  const screenshots: string[] = [];

  const erros: string[] = [];
  const pageHook = page as PageComConsole;
  if (typeof pageHook.on === 'function') {
    pageHook.on('console', (msg) => {
      if (msg.type() === 'error') {
        erros.push(msg.text());
      }
    });
  }

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO inativa?',
        screenshots,
      };
    }

    // Abrir /todo, FAB de captura, item "adicionar tarefa" para chegar
    // ao SheetNovaTarefa.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/todo');
    });
    await page.waitForTimeout(1200);

    const fabAberto = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      if (!f) return false;
      f.click();
      return true;
    });
    if (!fabAberto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB de captura ausente em /todo',
        screenshots,
      };
    }
    await page.waitForTimeout(500);

    const sheetAberto = await page.evaluate(() => {
      const it = document.querySelector(
        '[aria-label="adicionar tarefa"]'
      ) as HTMLElement | null;
      if (!it) return false;
      it.click();
      return true;
    });
    if (!sheetAberto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'item "adicionar tarefa" ausente no menu de captura',
        screenshots,
      };
    }
    await page.waitForTimeout(900);

    // Para cada uma das 3 categorias amostradas: clicar no chip e ler
    // o stroke (color) do svg do IconeCategoriaAtiva. O aria-label
    // "icone categoria <slug>" vira atributo do <svg> via Lucide React.
    //
    // NOTA: PlaywrightPageLike.evaluate aceita so 1 argumento (sem
    // injecao de variaveis). Cada bloco evaluate hard-codeia label/slug
    // dentro do closure, espelhando ESPERADO acima.
    const resultados: Record<
      string,
      { stroke: string; encontrado: boolean }
    > = {};

    // ----- Trabalho (cyan) -----
    const okTrabalho = await page.evaluate(() => {
      const chip = document.querySelector(
        '[aria-label="chip Trabalho"]'
      ) as HTMLElement | null;
      if (!chip) return false;
      chip.click();
      return true;
    });
    if (!okTrabalho) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'chip "Trabalho" ausente no DOM',
        screenshots,
      };
    }
    await page.waitForTimeout(250);
    resultados.trabalho = await page.evaluate(() => {
      const svg = document.querySelector(
        '[aria-label="icone categoria trabalho"]'
      ) as SVGElement | null;
      if (!svg) return { stroke: 'NAO_ENCONTRADO', encontrado: false };
      const cs = getComputedStyle(svg);
      return { stroke: cs.stroke || cs.color, encontrado: true };
    });

    // ----- Saude (red) -----
    const okSaude = await page.evaluate(() => {
      const chip = document.querySelector(
        '[aria-label="chip Saúde"]'
      ) as HTMLElement | null;
      if (!chip) return false;
      chip.click();
      return true;
    });
    if (!okSaude) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'chip "Saúde" ausente no DOM',
        screenshots,
      };
    }
    await page.waitForTimeout(250);
    resultados.saude = await page.evaluate(() => {
      const svg = document.querySelector(
        '[aria-label="icone categoria saude"]'
      ) as SVGElement | null;
      if (!svg) return { stroke: 'NAO_ENCONTRADO', encontrado: false };
      const cs = getComputedStyle(svg);
      return { stroke: cs.stroke || cs.color, encontrado: true };
    });

    // ----- Outro (ghost -> muted) -----
    const okOutro = await page.evaluate(() => {
      const chip = document.querySelector(
        '[aria-label="chip Outro"]'
      ) as HTMLElement | null;
      if (!chip) return false;
      chip.click();
      return true;
    });
    if (!okOutro) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'chip "Outro" ausente no DOM',
        screenshots,
      };
    }
    await page.waitForTimeout(250);
    resultados.outro = await page.evaluate(() => {
      const svg = document.querySelector(
        '[aria-label="icone categoria outro"]'
      ) as SVGElement | null;
      if (!svg) return { stroke: 'NAO_ENCONTRADO', encontrado: false };
      const cs = getComputedStyle(svg);
      return { stroke: cs.stroke || cs.color, encontrado: true };
    });

    // Asserts.
    const ausentes = ESPERADO.filter((e) => !resultados[e.slug]?.encontrado);
    if (ausentes.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `icones ausentes apos selecao do chip: ${ausentes
          .map((a) => a.slug)
          .join(', ')}`,
        screenshots,
      };
    }

    const divergencias: string[] = [];
    for (const esp of ESPERADO) {
      const stroke = resultados[esp.slug]?.stroke ?? '';
      if (!esp.rgbRegex.test(stroke)) {
        divergencias.push(
          `${esp.slug} (${esp.nomeCor}): esperado match /${esp.rgbRegex.source}/, obtido stroke="${stroke}"`
        );
      }
    }
    if (divergencias.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cor do icone divergente do accent: ${divergencias.join(' | ')}`,
        screenshots,
      };
    }

    // Confirmar que as 3 cores capturadas sao distintas (regressao
    // antiga: todas laranja).
    const setStrokes = new Set(
      ESPERADO.map((e) => resultados[e.slug]?.stroke).filter(Boolean)
    );
    if (setStrokes.size < 3) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cores do icone nao sao distintas entre as 3 categorias amostradas (regressao do bug pre-fix). Strokes: ${JSON.stringify(resultados)}`,
        screenshots,
      };
    }

    const shotPath =
      'docs/sprints/M-DEBITO-CATEGORIA-ICONE-screenshots-gauntlet/A-icone-reflete-accent.png';
    await page.screenshot({ path: shotPath });
    screenshots.push(shotPath);

    if (erros.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `console com erros: ${erros.slice(0, 3).join(' | ')}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `icone Lucide reflete accent semantico em 3 categorias amostradas: ${ESPERADO.map(
        (e) => `${e.slug}=${e.nomeCor}`
      ).join(', ')}. Cores distintas confirmadas via getComputedStyle.stroke do svg.`,
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
